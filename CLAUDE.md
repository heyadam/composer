# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Project**: Composer — a visual AI workflow builder. Live at [composer.design](https://composer.design)

## Build Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm test         # Run Vitest unit tests (65 tests)
npm run start    # Start production server
```

## Environment Setup

**Node.js 24+** required. Use `nvm use` to activate the version in `.nvmrc`.

Requires API keys for the AI providers you want to use:
- `OPENAI_API_KEY` - For OpenAI models
- `GOOGLE_GENERATIVE_AI_API_KEY` - For Google Gemini models
- `ANTHROPIC_API_KEY` - For Anthropic Claude models

Supabase authentication:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` - Supabase anon/publishable key

See `docs/AI_MODELS.md` for the full list of supported models per provider.

## Database

This project uses **Supabase** for the database. Use the **Supabase MCP tools** (`mcp__supabase__*`) for all database operations including:
- Querying and modifying data (`mcp__supabase__execute_sql`)
- Creating and applying migrations (`mcp__supabase__apply_migration`)
- Listing tables and extensions (`mcp__supabase__list_tables`, `mcp__supabase__list_extensions`)
- Generating TypeScript types (`mcp__supabase__generate_typescript_types`)
- Managing Edge Functions (`mcp__supabase__deploy_edge_function`)
- Viewing logs and advisories (`mcp__supabase__get_logs`, `mcp__supabase__get_advisors`)

For documentation, use `mcp__supabase__search_docs` to query the Supabase docs via GraphQL.

### Supabase Skill

A comprehensive Supabase development skill is available at `.claude/skills/supabase/`. Invoke with `/supabase` to load the router, which provides access to detailed guides:

| Guide | File | Topics |
|-------|------|--------|
| SQL Style | `SQL_STYLE.md` | Naming conventions, formatting, CTEs |
| Functions | `FUNCTIONS.md` | PL/pgSQL functions, triggers, error handling |
| Migrations | `MIGRATIONS.md` | File naming, RLS requirements, examples |
| RLS Policies | `RLS.md` | Policy rules, auth helpers, performance |
| Edge Functions | `EDGE_FUNCTIONS.md` | Deno/TypeScript, npm imports, templates |
| Realtime | `REALTIME.md` | Broadcast, presence, triggers, migration |

The skill uses progressive disclosure: only the relevant guide is loaded based on the task.

### Node Creation Skill

A step-by-step guide for creating new nodes is available at `.claude/skills/node-creation/`. Invoke with `/node-creation` to load the router:

| Step | Guide | What you'll do |
|------|-------|----------------|
| 1 | `TYPES.md` | Define node data interface and port schema |
| 2 | `COMPONENT.md` | Create React component with NodeFrame |
| 3 | `EXECUTION.md` | Add execution logic to engine.ts |
| 4 | `AUTOPILOT.md` | Integrate with Autopilot system |
| 5 | `SIDEBAR.md` | Register in sidebar and set defaults |
| 6 | `VALIDATION.md` | Test and validate implementation |

Copy-paste templates for input, processing, output, and transform nodes are in `TEMPLATES.md`.

## Architecture Overview

This is an AI agent workflow builder using Next.js 16 App Router with React Flow for visual flow editing.

### Core Components

**Flow Editor** (`components/Flow/AgentFlow.tsx`): Main visual editor using @xyflow/react. Handles drag-and-drop node creation, edge connections, and flow execution controls.

**Interaction Model**:
- Normal mouse drag on canvas pans the view
- Hold spacebar + drag to create selection box (crosshair cursor)
- Selected nodes show yellow border with animated glow

