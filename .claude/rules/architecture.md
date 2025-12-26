# Architecture

This is an AI agent workflow builder using Next.js 16 App Router with React Flow for visual flow editing.

## Flow Editor

**Main Editor** (`components/Flow/AgentFlow.tsx`): Visual editor using @xyflow/react. Handles drag-and-drop node creation, edge connections, and flow execution controls.

**Interaction Model**:
- Normal mouse drag on canvas pans the view
- Hold spacebar + drag to create selection box (crosshair cursor)
- Selected nodes show yellow border with animated glow

## Core Components

**NodeFrame** (`components/Flow/nodes/NodeFrame.tsx`): Shared wrapper for all nodes providing consistent styling, status badges, and inline title editing.

**NodeStatusBadge** (`components/Flow/nodes/NodeStatusBadge.tsx`): Visual indicator for node execution status (running/success/error).

**InputWithHandle** (`components/Flow/nodes/InputWithHandle.tsx`): Reusable component combining input fields with connection handles:
- Shows disabled textarea with "Connected" placeholder when handle is wired
- Color-coded handles (cyan/purple/amber) with connection highlighting
- Used by PromptNode for user prompt and system instructions inputs

**Port Labels** (`components/Flow/nodes/PortLabel.tsx`): Unified port design component for all nodes:
- Color-coded input/output handles (cyan=string, purple=image, amber=response, emerald=audio)
- Labels next to handles showing data type
- Visual highlighting during edge creation (color activates when dragging)
- Hover effects with scale animation

**Connection Context** (`components/Flow/ConnectionContext.tsx`): React context tracking edge connection state, enabling port highlighting feedback when creating connections.

**Colored Edges** (`components/Flow/edges/ColoredEdge.tsx`): Custom edge component with data-type based coloring:
- Cyan for string data
- Purple for image data
- Amber for response data
- Emerald for audio data
- Multi-layer glow effect and pulse animation on selection

## Provider Configuration

**Provider Config** (`lib/providers.ts`): Centralized config for AI providers and models. Supports OpenAI, Google, and Anthropic with provider-specific options:
- OpenAI: `verbosity`, `thinking`
- Google Gemini: `thinkingLevel` (Gemini 3), `thinkingBudget` (Gemini 2.5), `safetyPreset`
- All models have `supportsVision` flag for multimodal capability detection

**Vision Module** (`lib/vision/index.ts`): Utilities for vision/multimodal support:
- `modelSupportsVision(provider, model)`: Check if model supports image input
- `getVisionCapableModel(provider, model)`: Get vision-capable model (current if supported, or default fallback)
- `resolveImageInput(connected, inline)`: Resolve image from connection or inline upload (connection wins)

**IMPORTANT: Always consult `docs/AI_MODELS.md` for the authoritative list of model IDs.** Do not hardcode or assume model names.

## Documentation Lookup

Use the **Context7 MCP tools** (`mcp__context7__resolve-library-id` and `mcp__context7__get-library-docs`) to fetch the latest documentation for any libraries or SDKs (Vercel AI SDK, OpenAI SDK, etc.).

**IMPORTANT: `docs/AI_MODELS.md` supersedes Context7 for model information.** If Context7 returns different model IDs or model names, always defer to `docs/AI_MODELS.md` as the authoritative source for this project.

## UI Shell Components

**Responses Sidebar** (`components/Flow/ResponsesSidebar/`): Resizable right sidebar that displays preview-output node results:
- `ResponsesSidebar.tsx`: Main container with spring-animated open/close using motion.dev
- `ResponsesHeader.tsx`: Header with action buttons
- `ResponsesContent.tsx`: Scrollable content area for responses
- `DebugContent.tsx`: Debug view showing detailed request/response info per node
- `ReactPreview.tsx`: Sandboxed iframe preview for React component node outputs
- Streams responses in real-time as they generate
- Width persisted to localStorage (min: 240px, max: 800px)

**Node Sidebar** (`components/Flow/NodeSidebar.tsx`): Collapsible node palette triggered by "Add Node" button. Nodes are drag-and-drop onto canvas.

**Action Bar** (`components/Flow/ActionBar.tsx`): Bottom-center floating toolbar with:
- Add Node toggle (opens node palette)
- Comment Around (wraps selected nodes in comment)
- Reset button
- Run/Cancel button

**Node Toolbar** (`components/Flow/NodeToolbar.tsx`): Floating toolbar for quick node insertion with icons for each node type.

**Flow Context Menu** (`components/Flow/FlowContextMenu.tsx`): Right-click context menu on canvas with "Comment Around" option for selected nodes.

**Composer Logo** (`components/Flow/AvyLogo.tsx`): Animated 3D fluid sphere logo using react-three-fiber with WebGL shader-based liquid deformation.
