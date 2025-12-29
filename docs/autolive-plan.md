# Auto-Live Flows (Figma-Style)

Transform Composer from "save then publish" to "flows are always live" - every authenticated user gets a shareable URL immediately.

## Implementation Progress

- [x] Phase 1.1: Database migration - Atomic RPC for token generation
- [x] Phase 1.2: Backfill migration for existing flows
- [x] Phase 1.3: Update flow creation API to use atomic RPC
- [x] Phase 1.4: Create GET /api/flows/current endpoint
- [x] Phase 2.1: New primary editor route /f/[code]/[token]
- [x] Phase 2.2: Update landing page with auth redirect
- [x] Phase 2.3: Legacy redirects from old URLs
- [x] Phase 3.1: Remove auto-unpublish beforeunload handler
- [x] Phase 3.2: Clean up publish state in UI components
- [x] Phase 4: UI updates (ShareDialog, LiveSettingsPopover, header)
- [x] Phase 5: Hook consolidation (no changes needed - publishFlow/unpublishFlow kept for future use)
- [x] Phase 6: Tests

## User Decisions
- **Anonymous users**: Full demo mode (build locally, prompt sign-in to share)
- **URL format**: `/f/{live_id}/{share_token}`
- **Auto-unpublish**: Remove entirely (flows stay live forever)
- **Anonymous collaborators**: Full edit access (anyone with link can edit)
- **Token length**: Keep 12 chars (62^12 = 3.2e21 combinations)

## Investigation Findings
- **RLS policies**: Don't gate on publish state - only check `auth.uid()`. Access control is at RPC level.
- **RPCs**: `get_owner_keys_for_execution`, `check_and_log_run`, `get_live_flow` all look up by `share_token` alone - no publish state checks needed.
- **Presence**: Works for anonymous users (session-scoped IDs), no auth required for Realtime channels.

---

## Phase 1: Database & API Foundation

### 1.1 Database Migration - Atomic Token Generation
Create RPC that atomically generates tokens to prevent race conditions:

```sql
-- RPC: create_flow_with_tokens(p_user_id, p_name)
-- Atomically creates flow + generates unique live_id + share_token
-- Returns: { id, live_id, share_token }
-- Uses UNIQUE constraints to handle collisions

-- Also add:
-- - last_accessed_at column (for "current flow" lookup, not updated_at)
-- - Index on (user_id, last_accessed_at DESC)
-- - NOT NULL constraints on live_id, share_token for new flows
```

**File**: New migration via `mcp__supabase__apply_migration`

### 1.2 Backfill Migration (Server-Side)
Generate tokens for ALL existing flows in a migration, not lazy client-side:

```sql
-- One-time migration to backfill existing flows
UPDATE flows
SET
  live_id = generate_unique_live_id(),
  share_token = generate_unique_share_token()
WHERE live_id IS NULL OR share_token IS NULL;
```

**File**: New migration via `mcp__supabase__apply_migration`

### 1.3 Update Flow Creation API
Modify `POST /api/flows/route.ts` to call the atomic RPC instead of generating tokens client-side.

**File**: `app/api/flows/route.ts`

### 1.4 New API: Get Current Flow
Create `GET /api/flows/current`:
- Query by `last_accessed_at DESC` (not `updated_at` - avoids autosave churn)
- Update `last_accessed_at` on open
- Create new flow via atomic RPC if none exists

**File**: `app/api/flows/current/route.ts` (new)

---

## Phase 2: Routing Refactor

### 2.1 New Primary Editor Route
Create `/f/[code]/[token]/page.tsx` - unified editor for owners and collaborators.

**Key logic**:
- Determine if current user is owner via `user_id` comparison
- If owner: full editing, auto-save enabled
- If collaborator (auth or anon): full edit access via share token

**Files**:
- `app/f/[code]/[token]/page.tsx` (new, based on current `app/[code]/[token]/page.tsx`)
- `app/f/new/page.tsx` (new - creates flow via atomic RPC and redirects)

### 2.2 Update Landing Page
Transform `app/page.tsx`:
- **Authenticated**: Redirect to `/f/{live_id}/{share_token}` of current/new flow
- **Unauthenticated**: Show full demo mode (local editing, sign-in to share)

**File**: `app/page.tsx`

### 2.3 Legacy Redirects (Preserve Query Params)
Redirect old `/[code]/[token]` to `/f/[code]/[token]`, preserving any query params for stable old share links.

**File**: `app/[code]/[token]/page.tsx` (modify to redirect with `redirect()` preserving search params)