**Node Types** (`components/Flow/nodes/`): Custom node components with editable labels:
- `InputNode` (type: `text-input`): Entry point, receives user input
- `ImageInputNode` (type: `image-input`): Entry point for image upload
- `PromptNode` (type: `text-generation`): LLM prompt execution with dual inputs (user prompt + system instructions), multi-provider support. Default: Google `gemini-3-flash-preview`
- `ImageNode` (type: `image-generation`): AI image generation (OpenAI with streaming partial images, Google Gemini). Default: Google `gemini-2.5-flash-image` with 1:1 aspect ratio
- `MagicNode` (type: `ai-logic`): Custom code transformation using Claude Haiku-generated JavaScript. Auto-generates code when transform input is connected at execution time. Includes validation with test cases and collapsible code/eval views.
- `ReactComponentNode` (type: `react-component`): AI-generated React components rendered in sandboxed iframe
- `CommentNode` (type: `comment`): Resizable comment boxes for annotating flows. Features color themes (gray, blue, green, yellow, purple, pink, orange), editable title/description, and AI-generated suggestions.
- `OutputNode` (type: `preview-output`): Exit point, displays final result and sends to preview

**InputWithHandle** (`components/Flow/nodes/InputWithHandle.tsx`): Reusable component combining input fields with connection handles:
- Shows disabled textarea with "Connected" placeholder when handle is wired
- Color-coded handles (cyan/purple/amber) with connection highlighting
- Used by PromptNode for user prompt and system instructions inputs

**Provider Configuration** (`lib/providers.ts`): Centralized config for AI providers and models. Supports OpenAI, Google, and Anthropic with provider-specific options:
- OpenAI: `verbosity`, `thinking`
- Google Gemini: `thinkingLevel` (Gemini 3), `thinkingBudget` (Gemini 2.5), `safetyPreset`

**IMPORTANT: Always consult `docs/AI_MODELS.md` for the authoritative list of model IDs.** Do not hardcode or assume model names - refer to docs/AI_MODELS.md for correct, up-to-date model identifiers when working with providers.

### Documentation Lookup

Use the **Context7 MCP tools** (`mcp__context7__resolve-library-id` and `mcp__context7__get-library-docs`) to fetch the latest documentation for any libraries or SDKs (Vercel AI SDK, OpenAI SDK, etc.).

**IMPORTANT: `docs/AI_MODELS.md` supersedes Context7 for model information.** If Context7 returns different model IDs or model names, always defer to `docs/AI_MODELS.md` as the authoritative source for this project.

**NodeFrame** (`components/Flow/nodes/NodeFrame.tsx`): Shared wrapper for all nodes providing consistent styling, status badges, and inline title editing.

**NodeStatusBadge** (`components/Flow/nodes/NodeStatusBadge.tsx`): Visual indicator for node execution status (running/success/error).

**Responses Sidebar** (`components/Flow/ResponsesSidebar/`): Resizable right sidebar that displays preview-output node results:
- `ResponsesSidebar.tsx`: Main container with spring-animated open/close using motion.dev
- `ResponsesHeader.tsx`: Header with action buttons
- `ResponsesContent.tsx`: Scrollable content area for responses
- `DebugContent.tsx`: Debug view showing detailed request/response info per node with collapsible sections and copy-to-clipboard
- `ReactPreview.tsx`: Sandboxed iframe preview for React component node outputs with code view toggle
- `types.ts`: PreviewEntry and DebugEntry interfaces
- Streams responses in real-time as they generate
- Width persisted to localStorage (min: 240px, max: 800px)
- Uses `useResizableSidebar` hook for drag-to-resize behavior

**Composer Logo** (`components/Flow/AvyLogo.tsx`): Animated 3D fluid sphere logo using react-three-fiber. Features:
- WebGL shader-based liquid deformation with simplex noise
- Rainbow color shifting with neon accents (pink, cyan, purple)
- White edge outline with Fresnel effect
- Pulsing glow animation

**Port Labels** (`components/Flow/nodes/PortLabel.tsx`): Unified port design component for all nodes:
- Color-coded input/output handles (cyan=string, purple=image, amber=response)
- Labels next to handles showing data type
- Visual highlighting during edge creation (color activates when dragging)
- Hover effects with scale animation

**Connection Context** (`components/Flow/ConnectionContext.tsx`): React context tracking edge connection state, enabling port highlighting feedback when creating connections.

**Colored Edges** (`components/Flow/edges/ColoredEdge.tsx`): Custom edge component with data-type based coloring:
- Cyan for string data
- Purple for image data
- Amber for response data
- Multi-layer glow effect and pulse animation on selection

