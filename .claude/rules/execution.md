# Execution Engine

## Core Engine

**Execution Engine** (`lib/execution/engine.ts`): Recursive graph traversal that:
1. Finds text-input node as start
2. Executes parallel branches independently (responses appear as each completes)
3. Tracks execution state (running/success/error) per node

**Execution Types** (`lib/execution/types.ts`): Type definitions for the execution engine.

## API Routes

**Execute API** (`app/api/execute/route.ts`): Server-side execution handler:
- **Text generation**: Uses Vercel AI SDK with `streamText` for real-time streaming. Supports OpenAI, Google, and Anthropic with provider-specific options.
- **Google Gemini thinking**: When enabled, streams NDJSON with separate `reasoning` and `text` chunks. Auto-enables `includeThoughts` when `thinkingLevel` or `thinkingBudget` is set.
- **Image generation**: OpenAI (Responses API with streaming partial images) and Google Gemini. Configurable aspect ratio, quality, format, and partial image count.

## Hooks

**useFlowExecution** (`lib/hooks/useFlowExecution.ts`): Manages flow execution state, preview/debug entries, run/cancel/reset operations. Extracted from AgentFlow for testability.

**useNodeParenting** (`lib/hooks/useNodeParenting.ts`): Handles node parenting behavior within comments:
- Auto-parenting when dragged into comments
- Unparenting when dragged out
- Comment deletion with cascading unparenting
- Resize capture/release

**useUndoRedo** (`lib/hooks/useUndoRedo.ts`): Snapshot-based undo/redo for flow state:
- Keyboard shortcuts (Cmd+Z/Ctrl+Z for undo, Shift+Cmd+Z/Ctrl+Y for redo)
- Maintains history stack up to 50 snapshots

**useClipboard** (`lib/hooks/useClipboard.ts`): Clipboard operations for copy/paste functionality.
