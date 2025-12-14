# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

See `AI_MODELS.md` for the full list of supported models per provider.

## Architecture Overview

This is an AI agent workflow builder using Next.js 16 App Router with React Flow for visual flow editing.

### Core Components

**Flow Editor** (`components/Flow/AgentFlow.tsx`): Main visual editor using @xyflow/react. Handles drag-and-drop node creation, edge connections, and flow execution controls.

**Interaction Model**:
- Normal mouse drag on canvas pans the view
- Hold spacebar + drag to create selection box (crosshair cursor)
- Selected nodes show yellow border with animated glow

**Node Types** (`components/Flow/nodes/`): Four custom node components with editable labels:
- `InputNode`: Entry point, receives user input
- `PromptNode`: LLM prompt execution with dual inputs (user prompt + system instructions), multi-provider support
- `ImageNode`: AI image generation (OpenAI with streaming partial images, Google Gemini)
- `OutputNode`: Exit point, displays final result and sends to preview

**InputWithHandle** (`components/Flow/nodes/InputWithHandle.tsx`): Reusable component combining input fields with connection handles:
- Shows disabled textarea with "Connected" placeholder when handle is wired
- Color-coded handles (cyan/purple/amber) with connection highlighting
- Used by PromptNode for user prompt and system instructions inputs

**Provider Configuration** (`lib/providers.ts`): Centralized config for AI providers and models. Supports OpenAI, Google, and Anthropic with provider-specific options (verbosity, thinking).

**IMPORTANT: Always consult `AI_MODELS.md` for the authoritative list of model IDs.** Do not hardcode or assume model names - refer to AI_MODELS.md for correct, up-to-date model identifiers when working with providers.

### Documentation Lookup

Use the **Context7 MCP tools** (`mcp__context7__resolve-library-id` and `mcp__context7__get-library-docs`) to fetch the latest documentation for any libraries or SDKs (Vercel AI SDK, OpenAI SDK, etc.).

**IMPORTANT: `AI_MODELS.md` supersedes Context7 for model information.** If Context7 returns different model IDs or model names, always defer to `AI_MODELS.md` as the authoritative source for this project.

**NodeFrame** (`components/Flow/nodes/NodeFrame.tsx`): Shared wrapper for all nodes providing consistent styling, status badges, and inline title editing.

**NodeStatusBadge** (`components/Flow/nodes/NodeStatusBadge.tsx`): Visual indicator for node execution status (running/success/error).

**Responses Sidebar** (`components/Flow/ResponsesSidebar/`): Resizable right sidebar that displays output node results:
- `ResponsesSidebar.tsx`: Main container with run/reset controls and drag-to-resize
- `ResponsesHeader.tsx`: Header with action buttons
- `ResponsesContent.tsx`: Scrollable content area for responses
- Streams responses in real-time as they generate
- Width persisted to localStorage (min: 240px, max: 800px)

**Avy Logo** (`components/Flow/AvyLogo.tsx`): Animated 3D fluid sphere logo using react-three-fiber. Features:
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
1. Finds input node as start
2. Executes parallel branches independently (responses appear as each completes)
3. Tracks execution state (running/success/error) per node

**Execution Types** (`lib/execution/types.ts`): Type definitions for the execution engine.

**Node Sidebar** (`components/Flow/NodeSidebar.tsx`): Collapsible node palette triggered by "Add Node" button. Nodes are drag-and-drop onto canvas.

**Autopilot Sidebar** (`components/Flow/AutopilotSidebar/`): AI-powered chat interface for natural language flow editing:
- `AutopilotSidebar.tsx`: Main container with resizable width (320-600px)
- `AutopilotChat.tsx`: Chat UI with model selector (Sonnet/Opus 4.5) and suggested prompts
- `AutopilotHeader.tsx`: Header with clear history button
- Uses Claude to generate flow modifications from natural language descriptions
- Supports actions: `addNode`, `addEdge`, `removeEdge`
- Auto-applies changes with undo capability
- New nodes highlighted with purple glow until interacted with

**Autopilot System** (`lib/autopilot/`):
- `types.ts`: Action types (AddNodeAction, AddEdgeAction, RemoveEdgeAction), FlowChanges, AutopilotMessage
- `parser.ts`: Extracts and validates JSON actions from Claude's responses
- `snapshot.ts`: Serializes current flow state for context
- `system-prompt.ts`: Builds prompt with node types, edge rules, and insertion examples

**Autopilot Hook** (`lib/hooks/useAutopilotChat.ts`): Manages conversation state, streaming responses, auto-apply, and undo functionality.

**Example Flow** (`lib/example-flow.ts`): Default flow configuration loaded on startup.

**API Route** (`app/api/execute/route.ts`): Server-side execution handler for prompt and image nodes:
- Prompt nodes: Uses Vercel AI SDK with `streamText` for real-time streaming responses. Supports OpenAI, Google, and Anthropic providers with provider-specific options (verbosity, thinking).
- Image nodes: OpenAI (Responses API with streaming partial images) and Google Gemini. Configurable aspect ratio, quality, format, and partial image count.

### Type System

Flow types in `types/flow.ts` define node data interfaces with execution state tracking (`ExecutionStatus`, `executionOutput`, `executionError`).

**PromptNodeData fields**:
- `userPrompt`: User message content (used when prompt input not connected)
- `systemPrompt`: System instructions (used when system input not connected)
- `provider`, `model`: AI provider and model selection
- `verbosity`, `thinking`: Provider-specific options

### UI Components

Uses shadcn/ui components in `components/ui/` with Tailwind CSS v4. Import alias `@/*` maps to project root.

**Content Design**: When adding or modifying UI text (labels, placeholders, descriptions, tooltips, button text), follow the standards in `CONTENT_DESIGN.md`. This ensures consistent tone and formatting across the application.

**AI Elements**: Use the AI Elements MCP (`mcp__ai-elements__get_ai_elements_components` and `mcp__ai-elements__get_ai_elements_component`) to discover and add UI components. AI Elements registry is configured at `@ai-elements` for components from `https://registry.ai-sdk.dev/`.