**Execution Engine** (`lib/execution/engine.ts`): Recursive graph traversal that:
1. Finds text-input node as start
2. Executes parallel branches independently (responses appear as each completes)
3. Tracks execution state (running/success/error) per node

**Execution Types** (`lib/execution/types.ts`): Type definitions for the execution engine.

**Node Sidebar** (`components/Flow/NodeSidebar.tsx`): Collapsible node palette triggered by "Add Node" button. Nodes are drag-and-drop onto canvas.

**Action Bar** (`components/Flow/ActionBar.tsx`): Bottom-center floating toolbar with:
- Add Node toggle (opens node palette)
- Comment Around (wraps selected nodes in comment)
- Reset button
- Run/Cancel button

**Profile Dropdown** (`components/Flow/ProfileDropdown.tsx`): User authentication UI in header:
- Sign in with Google button when logged out
- Avatar with dropdown menu when signed in
- Sign out option

**Live Publishing** (`components/Flow/ShareDialog.tsx`, `components/Flow/LiveSettingsPopover.tsx`): Publish/unpublish flows and manage share links. The publish callback signature is `onPublish(flowId, liveId, shareToken, useOwnerKeys)`. Published state in `components/Flow/AgentFlow.tsx` is tied to `flowId` to avoid stale load responses overriding a fresh publish.

**Settings Dialog** (`components/Flow/SettingsDialogControlled.tsx`): Tabbed settings modal:
- API Keys tab: Configure provider API keys (OpenAI, Google, Anthropic), password unlock for pre-configured keys
- Appearance tab: Canvas background customization (pattern, gap, colors)

**Save Flow Dialog** (`components/Flow/SaveFlowDialog.tsx`): Modal for naming flows when saving.

**My Flows Dialog** (`components/Flow/MyFlowsDialog.tsx`): Modal for browsing and loading cloud-saved flows:
- Lists user's flows from Supabase storage
- Shows name and relative timestamp (Today, Yesterday, X days ago)
- Delete flows with confirmation
- Refresh list button

**Templates Modal** (`components/Flow/TemplatesModal/`): New flow creation dialog with AI prompt input:
- `index.tsx`: Main modal component with AI prompt input and template selection
- `templates.ts`: Template definitions loading from `lib/flows/templates/*.avy.json`
- `hooks/useTemplatesModal.ts`: Unified hook managing open/close state, auto-open logic, and "don't show again" persistence
- Features mode selector (Execute/Plan), model selector (Sonnet/Opus), and extended thinking toggle
- Three pre-built templates: Story & Image Gen, Basic Text Gen, Image to Image
- "Start blank" option to dismiss and begin with empty canvas
- Auto-opens when: NUX complete, not collaborating, flow is empty, no cloud flow loaded

**Node Toolbar** (`components/Flow/NodeToolbar.tsx`): Floating toolbar for quick node insertion with icons for each node type.

**Flow Context Menu** (`components/Flow/FlowContextMenu.tsx`): Right-click context menu on canvas with "Comment Around" option for selected nodes.

**Autopilot Sidebar** (`components/Flow/AutopilotSidebar/`): AI-powered chat interface for natural language flow editing:
- `AutopilotSidebar.tsx`: Main container with spring-animated open/close using motion.dev, absolute positioned to overlay canvas
- `AutopilotChat.tsx`: Chat UI with mode selector (Execute/Plan), model selector (Sonnet 4.5/Opus 4.5), and extended thinking toggle
- Uses `useResizableSidebar` hook for drag-to-resize (320-600px)
- `AutopilotHeader.tsx`: Header with clear history button
- `CollapsibleJson.tsx`: Collapsible JSON preview with syntax highlighting, auto-scroll during streaming, auto-collapse when done
- `ChangesPreview.tsx`: Visual diff of pending changes (added/removed nodes and edges)
- **Modes**: Execute (immediately applies changes) or Plan (shows step-by-step plan for user approval)
- **Models**: Claude Sonnet 4.5 (default) or Claude Opus 4.5
- **Extended Thinking**: Toggle for Claude's extended thinking capability
- Supports actions: `addNode`, `addEdge`, `removeEdge`, `removeNode`
- Auto-applies changes with full undo capability (restores removed nodes/edges)
- New nodes highlighted with purple glow until interacted with
- LLM-based validation using Claude Haiku 4.5 with auto-retry on failure
- Shimmer loading effects during AI operations

