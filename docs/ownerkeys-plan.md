# Plan: Wire Up Owner-Funded Execution for Visual Editor

## Problem Summary

When `use_owner_keys` is enabled, collaborators should execute flows using the owner's API keys. However, the visual editor doesn't respect this flag:
1. `useFlowExecution.runFlow()` validates local API keys (lines 231-242) and blocks if missing
2. Execution always posts to `/api/execute` (engine.ts:131) which requires client-provided keys
3. The `use_owner_keys` flag exists in `LiveFlowData.flow` but is never passed to execution logic

## Key Design Decisions

- **Token sending**: Only send `shareToken` when `useOwnerKeys=true`
- **Key priority**: Owner keys always take precedence when `useOwnerKeys=true`
- **Per-run rate limiting**: Use client-generated `runId` (UUID), server dedupes
- **Service role**: Use Supabase service-role client to fetch owner secrets
- **Hard fail**: Return 403 if shareToken provided but owner keys unavailable
- **Token privacy**: Redact shareToken in all debug/logging paths
- **Runtime**: Node.js runtime required (not Edge) for decryption

## Implementation Plan

### Step 1: Update `/api/execute` to support owner-funded execution ✅ DONE

**File:** `app/api/execute/route.ts`

Add `export const runtime = "nodejs";` at top (required for service role + decryption).

```ts
import "server-only"; // Prevent client bundling
import { createServiceRoleClient } from "@/lib/supabase/service";
import { decryptKeys } from "@/lib/encryption";

// Owner-funded execution mode
if (body.shareToken) {
  const supabase = createServiceRoleClient();

  // Rate limit using runId for deduplication (handles parallel node execution)
  if (body.runId) {
    const { data: limitResult } = await supabase.rpc("check_and_log_run", {
      p_share_token: body.shareToken,
      p_run_id: body.runId,
      p_minute_limit: 10,
      p_daily_limit: 100,
    });

    if (!limitResult?.allowed) {
      return NextResponse.json({
        error: limitResult?.reason || "Rate limit exceeded"
      }, { status: limitResult?.reason?.includes("quota") ? 403 : 429 });
    }
  }

  // Fetch owner's keys - RPC already checks use_owner_keys flag
  // Returns null if: flow not found, use_owner_keys=false, or no keys stored
  const { data: encryptedKeys } = await supabase.rpc("get_owner_keys_for_execution", {
    p_share_token: body.shareToken,
  });

  if (!encryptedKeys) {
    return NextResponse.json({
      error: "Owner has not enabled shared keys for this flow",
    }, { status: 403 });
  }

  const decrypted = decryptKeys(encryptedKeys, process.env.ENCRYPTION_KEY!);
  apiKeys = { openai: decrypted.openai, google: decrypted.google, anthropic: decrypted.anthropic };
}
```

### Step 2: Create new RPC for atomic run tracking ✅ DONE

**Migration:** `create_check_and_log_run_rpc`

```sql
-- Add run_id column to execution log
ALTER TABLE flow_execution_log ADD COLUMN IF NOT EXISTS run_id TEXT;
CREATE INDEX IF NOT EXISTS idx_execution_log_run_id ON flow_execution_log(run_id);

-- Atomic check-and-log function
CREATE OR REPLACE FUNCTION check_and_log_run(
  p_share_token TEXT,
  p_run_id TEXT,
  p_minute_limit INTEGER DEFAULT 10,
  p_daily_limit INTEGER DEFAULT 100
) RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_flow RECORD;
  v_existing BOOLEAN;
  v_minute_count INTEGER;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Check if this run_id already logged (handles parallel requests)
  SELECT EXISTS(
    SELECT 1 FROM flow_execution_log
    WHERE share_token = p_share_token AND run_id = p_run_id
  ) INTO v_existing;

  IF v_existing THEN
    -- Already counted this run, allow without incrementing
    RETURN json_build_object('allowed', true, 'reason', 'already_logged');
  END IF;

  -- Count runs in last minute
  SELECT COUNT(DISTINCT run_id) INTO v_minute_count
  FROM flow_execution_log
  WHERE share_token = p_share_token
    AND executed_at > v_now - INTERVAL '1 minute';

  IF v_minute_count >= p_minute_limit THEN
    RETURN json_build_object('allowed', false, 'reason', 'Rate limit exceeded');
  END IF;

  -- Check daily quota (on flows table)
  SELECT id, daily_execution_count, daily_execution_reset INTO v_flow
  FROM flows WHERE share_token = p_share_token FOR UPDATE;

  IF v_flow IS NULL THEN
    RETURN json_build_object('allowed', false, 'reason', 'Flow not found');
  END IF;

  -- Reset counter if new day
  IF v_flow.daily_execution_reset < v_now - INTERVAL '1 day' THEN
    UPDATE flows SET daily_execution_count = 0, daily_execution_reset = v_now
    WHERE id = v_flow.id;
    v_flow.daily_execution_count := 0;
  END IF;

  IF v_flow.daily_execution_count >= p_daily_limit THEN
    RETURN json_build_object('allowed', false, 'reason', 'Daily quota exceeded');
  END IF;

  -- Log this run and increment daily counter
  INSERT INTO flow_execution_log (share_token, run_id, executed_at)
  VALUES (p_share_token, p_run_id, v_now);

  UPDATE flows SET daily_execution_count = daily_execution_count + 1
  WHERE id = v_flow.id;

  RETURN json_build_object('allowed', true, 'remaining', p_daily_limit - v_flow.daily_execution_count - 1);
END;
$$;
```

