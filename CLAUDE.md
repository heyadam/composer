# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Project**: Composer — a visual AI workflow builder. Live at [composer.design](https://composer.design)

## Build Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run start    # Start production server
```

## Environment Setup

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
- `ResponsesSidebar.tsx`: Main container with run/reset controls and drag-to-resize
- `ResponsesHeader.tsx`: Header with action buttons
- `ResponsesContent.tsx`: Scrollable content area for responses
- Streams responses in real-time as they generate
- Width persisted to localStorage (min: 240px, max: 800px)

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

**Settings Dialog** (`components/Flow/SettingsDialogControlled.tsx`): Tabbed settings modal:
- API Keys tab: Configure provider API keys (OpenAI, Google, Anthropic), password unlock for pre-configured keys
- Appearance tab: Canvas background customization (pattern, gap, colors)

**Save Flow Dialog** (`components/Flow/SaveFlowDialog.tsx`): Modal for naming flows when saving.

**My Flows Dialog** (`components/Flow/MyFlowsDialog.tsx`): Modal for browsing and loading cloud-saved flows:
- Lists user's flows from Supabase storage
- Shows name and relative timestamp (Today, Yesterday, X days ago)
- Delete flows with confirmation
- Refresh list button

**Node Toolbar** (`components/Flow/NodeToolbar.tsx`): Floating toolbar for quick node insertion with icons for each node type.

**Flow Context Menu** (`components/Flow/FlowContextMenu.tsx`): Right-click context menu on canvas with "Comment Around" option for selected nodes.

**Autopilot Sidebar** (`components/Flow/AutopilotSidebar/`): AI-powered chat interface for natural language flow editing:
- `AutopilotSidebar.tsx`: Main container with resizable width (320-600px)
- `AutopilotChat.tsx`: Chat UI with effort level selector (Low/Medium/High) and dynamic LLM-generated suggestions
- `AutopilotHeader.tsx`: Header with clear history button
- `CollapsibleJson.tsx`: Collapsible JSON preview with syntax highlighting, auto-scroll during streaming, auto-collapse when done
- `ChangesPreview.tsx`: Visual diff of pending changes (added/removed nodes and edges)
- Uses Claude Opus 4.5 with configurable effort levels via the `effort` beta parameter
- Supports actions: `addNode`, `addEdge`, `removeEdge`, `removeNode`
- Auto-applies changes with full undo capability (restores removed nodes/edges)
- New nodes highlighted with purple glow until interacted with
- LLM-based validation using Claude Haiku 4.5 with auto-retry on failure
- Shimmer loading effects during AI operations

**Autopilot System** (`lib/autopilot/`):
- `types.ts`: Action types, FlowChanges, AutopilotMessage, EvaluationResult, EvaluationState
- `parser.ts`: Extracts and validates JSON actions from Claude's responses. Valid node types: `text-input`, `image-input`, `text-generation`, `image-generation`, `ai-logic`, `preview-output`, `react-component`, `comment`
- `snapshot.ts`: Serializes current flow state for context
- `system-prompt.ts`: Builds prompt with node types, edge rules, valid model IDs, and insertion examples
- `evaluator.ts`: LLM-based validation of generated flow changes using Claude Haiku 4.5. Checks semantic match, structural validity, model ID correctness, and completeness. Returns issues and suggestions.

**Autopilot API Routes**:
- `app/api/autopilot/route.ts`: Streams responses from Claude Opus 4.5 with effort parameter
- `app/api/autopilot/evaluate/route.ts`: Validates flow changes using Claude Haiku 4.5
- `app/api/autopilot/suggestions/route.ts`: Generates dynamic prompt suggestions based on current flow state

**Auth API Route** (`app/api/auth-keys/route.ts`): Password-based unlock endpoint for pre-configured API keys.

**Autopilot Hooks** (`lib/hooks/`):
- `useAutopilotChat.ts`: Manages conversation state, streaming responses, post-stream evaluation, auto-retry on validation failure, auto-apply on success, and undo functionality.
- `useSuggestions.ts`: Fetches dynamic LLM-generated prompt suggestions based on current flow state. Refreshable with default fallback suggestions.
- `useBackgroundSettings.ts`: Canvas appearance settings (pattern variant, gap, colors) persisted to localStorage.
- `useClipboard.ts`: Clipboard operations for copy/paste functionality.

**Comment System**:
- `CommentEditContext.tsx`: React context for tracking user-edited comments to prevent AI overwrites
- `app/api/comment-suggest/route.ts`: AI-generates title and description for comment nodes based on nearby nodes
- `lib/hooks/useCommentSuggestions.ts`: Manages auto-generation of comment suggestions

**Example Flow** (`lib/example-flow.ts`): Default flow configuration loaded on startup.

**Welcome Dialog (NUX)** (`components/Flow/WelcomeDialog/`): Two-step onboarding flow for new users:
- `index.tsx`: Main dialog controller with step logic
- `DialogShell.tsx`: Shared two-column layout (content left, hero right)
- `StepIndicator.tsx`: Progress dots showing current step
- `hooks/useNuxState.ts`: Manages NUX step state persisted to localStorage
- `heroes/DemoHero.tsx`: Interactive React Flow demo that auto-executes on mount
- `heroes/ProvidersHero.tsx`: 3D scene showing provider icons flowing into Composer
- `heroes/DemoOutputsModal.tsx`: Modal for viewing demo execution outputs
- `three/`: 3D components (RoundedTile, CurvedLine, SvgIcon, GoogleIcon, ComposerIcon)
- Step 1: Welcome with sign-in options (Google OAuth or skip)
- Step 2: API keys setup with link to settings dialog
- State persisted to `avy-nux-step` in localStorage

### Authentication & User Management

**Auth System** (`lib/auth/`): Supabase-based authentication with Google OAuth:
- `context.tsx`: AuthProvider with `useAuth` hook
- `types.ts`: User, Session, Profile interfaces
- Provides: `user`, `profile`, `signInWithGoogle`, `signOut`, `isLoading`

**Supabase Client** (`lib/supabase/`):
- `client.ts`: Browser client with cookie-based session storage
- `server.ts`: Server-side client for API routes
- `proxy.ts`: Session refresh helper used by `proxy.ts`
**Proxy** (`proxy.ts`): Next.js Proxy for session refresh

### API Key Management

**API Keys System** (`lib/api-keys/`): Provider API key storage and management:
- `context.tsx`: ApiKeysProvider with `useApiKeys` hook
- `storage.ts`: localStorage persistence with encryption support
- `types.ts`: ProviderId, ApiKeys, ApiKeyStatus interfaces
- Supports password-based unlock for pre-configured keys
- Development mode detection (uses env vars when available)

### Flow Storage

**Local Flow Storage** (`lib/flow-storage/`): Local flow persistence and file operations:
- `storage.ts`: Save/load flows to localStorage, download as JSON, file picker
- `validation.ts`: Flow schema validation with error reporting
- `types.ts`: SavedFlow, FlowMetadata, LoadFlowResult interfaces
- Flows saved with `.avy.json` extension

**Cloud Flow Storage** (`lib/flows/`): Supabase-backed flow persistence for authenticated users:
- `api.ts`: Client-side API calls for CRUD operations (listFlows, createFlow, updateFlow, loadFlow, deleteFlow)
- `types.ts`: FlowRecord, FlowListItem, response interfaces
- Metadata stored in `flows` table, flow JSON stored in Supabase Storage
- API routes: `app/api/flows/route.ts` (list, create), `app/api/flows/[id]/route.ts` (get, update, delete)

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