**Autopilot System** (`lib/autopilot/`):
- `types.ts`: Action types, FlowChanges, AutopilotMessage, EvaluationResult, EvaluationState, AutopilotMode, AutopilotModel, FlowPlan, PendingAutopilotMessage
- `parser.ts`: Extracts and validates JSON actions from Claude's responses. Valid node types: `text-input`, `image-input`, `text-generation`, `image-generation`, `ai-logic`, `preview-output`, `react-component`, `comment`
- `snapshot.ts`: Serializes current flow state for context
- `system-prompt.ts`: Builds prompt with node types, edge rules, valid model IDs, and insertion examples
- `evaluator.ts`: LLM-based validation of generated flow changes using Claude Haiku 4.5. Checks semantic match, structural validity, model ID correctness, and completeness. Returns issues and suggestions.

**Autopilot API Routes**:
- `app/api/autopilot/route.ts`: Streams responses from Claude with mode (execute/plan), model selection (sonnet-4-5/opus-4-5), and extended thinking support
- `app/api/autopilot/evaluate/route.ts`: Validates flow changes using Claude Haiku 4.5
- `app/api/autopilot/suggestions/route.ts`: Generates dynamic prompt suggestions based on current flow state

**Auth API Route** (`app/api/auth-keys/route.ts`): Password-based unlock endpoint for pre-configured API keys.

**Hooks** (`lib/hooks/`):
- `useAutopilotChat.ts`: Manages conversation state, streaming responses, post-stream evaluation, auto-retry on validation failure, auto-apply on success, and undo functionality.
- `useAutopilotIntegration.ts`: Handles applying/undoing autopilot changes to the flow, highlight management for newly added nodes. Extracted from AgentFlow for testability.
- `useSuggestions.ts`: Fetches dynamic LLM-generated prompt suggestions based on current flow state. Refreshable with default fallback suggestions.
- `useClipboard.ts`: Clipboard operations for copy/paste functionality.
- `useFlowExecution.ts`: Manages flow execution state, preview/debug entries, run/cancel/reset operations. Extracted from AgentFlow for testability.
- `useNodeParenting.ts`: Handles node parenting behavior within comments - auto-parenting when dragged into comments, unparenting when dragged out, comment deletion with cascading unparenting, and resize capture/release.
- `useFlowOperations.ts`: Manages flow file operations - new/blank flow creation, template selection, cloud save/load, file picker operations, and flow metadata state. Does not manage templates modal state (see `useTemplatesModal`).
- `useUndoRedo.ts`: Snapshot-based undo/redo for flow state with keyboard shortcuts (Cmd+Z/Ctrl+Z for undo, Shift+Cmd+Z/Ctrl+Y for redo). Maintains history stack up to 50 snapshots.
- `useCollaboration.ts`: Core real-time collaboration logic - Supabase Realtime sync, presence tracking, auto-save, smooth position interpolation.
- `usePerfectCursor.ts`: Wrapper around `perfect-cursors` npm package for smooth cursor/position animations.
- `useNuxState.ts`: Manages NUX step state (`"1"` | `"2"` | `"3"` | `"done"`) persisted to localStorage.
- `useDemoExecution.ts`: Auto-executes welcome-preview flow for NUX Step 1 demo.
- `useResizableSidebar.ts`: Reusable hook for sidebar resize behavior - SSR-safe localStorage, RAF-throttled updates, global mouse handling.

**Comment System**:
- `CommentEditContext.tsx`: React context for tracking user-edited comments to prevent AI overwrites
- `app/api/comment-suggest/route.ts`: AI-generates title and description for comment nodes based on nearby nodes
- `lib/hooks/useCommentSuggestions.ts`: Manages auto-generation of comment suggestions

**Example Flow** (`lib/example-flow.ts`): Default flow configuration loaded on startup.

### Live/Publish System

**ShareDialog** (`components/Flow/ShareDialog.tsx`): Dialog for publishing flows and managing sharing:
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

### Real-time Collaboration

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

