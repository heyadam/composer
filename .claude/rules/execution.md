# Execution Engine

## Architecture Overview

The execution engine uses a **modular executor pattern**:

- **Engine** (`lib/execution/engine.ts`): Orchestrates graph traversal, delegates to executors
- **Executor Registry** (`lib/execution/executor-registry.ts`): Central registry for node executors
- **Executors** (`lib/execution/executors/`): Individual executor files per node type
- **Utilities** (`lib/execution/utils/`): Shared helpers (fetch, streaming, request, debug)
- **Types** (`lib/execution/types.ts`): Type definitions for the execution engine

## Executor Registry

Node executors are registered at startup and looked up by type:

```typescript
import { registerExecutor, getExecutor, hasPulseOutput, shouldTrackDownstream } from "./executor-registry";

// Register an executor
registerExecutor(myExecutor);

// Look up executor by type
const executor = getExecutor("text-generation");

// Check metadata
hasPulseOutput("text-generation");        // true - has "done" output
shouldTrackDownstream("text-generation"); // true - streams to preview outputs
```

## NodeExecutor Interface

Each executor implements this interface (`lib/execution/executors/types.ts`):

```typescript
interface NodeExecutor {
  type: string;                           // Node type identifier
  hasPulseOutput?: boolean;               // Emits "done" pulse when complete
  shouldTrackDownstream?: boolean;        // Updates downstream preview outputs during streaming
  execute(ctx: ExecutionContext): Promise<ExecuteNodeResult>;
}

interface ExecutionContext {
  node: Node;
  inputs: Record<string, string>;
  context: Record<string, unknown>;
  apiKeys?: ApiKeys;
  signal?: AbortSignal;
  options?: ExecuteOptions;
  edges?: Edge[];
  onStreamUpdate?: StreamUpdateCallback;
  onNodeStateChange?: NodeStateChangeCallback;
}
```

## Executor Files

Each node type has its own executor file in `lib/execution/executors/`:

| File | Node Type | Metadata |
|------|-----------|----------|
| `text-input.ts` | text-input | - |
| `image-input.ts` | image-input | - |
| `audio-input.ts` | audio-input | hasPulseOutput |
| `preview-output.ts` | preview-output | - |
| `text-generation.ts` | text-generation | hasPulseOutput, shouldTrackDownstream |
| `image-generation.ts` | image-generation | hasPulseOutput, shouldTrackDownstream |
| `ai-logic.ts` | ai-logic | hasPulseOutput |
| `react-component.ts` | react-component | hasPulseOutput, shouldTrackDownstream |
| `audio-transcription.ts` | audio-transcription | hasPulseOutput |
| `realtime-conversation.ts` | realtime-conversation | hasPulseOutput |
| `comment.ts` | comment | - |

All executors are registered via `lib/execution/executors/index.ts`.

## Utility Modules

Shared utilities in `lib/execution/utils/`:

- **fetch.ts**: `fetchWithTimeout()` for API calls with abort support
- **streaming.ts**: `parseNdjsonStream()`, `parseTextStream()`, `parseImageStream()`, `parseErrorResponse()`
- **request.ts**: `buildApiRequestBody()`, `redactRequestBody()` for API request construction
- **debug.ts**: Debug info factories for different node types

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
