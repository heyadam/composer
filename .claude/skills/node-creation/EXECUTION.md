# Step 3: Execution Engine

Add execution logic for your node by creating an executor file.

## Checklist

- [ ] Create executor file in `lib/execution/executors/`
- [ ] Implement `NodeExecutor` interface
- [ ] Register executor in `lib/execution/executors/index.ts`
- [ ] Handle inputs from connected edges
- [ ] Return `ExecuteNodeResult`
- [ ] Handle errors appropriately
- [ ] Support owner-funded execution (if API calls)

## NodeExecutor Interface

Create a new file `lib/execution/executors/your-node-type.ts`:

```typescript
import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const yourNodeExecutor: NodeExecutor = {
  type: "your-node-type",

  // Optional metadata
  hasPulseOutput: true,        // Set if node emits "done" pulse
  shouldTrackDownstream: true, // Set if node streams to preview outputs

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs, context, apiKeys, signal, options, onStreamUpdate } = ctx;

    // Your execution logic here

    return { output: "result" };
  },
};
```

## Register the Executor

Add to `lib/execution/executors/index.ts`:

```typescript
import { yourNodeExecutor } from "./your-node-type";

// In the registration block:
registerExecutor(yourNodeExecutor);
```

## ExecutionContext

The context provides everything needed for execution:

```typescript
interface ExecutionContext {
  node: Node;                              // The node being executed
  inputs: Record<string, string>;          // Inputs from connected edges
  context: Record<string, unknown>;        // Shared execution context
  apiKeys?: ApiKeys;                       // User's API keys (normal execution)
  signal?: AbortSignal;                    // Cancellation signal
  options?: ExecuteOptions;                // Includes shareToken/runId for owner-funded
  edges?: Edge[];                          // All flow edges
  onStreamUpdate?: StreamUpdateCallback;   // Streaming callback
  onNodeStateChange?: NodeStateChangeCallback; // State change callback
}
```

## Patterns by Category

### Simple Passthrough (Input/Output nodes)

```typescript
export const textInputExecutor: NodeExecutor = {
  type: "text-input",

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const inputValue = typeof ctx.node.data?.inputValue === "string"
      ? ctx.node.data.inputValue : "";
    return { output: inputValue };
  },
};
```

### Synchronous Transformation

```typescript
export const yourTransformExecutor: NodeExecutor = {
  type: "your-transform",
  hasPulseOutput: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { inputs, node } = ctx;
    const input = inputs["input"] || "";
    const config = (node.data.config as string) || "";

    const result = someTransformFunction(input, config);

    return { output: result };
  },
};
```

### API Call with Streaming

```typescript
import { fetchWithTimeout } from "../utils/fetch";
import { parseTextStream, parseErrorResponse } from "../utils/streaming";
import { buildApiRequestBody, redactRequestBody } from "../utils/request";
import { createTextGenerationDebugInfo } from "../utils/debug";

export const yourAiNodeExecutor: NodeExecutor = {
  type: "your-ai-node",
  hasPulseOutput: true,
  shouldTrackDownstream: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs, apiKeys, signal, options, onStreamUpdate } = ctx;
    const startTime = Date.now();

    // Get prompt (from connection or inline value)
    const hasPromptEdge = "prompt" in inputs;
    const inlineUserPrompt = typeof node.data?.userPrompt === "string"
      ? node.data.userPrompt : "";
    const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

    // Build request body (handles owner-funded vs normal)
    const requestBody = buildApiRequestBody({
      type: "your-ai-node",
      prompt: promptInput,
      provider: node.data.provider,
      model: node.data.model,
      apiKeys,
      options,
    });

    const debugInfo = createTextGenerationDebugInfo(startTime, redactRequestBody(requestBody));

    const response = await fetchWithTimeout("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, "Request failed"));
    }

    // Stream response
    const reader = response.body!.getReader();
    const { output } = await parseTextStream(reader, (text, rawChunks) => {
      debugInfo.streamChunksReceived = rawChunks.length;
      onStreamUpdate?.(text, debugInfo);
    });

    debugInfo.endTime = Date.now();
    return { output, debugInfo };
  },
};
```

## ExecuteNodeResult Interface

```typescript
interface ExecuteNodeResult {
  output: string;                // Required: main result
  reasoning?: string;            // For thinking models
  debugInfo?: DebugInfo;         // For API calls (timing, request)
  generatedCode?: string;        // For ai-logic nodes
  codeExplanation?: string;      // For ai-logic nodes
  stringOutput?: string;         // For preview-output (separate outputs)
  imageOutput?: string;          // For preview-output
  audioOutput?: string;          // For preview-output
}
```

## Input Collection

Inputs come from connected edges. The key is the `targetHandle` ID:

```typescript
// inputs object looks like:
{
  "prompt": "text from connected prompt edge",
  "system": "text from connected system edge",
  "image": "base64 JSON from connected image edge"
}
```

To check if an input came from an edge vs inline value:

```typescript
const hasPromptEdge = "prompt" in inputs;
const inlineValue = (node.data?.userPrompt as string) || "";
const effectivePrompt = hasPromptEdge ? inputs["prompt"] : inlineValue;
```

## Error Handling

Throw errors for failures - the engine catches them:

```typescript
if (!response.ok) {
  throw new Error(await parseErrorResponse(response, "Request failed"));
}
```

## API Route (if needed)

If your node calls an external API, add a handler in `app/api/execute/route.ts`.

**Location**: Find the `POST` function and its main switch statement on `body.type`. Add your case after the existing node type handlers.

```typescript
// app/api/execute/route.ts - in POST handler switch statement
case "your-ai-node": {
  const { prompt, provider, model, apiKeys, shareToken, runId } = body;

  // Get API key (owner-funded or user's)
  let apiKey: string;
  if (shareToken && runId) {
    const ownerKeys = await getOwnerKeysForExecution(shareToken, runId);
    apiKey = ownerKeys[provider];
  } else {
    apiKey = apiKeys?.[provider];
  }

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 400 });
  }

  // Call external API and stream response...
}
```

## Owner-Funded Execution

When a flow is published with "Owner-Funded Execution" enabled, collaborators run the flow using the owner's API keys instead of their own.

**How it works:**
1. User visits a live share link (e.g., `/1234/abc123token`)
2. The live page calls `/api/live/[token]/execute` instead of `/api/execute`
3. The execution engine automatically passes `shareToken` and `runId` in `options`
4. Use `buildApiRequestBody()` which handles both paths automatically
5. Server-side code retrieves owner's encrypted keys via `getOwnerKeysForExecution()`

## Validation

After completing this step, verify:
- [ ] Node executes when flow runs
- [ ] Inputs from connected nodes are received
- [ ] Output is passed to downstream nodes
- [ ] Errors are caught and displayed
- [ ] Streaming updates appear in real-time (if applicable)
- [ ] Owner-funded execution works (if API calls)