**Live Page Route** (`app/[code]/[token]/page.tsx`): Collaborator entry point for shared flows:
- Validates share token format (12 alphanumeric chars)
- Loads flow data via `loadLiveFlow`
- Initializes collaboration mode with `useCollaboration`

**Live API Routes**:
- `app/api/live/[token]/route.ts`: Load live flow data for collaborators
- `app/api/live/[token]/execute/route.ts`: Execute nodes in live flow (supports owner-funded execution)

### Owner-Funded Execution

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

### Testing

Unit tests use **Vitest** with React Testing Library. Test files are in `lib/hooks/__tests__/`:
- `useFlowExecution.test.ts`: Tests for flow execution hook
- `useAutopilotIntegration.test.ts`: Tests for autopilot integration hook
- `useNodeParenting.test.ts`: Tests for node parenting behavior (comment auto-parenting, deletion cascading)
- `useFlowOperations.test.ts`: Tests for flow file operations (save, load, templates)
- `useUndoRedo.test.ts`: Tests for undo/redo functionality (snapshot management, keyboard shortcuts)

Run tests with `npm test` (65 tests) or `npm run test:watch` for watch mode.

**Mobile Blocker** (`components/Flow/MobileBlocker.tsx`): Full-screen blocker for mobile devices:
- Detects mobile via user agent (not screen width) using `useMobileDetection` hook
- Shows animated 3D orb with "composer" branding
- Renders via portal to `document.body` for proper iOS Safari coverage
- Uses `100svh` and `-webkit-fill-available` for full viewport coverage
- Prevents heavy flow editor from loading on mobile (checked in `app/page.tsx`)

**Mobile Detection Hook** (`lib/hooks/useMobileDetection.ts`): SSR-safe hook that returns `null` until checked, then `true`/`false` based on user agent regex matching mobile devices.

**Welcome Dialog (NUX)** (`components/Flow/WelcomeDialog/`): Three-step onboarding flow for new users:
- `index.tsx`: Main dialog controller with step logic
- `DialogShell.tsx`: Shared two-column layout (content left, hero right)
- `StepIndicator.tsx`: Progress dots showing current step
- `hooks/useNuxState.ts`: Manages NUX step state (`"1"` | `"2"` | `"3"` | `"done"`) persisted to localStorage
- `heroes/DemoHero.tsx`: Interactive React Flow demo that auto-executes on mount
- `heroes/ProvidersHero.tsx`: 3D scene showing provider icons flowing into Composer
- `heroes/DemoOutputsModal.tsx`: Modal for viewing demo execution outputs
- `heroes/HeroPanel.tsx`: Shared panel wrapper for hero content
- `three/`: 3D components (RoundedTile, CurvedLine, SvgIcon, GoogleIcon, ComposerIcon)
- Step 1: Welcome with sign-in options (Google OAuth or skip), interactive demo hero
- Step 2: API keys introduction explaining benefits (control, privacy, mix providers)
- Step 3: API keys form with inputs for Anthropic, OpenAI, Google Gemini, VIP code unlock
- State persisted to `avy-nux-step` in localStorage

### Authentication & User Management

**Auth System** (`lib/auth/`): Supabase-based authentication with Google OAuth:
- `context.tsx`: AuthProvider with `useAuth` hook
- `types.ts`: User, Session, Profile interfaces
- Provides: `user`, `profile`, `signInWithGoogle`, `signOut`, `isLoading`

**Supabase Client** (`lib/supabase/`):
- `client.ts`: Browser client with cookie-based session storage
- `server.ts`: Server-side client for API routes
- `service.ts`: Service role client for server-only operations (owner key retrieval). Uses `import "server-only"` to prevent client bundling.
- `proxy.ts`: Session refresh helper

**Proxy** (`proxy.ts`): Next.js Proxy for session refresh

### API Key Management

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

**Encryption Utilities** (`lib/encryption.ts`): Cryptographic helpers:
- `encrypt`/`decrypt`: AES-256-GCM encryption using `ENCRYPTION_KEY` env var
- `encryptKeys`/`decryptKeys`: JSON wrapper for API key objects
- `generateShareToken`: 12-character alphanumeric share tokens
- `generateLiveId`: 4-digit live session IDs

