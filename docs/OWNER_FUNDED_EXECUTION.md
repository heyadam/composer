# Owner-Funded Execution

This document describes how the owner-funded execution feature works, where flow owners can share their API keys with collaborators.

## Overview

When a flow is published with "Owner-Funded Execution" enabled (`use_owner_keys=true`), collaborators can execute the flow using the owner's API keys instead of providing their own.

## Architecture

### Data Flow

1. **Owner publishes flow** with `use_owner_keys=true` in the `flows` table
2. **Collaborator joins** via `/{liveId}/{shareToken}` URL
3. **Flow loads** with `use_owner_keys` flag from `LiveFlowData`
4. **Collaborator runs flow**:
   - Client generates `runId` (UUID) for this execution
   - Client sends `shareToken` + `runId` to `/api/execute` (no `apiKeys`)
   - Server resolves owner's keys via `get_owner_keys_for_execution` RPC
   - Server uses owner's decrypted keys for AI provider calls

### Key Components

| Component | File | Role |
|-----------|------|------|
| Live flow page | `app/[code]/[token]/page.tsx` | Loads flow with `use_owner_keys` flag |
| AgentFlow | `components/Flow/AgentFlow.tsx` | Passes `shareToken` + `useOwnerKeys` to execution |
| useFlowExecution | `lib/hooks/useFlowExecution.ts` | Skips local key validation, generates `runId` |
| Execution engine | `lib/execution/engine.ts` | Sends `shareToken` + `runId` instead of `apiKeys` |
| Execute API | `app/api/execute/route.ts` | Resolves owner keys, enforces rate limits |
| Service client | `lib/supabase/service.ts` | Server-only Supabase client for owner secrets |

### Database RPCs

| RPC | Purpose |
|-----|---------|
| `get_owner_keys_for_execution(p_share_token)` | Returns encrypted keys if `use_owner_keys=true` |
| `check_and_log_run(p_share_token, p_run_id, ...)` | Atomic rate limit check + logging per run |

## Rate Limiting

- **Per-minute**: 10 unique runs per minute (per `share_token`)
- **Per-day**: 100 runs per day (per flow)
- **Deduplication**: Same `runId` = same run (handles parallel node execution)

## Security Model

### Server-Side Enforcement

The server NEVER trusts the client's claim about owner-funded execution:

1. `get_owner_keys_for_execution` RPC checks `use_owner_keys` flag in database
2. Returns `null` if flag is `false` → server returns 403
3. Client cannot bypass by sending `shareToken` when owner hasn't enabled it

### Key Protection

- Owner keys stored encrypted in `user_api_keys.keys_encrypted`
- Decryption only happens server-side with `ENCRYPTION_KEY`
- `lib/supabase/service.ts` uses `import "server-only"` to prevent client bundling
- `/api/execute` requires Node runtime (`export const runtime = "nodejs"`)

### Token Privacy

- `shareToken` is a secret (grants execution access)
- Always redacted in debug panels (`[REDACTED]`)
- Never logged in server logs

## Environment Variables

Required for owner-funded execution:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=your-encryption-key
```

## Testing

### Manual Test Cases

1. **Owner executes flow** → Normal behavior, uses own keys
2. **Collaborator executes with `use_owner_keys=true`** → Uses owner's keys
3. **Collaborator executes with `use_owner_keys=false`** → Error (no keys)
4. **Parallel nodes in flow** → Counts as 1 run (same `runId`)
5. **11th run in same minute** → 429 Rate Limit Exceeded
6. **101st run in same day** → 403 Daily Quota Exceeded

### Verification Queries

```sql
-- Check execution log
SELECT share_token, run_id, executed_at
FROM flow_execution_log
ORDER BY executed_at DESC LIMIT 20;

-- Check daily counter
SELECT name, daily_execution_count, daily_execution_reset
FROM flows
WHERE share_token IS NOT NULL;
```

## Troubleshooting

### "Owner has not enabled shared keys for this flow"

- Check `flows.use_owner_keys` is `true` for this flow
- Check owner has stored keys in `user_api_keys`

### Rate limit hit unexpectedly

- Check `flow_execution_log` for `run_id` distribution
- Ensure client is generating unique `runId` per execution

### Keys not decrypting

- Verify `ENCRYPTION_KEY` matches what was used to encrypt
- Check `/api/execute` is running in Node runtime (not Edge)
