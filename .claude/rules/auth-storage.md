# Authentication & Storage

## Authentication System

**Auth System** (`lib/auth/`): Supabase-based authentication with Google OAuth:
- `context.tsx`: AuthProvider with `useAuth` hook
- `types.ts`: User, Session, Profile interfaces
- Provides: `user`, `profile`, `signInWithGoogle`, `signOut`, `isLoading`

**Supabase Client** (`lib/supabase/`):
- `client.ts`: Browser client with cookie-based session storage
- `server.ts`: Server-side client for API routes
- `service.ts`: Service role client for server-only operations (owner key retrieval). Uses `import "server-only"` to prevent client bundling.
- `proxy.ts`: Session refresh helper

**Profile Dropdown** (`components/Flow/ProfileDropdown.tsx`): User authentication UI in header:
- Sign in with Google button when logged out
- Avatar with dropdown menu when signed in
- Sign out option

## API Key Management

**API Keys System** (`lib/api-keys/`): Provider API key storage and management:
- `context.tsx`: ApiKeysProvider with `useApiKeys` hook
- `storage.ts`: localStorage persistence with encryption support
- `types.ts`: ProviderId, ApiKeys, ApiKeyStatus interfaces
- Supports password-based unlock for pre-configured keys
- Development mode detection (uses env vars when available)

**Shared Provider Helpers** (`lib/api/`):
- `providers.ts`: Shared helper functions for creating AI provider clients (e.g., `getAnthropicClient(apiKeys)`) - used by autopilot and comment-suggest routes

**Server-Side Key Storage** (`app/api/user/keys/route.ts`): Secure API key storage for owner-funded execution:
- GET: Returns which providers have stored keys (not the keys themselves)
- PUT: Encrypts and stores API keys server-side
- DELETE: Removes stored keys
- Keys encrypted with AES-256-GCM before storage in `user_api_keys` table

**Auth API Route** (`app/api/auth-keys/route.ts`): Password-based unlock endpoint for pre-configured API keys.

**Encryption Utilities** (`lib/encryption.ts`): Cryptographic helpers:
- `encrypt`/`decrypt`: AES-256-GCM encryption using `ENCRYPTION_KEY` env var
- `encryptKeys`/`decryptKeys`: JSON wrapper for API key objects
- `generateShareToken`: 12-character alphanumeric share tokens
- `generateLiveId`: 4-digit live session IDs

## Flow Storage

**Local Flow Storage** (`lib/flow-storage/`): Local flow persistence and file operations:
- `storage.ts`: Save/load flows to localStorage, download as JSON, file picker
- `validation.ts`: Flow schema validation with error reporting
- `types.ts`: SavedFlow, FlowMetadata, LoadFlowResult interfaces
- Flows saved with `.avy.json` extension

**Cloud Flow Storage** (`lib/flows/`): Supabase-backed flow persistence for authenticated users:
- `api.ts`: Client-side API calls for CRUD operations (listFlows, createFlow, updateFlow, loadFlow, deleteFlow, publishFlow, unpublishFlow, loadLiveFlow, updateLiveFlow, updatePublishSettings, getUserKeysStatus)
- `types.ts`: FlowRecord (with `live_id`, `share_token`, `use_owner_keys`), FlowListItem, LiveFlowData, LiveFlowChanges, response interfaces
- Metadata stored in `flows` table, flow JSON stored in Supabase Storage
- API routes: `app/api/flows/route.ts` (list, create), `app/api/flows/[id]/route.ts` (get, update, delete), `app/api/flows/[id]/publish/route.ts` (publish, unpublish)

**useFlowOperations** (`lib/hooks/useFlowOperations.ts`): Manages flow file operations - new/blank flow creation, template selection, cloud save/load, file picker operations, and flow metadata state.

## Flow Dialogs

**Settings Dialog** (`components/Flow/SettingsDialogControlled.tsx`): Tabbed settings modal:
- API Keys tab: Configure provider API keys (OpenAI, Google, Anthropic), password unlock for pre-configured keys
- Appearance tab: Canvas background customization (pattern, gap, colors)

**Save Flow Dialog** (`components/Flow/SaveFlowDialog.tsx`): Modal for naming flows when saving.

**My Flows Dialog** (`components/Flow/MyFlowsDialog.tsx`): Modal for browsing and loading cloud-saved flows:
- Lists user's flows from Supabase storage
- Shows name and relative timestamp (Today, Yesterday, X days ago)
- Delete flows with confirmation
- Refresh list button