### Flow Storage

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

**API Route** (`app/api/execute/route.ts`): Server-side execution handler for text-generation and image-generation nodes:
- Text generation nodes: Uses Vercel AI SDK with `streamText` for real-time streaming responses. Supports OpenAI, Google, and Anthropic providers with provider-specific options.
- Google Gemini thinking: When thinking is enabled, streams NDJSON with separate `reasoning` and `text` chunks. Auto-enables `includeThoughts` when `thinkingLevel` or `thinkingBudget` is set.
- Image generation nodes: OpenAI (Responses API with streaming partial images) and Google Gemini. Configurable aspect ratio, quality, format, and partial image count.

### Type System

Flow types in `types/flow.ts` define node data interfaces with execution state tracking (`ExecutionStatus`, `executionOutput`, `executionError`).

**PromptNodeData fields**:
- `userPrompt`: User message content (used when prompt input not connected)
- `systemPrompt`: System instructions (used when system input not connected)
- `provider`, `model`: AI provider and model selection
- `verbosity`, `thinking`: OpenAI-specific options
- `googleThinkingConfig`: Google-specific thinking options (`thinkingLevel`, `thinkingBudget`, `includeThoughts`)
- `googleSafetyPreset`: Safety filtering level (`default`, `strict`, `relaxed`, `none`)
- `executionReasoning`: Captured thinking/reasoning output from models that support it

### UI Components

Uses shadcn/ui components in `components/ui/` with Tailwind CSS v4. Import alias `@/*` maps to project root.

**ThinkingSummary** (`components/ThinkingSummary.tsx`): Reusable collapsible component for displaying AI thinking/reasoning output:
- Props: `reasoning` (required), `defaultExpanded`, `maxHeight`, `className`
- Shows a "Thinking" header with Brain icon, expands to show full reasoning text
- Used in PromptNode footer when Google Gemini thinking is enabled
- Shimmer loading effect while reasoning is streaming

**Content Design**: When adding or modifying UI text (labels, placeholders, descriptions, tooltips, button text), use the `/content-design` skill (`.claude/skills/content-design/`). This ensures consistent tone and formatting across the application.

**AI Elements**: Use the AI Elements MCP (`mcp__ai-elements__get_ai_elements_components` and `mcp__ai-elements__get_ai_elements_component`) to discover and add UI components. AI Elements registry is configured at `@ai-elements` for components from `https://registry.ai-sdk.dev/`.

### Motion Animation System

Uses [motion.dev](https://motion.dev) (npm package `motion`) for spring-based animations. See `docs/motion.md` for detailed documentation.

**Motion Presets** (`lib/motion/presets.ts`): Centralized spring animation configurations:
- `springs.smooth`: Balanced default for sidebar open/close (stiffness: 300, damping: 30)
- `springs.snappy`: Quick micro-interactions (stiffness: 400, damping: 25)
- `springs.gentle`: Slow modals/overlays (stiffness: 200, damping: 25)
- `springs.bouncy`: Playful elements (stiffness: 350, damping: 20)
- `getTransition(skipAnimation)`: Returns instant transition during resize, spring otherwise
- `getAccessibleTransition()`: Respects `prefers-reduced-motion` setting

**useResizableSidebar Hook** (`lib/hooks/useResizableSidebar.ts`): Reusable hook for resizable sidebar behavior:
- SSR-safe localStorage persistence (no flash on load)
- RAF-throttled resize for smooth drag
- Global mouse event handling during drag
- Cursor and user-select management
- Returns: `{ width, isResizing, sidebarRef, startResizing }`

**Animation Patterns**:
- Use `initial={false}` to prevent animation on mount
- Use `style` with `willChange: "width"` only during resize
- Use `animate` with spring transition for open/close toggle
- `AnimatedLabel` component in AgentFlow.tsx for nav button labels with AnimatePresence

**Animated Components**:
- `AutopilotSidebar`: Left sidebar with spring open/close, absolute positioned to overlay canvas
- `ResponsesSidebar`: Right sidebar with spring open/close
- Header nav buttons: Labels animate in/out based on available width using `AnimatedLabel`
- Logo container: Animates position when sidebar opens