---

## Phase 3: Remove Auto-Unpublish & Clean Up Publish State

### 3.1 Remove beforeunload Handler
Delete the `navigator.sendBeacon` unpublish logic.

**File**: `components/Flow/AgentFlow.tsx`

### 3.2 Remove/Redefine Publish State Throughout
Ensure consistent removal of publish-related state and UI:

| File | Change |
|------|--------|
| `components/Flow/ShareDialog.tsx` | Remove "publish" step, become "Share Settings" only |
| `components/Flow/LiveSettingsPopover.tsx` | Remove publish/unpublish toggle, keep owner-funded toggle |
| `lib/hooks/useFlowOperations.ts` | Remove `publishFlow`/`unpublishFlow` calls, simplify state |

### 3.3 Keep Unpublish API (Optional)
Keep `DELETE /api/flows/[id]/publish` for manual "regenerate URL" if user wants a new token.

---

## Phase 4: UI Updates

### 4.1 Simplify ShareDialog
Remove "publish" step - dialog becomes "Share Settings":
- Always shows shareable URL (derived from flow's live_id + share_token)
- Copy link button
- Owner-funded execution toggle
- Optional: "Regenerate URL" with confirmation (calls delete + new tokens)

**File**: `components/Flow/ShareDialog.tsx`

### 4.2 Update Header
Replace "Go Live" button with always-visible share URL/copy button.

**Files**:
- `components/Flow/FlowHeader/LeftControls.tsx`
- `components/Flow/LiveSettingsPopover.tsx`

### 4.3 Demo Mode for Anonymous Users
Anonymous users at `/` get local-only editing. Sign-in prompt when they try to:
- Share/copy URL
- Access "My Flows"
- Navigate away (optional: prompt to save)

Note: Anonymous users CAN join existing flows via share link with full edit access (Presence works without auth).

**File**: `components/Flow/AgentFlow.tsx` or new `DemoModePrompt.tsx`

---

## Phase 5: Hook Consolidation

### 5.1 Update useCollaboration
Unify owner/collaborator handling - URL is now source of truth for flow identity.

**File**: `lib/hooks/useCollaboration.ts`

### 5.2 Simplify useFlowOperations
- Remove `publishFlow`/`unpublishFlow` - no longer needed
- Remove explicit `saveFlowToCloud` public API
- Flow ID always derived from URL params
- Keep local storage for anonymous demo mode

**File**: `lib/hooks/useFlowOperations.ts`

---

## Phase 6: Tests

### 6.1 Add Tests
- `app/api/flows/current/route.ts` - test get/create behavior
- Token collision handling in atomic RPC
- Share-token access policy test

---

## Critical Files Summary

| File | Change |
|------|--------|
| `app/api/flows/route.ts` | Use atomic RPC for token generation |
| `app/api/flows/current/route.ts` | New - get/create current flow by `last_accessed_at` |
| `app/f/[code]/[token]/page.tsx` | New - unified editor route |
| `app/f/new/page.tsx` | New - create via atomic RPC and redirect |
| `app/page.tsx` | Auth check + redirect or demo mode |
| `app/[code]/[token]/page.tsx` | Redirect to /f/ prefix (preserve query params) |
| `components/Flow/AgentFlow.tsx` | Remove auto-unpublish beforeunload |
| `components/Flow/ShareDialog.tsx` | Remove publish step, settings only |
| `components/Flow/LiveSettingsPopover.tsx` | Remove publish state |
| `lib/hooks/useFlowOperations.ts` | Remove publish/unpublish, simplify |
| `lib/hooks/useCollaboration.ts` | Unify owner/collaborator |

---

## Implementation Order

1. **Database migration** - Atomic RPC for token generation + backfill existing flows
2. **API updates** - Modify create to use RPC, add `/api/flows/current`
3. **New routes** - `/f/[code]/[token]`, `/f/new`
4. **Landing page** - Auth redirect + demo mode
5. **Remove auto-unpublish** - Delete beforeunload handler
6. **UI cleanup** - ShareDialog, LiveSettingsPopover, header updates
7. **Hook consolidation** - useFlowOperations (remove publish state), useCollaboration
8. **Legacy redirects** - Old URLs → new URLs (preserve query params)
9. **Tests** - Current flow API, token collisions, share-token access

---

## Future Considerations (Not in Scope)
- Cleanup/archival for abandoned flows (use `last_accessed_at` threshold)
- Token rotation story (manual regenerate via UI)
