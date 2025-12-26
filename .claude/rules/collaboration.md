# Live Publishing & Collaboration

## Live/Publish System

**ShareDialog** (`components/Flow/ShareDialog.tsx`): Dialog for publishing flows:
- Save & publish unsaved flows in multi-step flow
- Toggle "Owner-Funded Execution" for collaborators to use owner's API keys
- View/copy shareable link
- Unpublish flows

**LiveSettingsPopover** (`components/Flow/LiveSettingsPopover.tsx`): Popover for published flow settings:
- View collaborator count with live indicator (green pulse)
- Copy share URL
- Owner-Funded Execution toggle (owner only)
- Unpublish button (owner only)
- Shows non-owner info when collaborating

**Live Button** (in header): Globe icon that shows LiveSettingsPopover when published, ShareDialog when not.

**Auto-Unpublish**: Flow is automatically unpublished when owner leaves the page (uses `navigator.sendBeacon` for reliable cleanup).

**Publish API Route** (`app/api/flows/[id]/publish/route.ts`):
- POST: Publishes flow with unique `live_id` and `share_token`
- DELETE: Unpublishes flow (supports sendBeacon method override)

## Real-time Collaboration

**useCollaboration Hook** (`lib/hooks/useCollaboration.ts`): Core collaboration logic:
- Manages Supabase Realtime channel subscription for live sync
- Uses Supabase Presence API for collaborator tracking (join/leave handled automatically)
- Auth-aware identity: real names and avatars from user profile
- Session-scoped sender IDs for multi-tab deduplication
- Debounced auto-save (500ms) with `updateLiveFlow`
- Broadcasts node/edge changes using Supabase Broadcast API
- Smooth position interpolation using PerfectCursor library for each node
- Cursor position broadcasts via Broadcast (low latency)
- Avoids re-broadcasting received remote changes via `isApplyingRemoteRef` flag
- Handles position version tracking to ignore stale updates
- Drags-in-progress detection to ignore incoming position updates during drag
- Throttled broadcasts (50ms) to avoid network spam

**Collaborator Interface**:
- `userId`: Auth user ID or session fallback for anonymous users
- `name`: Real name from profile or "Anonymous"
- `avatar`: Profile picture URL
- `cursor`: Current cursor position
- `isOwner`: Crown indicator for flow owner
- `isSelf`: True for current user (filtered from cursor display)

**CollaboratorCursors** (`components/Flow/CollaboratorCursors.tsx`): Renders remote collaborator cursor positions:
- Colored cursor (hue from user ID hash) + name label per collaborator
- Avatar display next to cursor name
- Crown icon for flow owner
- Filters out self cursor (`isSelf: true`)
- Uses ViewportPortal for canvas integration
- Scale-compensated for zoom level

**usePerfectCursor Hook** (`lib/hooks/usePerfectCursor.ts`): Wrapper around `perfect-cursors` npm package for smooth cursor/position animations.

**Avatar Stack**: Live button shows collaborator avatars in header when flow is published.

**Live Page Route** (`app/[code]/[token]/page.tsx`): Collaborator entry point:
- Validates share token format (12 alphanumeric chars)
- Loads flow data via `loadLiveFlow`
- Initializes collaboration mode with `useCollaboration`

**Live API Routes**:
- `app/api/live/[token]/route.ts`: Load live flow data for collaborators
- `app/api/live/[token]/execute/route.ts`: Execute nodes in live flow (supports owner-funded execution)

## Owner-Funded Execution

When a flow is published with "Owner-Funded Execution" enabled, collaborators can run flows using the owner's API keys.

**Security Model**:
- Owner keys stored encrypted in `user_api_keys.keys_encrypted`
- Decryption only happens server-side with `ENCRYPTION_KEY` env var
- Server validates `use_owner_keys` flag in database (never trusts client claims)
- Share token treated as secret (redacted in debug panels, never logged)

**Rate Limiting**:
- Per-minute: 10 unique runs per minute (per `share_token`)
- Per-day: 100 runs per day (per flow)
- Same `runId` = same run (handles parallel node execution deduplication)

**Database RPCs** (in Supabase):
- `get_owner_keys_for_execution(p_share_token)`: Returns encrypted keys if `use_owner_keys=true`
- `check_and_log_run(p_share_token, p_run_id, ...)`: Atomic rate limit check + logging per run

**Environment Variables** (required for owner-funded execution):
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for accessing owner keys
- `ENCRYPTION_KEY`: 32-byte hex string for AES-256-GCM encryption

See `docs/OWNER_FUNDED_EXECUTION.md` for detailed architecture and troubleshooting.