### Step 3: Create service-role Supabase client (server-only) ✅ DONE

**New file:** `lib/supabase/service.ts`

```ts
import "server-only"; // Fails build if imported in client code

import { createClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

### Step 4: Update `collaborationMode` prop ✅ DONE

**File:** `app/[code]/[token]/page.tsx`

```tsx
<AgentFlow
  collaborationMode={{
    shareToken: token,
    liveId: code,
    initialFlow: flowData,
    useOwnerKeys: flowData?.flow.use_owner_keys ?? false,
  }}
/>
```

### Step 5: Update `AgentFlow` ✅ DONE

**File:** `components/Flow/AgentFlow.tsx`

- Extract `useOwnerKeys` and `shareToken` from `collaborationMode`
- Pass to `useFlowExecution`

### Step 6: Update `useFlowExecution` hook ✅ DONE

**File:** `lib/hooks/useFlowExecution.ts`

```ts
import { v4 as uuidv4 } from "uuid";

export interface UseFlowExecutionProps {
  // ... existing
  shareToken?: string;
  useOwnerKeys?: boolean;
}
```

Modify `runFlow()`:
```ts
// Skip local key validation only when BOTH are present
if (!(useOwnerKeys && shareToken)) {
  // existing validation...
}

// Generate unique runId for rate limit deduplication
const runId = useOwnerKeys && shareToken ? uuidv4() : undefined;

await executeFlow(nodes, edges, updateNodeExecutionState, apiKeys, signal, {
  shareToken: useOwnerKeys ? shareToken : undefined,
  runId,
});
```

### Step 7: Update execution engine ✅ DONE

**File:** `lib/execution/engine.ts`

```ts
interface ExecuteOptions {
  shareToken?: string;
  runId?: string;  // Same runId for all nodes in this execution
}
```

In `executeNode()`:
```ts
const requestBody = {
  type: "text-generation",
  inputs: {...},
  provider,
  model,
  // Owner-funded: include shareToken + runId, omit apiKeys
  ...(nodeOptions?.shareToken
    ? { shareToken: nodeOptions.shareToken, runId: nodeOptions.runId }
    : { apiKeys }),
};

// Debug info: redact both shareToken and apiKeys
rawRequestBody: JSON.stringify({
  ...requestBody,
  apiKeys: requestBody.apiKeys ? "[REDACTED]" : undefined,
  shareToken: requestBody.shareToken ? "[REDACTED]" : undefined,
}, null, 2),
```

## Files to Modify

| File | Changes |
|------|---------|
| `app/api/execute/route.ts` | Add `runtime = "nodejs"`, `import "server-only"`, shareToken handling |
| `lib/supabase/service.ts` | **NEW** - Server-only service role client with `import "server-only"` |
| **Migration** | **NEW** - `check_and_log_run` RPC, add `run_id` column |
| `app/[code]/[token]/page.tsx` | Add `useOwnerKeys` to collaborationMode |
| `components/Flow/AgentFlow.tsx` | Pass shareToken/useOwnerKeys to useFlowExecution |
| `lib/hooks/useFlowExecution.ts` | Generate runId, conditional key validation |
| `lib/execution/engine.ts` | Accept runId in options, pass to all nodes, redact in debug |
| `docs/OWNER_FUNDED_EXECUTION.md` | **NEW** - Documentation for AI models and developers |

## Environment Variables

Add to `.env.local` and document:
- `SUPABASE_SERVICE_ROLE_KEY` - Required for fetching owner keys
- `ENCRYPTION_KEY` - Required for decrypting owner keys

### Step 8: Create documentation file ✅ DONE

**New file:** `docs/OWNER_FUNDED_EXECUTION.md`

```markdown
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
```

## Security Notes

- **RPC already enforces `use_owner_keys`**: `get_owner_keys_for_execution` returns null if flag is false
- **Server-only**: `import "server-only"` prevents accidental client bundling
- **Node runtime**: Required for service role client and decryption (`runtime = "nodejs"`)
- **Atomic rate limiting**: `check_and_log_run` RPC handles concurrent parallel nodes safely
- **Redaction**: All debug/logging paths must redact `shareToken`

## Testing Checklist

- [ ] Owner runs flow normally (unchanged behavior)
- [ ] Collaborator without keys runs flow when `use_owner_keys=true` - works
- [ ] Collaborator without keys runs flow when `use_owner_keys=false` - error
- [ ] Collaborator with own keys runs flow when `use_owner_keys=false` - works
- [ ] Parallel node execution counts as 1 run (verify with `SELECT * FROM flow_execution_log`)
- [ ] 10+ runs/min triggers rate limit
- [ ] shareToken + `use_owner_keys=false` returns 403
- [ ] Debug panel shows `[REDACTED]` for shareToken
- [ ] Build fails if `lib/supabase/service.ts` imported in client code
- [ ] `/api/execute` runs in Node runtime (check next.config or route file)
