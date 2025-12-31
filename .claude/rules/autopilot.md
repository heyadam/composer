# Autopilot System

AI-powered natural language flow editing.

## Sidebar UI

**AutopilotSidebar** (`components/Flow/AutopilotSidebar/`): Chat interface for natural language flow editing:
- `AutopilotSidebar.tsx`: Main container with spring-animated open/close, absolute positioned to overlay canvas
- `AutopilotChat.tsx`: Chat UI with mode selector (Execute/Plan), model selector (Sonnet 4.5/Opus 4.5), and extended thinking toggle
- Uses `useResizableSidebar` hook for drag-to-resize (320-600px)
- `AutopilotHeader.tsx`: Header with copy transcript and clear history buttons
- `CollapsibleJson.tsx`: Collapsible JSON preview with syntax highlighting, auto-scroll during streaming, auto-collapse when done
- `ChangesPreview.tsx`: Visual diff of pending changes (added/removed nodes and edges)

**Features**:
- **Modes**: Execute (immediately applies changes) or Plan (shows step-by-step plan for user approval)
- **Models**: Claude Sonnet 4.5 (default) or Claude Opus 4.5
- **Extended Thinking**: Toggle for Claude's extended thinking capability
- Supports actions: `addNode`, `addEdge`, `removeEdge`, `removeNode`
- Auto-applies changes with full undo capability (restores removed nodes/edges)
- New nodes highlighted with purple glow until interacted with
- LLM-based validation using Claude Haiku 4.5 with auto-retry on failure
- Shimmer loading effects during AI operations

## Core System

**Autopilot Library** (`lib/autopilot/`):
- `types.ts`: Action types, FlowChanges, AutopilotMessage, EvaluationResult, EvaluationState, AutopilotMode, AutopilotModel, FlowPlan, PendingAutopilotMessage
- `parser.ts`: Extracts and validates JSON actions from Claude's responses. Valid node types: `text-input`, `image-input`, `text-generation`, `image-generation`, `ai-logic`, `preview-output`, `react-component`, `comment`, `realtime-conversation`
- `snapshot.ts`: Serializes current flow state for context
- `system-prompt.ts`: Builds prompt with node types, edge rules, valid model IDs, and insertion examples
- `evaluator.ts`: Programmatic validation of generated flow changes. Checks node types, model IDs, edge connections, target handles (including `image` handle for vision on text-generation), and completeness. Returns issues for auto-retry.

## API Routes

- `app/api/autopilot/route.ts`: Streams responses from Claude with mode (execute/plan), model selection (sonnet-4-5/opus-4-5), and extended thinking support
- `app/api/autopilot/evaluate/route.ts`: Validates flow changes using Claude Haiku 4.5
- `app/api/autopilot/suggestions/route.ts`: Generates dynamic prompt suggestions based on current flow state

## Hooks

**useAutopilotChat** (`lib/hooks/useAutopilotChat.ts`): Manages conversation state, streaming responses, post-stream evaluation, auto-retry on validation failure, auto-apply on success, and undo functionality.

**useAutopilotIntegration** (`lib/hooks/useAutopilotIntegration.ts`): Handles applying/undoing autopilot changes to the flow, highlight management for newly added nodes, and smooth animations. Extracted from AgentFlow for testability.

**useSuggestions** (`lib/hooks/useSuggestions.ts`): Fetches dynamic LLM-generated prompt suggestions based on current flow state. Refreshable with default fallback suggestions.

## Node Layout & Animation

When Autopilot adds new nodes, the system automatically resolves overlaps and animates changes.

**Layout Module** (`lib/layout/`):
- `resolve-overlaps.ts`: Collision detection and resolution algorithm
- `resolveNodeOverlaps(nodes, newNodeIds, edges)`: Calculates displacement vectors for existing nodes
- `applyDisplacements(nodes, displacements, options?)`: Applies position changes with optional animation class
- Uses AABB collision detection with configurable gap (default: 50px)
- Smart push direction: right by default, down when nodes are vertically stacked
- Respects parent-child relationships (comment children move with parent)
- Max displacement capped at 400px to prevent excessive gaps

**Animation Classes** (in `app/globals.css`):
- `.autopilot-added`: New nodes fade in (300ms opacity animation) + purple glow effect
- `.autopilot-displaced`: Existing nodes slide to new positions (300ms ease-in-out transition)
- Animation classes auto-removed after transitions complete (350ms timeout)

**Animation Flow**:
1. Autopilot adds nodes with `autopilot-added` class (triggers fade-in)
2. `resolveNodeOverlaps` calculates which existing nodes need to move
3. `applyDisplacements` shifts nodes and adds `autopilot-displaced` class (triggers slide)
4. After 350ms, `autopilot-displaced` class is removed to clean up
