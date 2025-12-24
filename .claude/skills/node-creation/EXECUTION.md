# Step 3: Execution Engine

Add execution logic for your node in `lib/execution/engine.ts`.

## Checklist

- [ ] Add case to `executeNode` switch statement
- [ ] Handle inputs from connected edges
- [ ] Implement node-specific logic
- [ ] Return `ExecuteNodeResult`
- [ ] Handle errors appropriately
- [ ] Support owner-funded execution (if API calls)

## ExecuteNode Function

Add your node type to the switch statement in `executeNode()` (~line 78):

```typescript
async function executeNode(
  node: Node,
  inputs: Record<string, string>,
  context: Record<string, unknown>,
  apiKeys?: ApiKeys,
  onStreamUpdate?: (output: string, debugInfo?: DebugInfo, reasoning?: string) => void,
  signal?: AbortSignal,
  options?: ExecuteOptions
): Promise<ExecuteNodeResult> {
  switch (node.type) {
    // ... existing cases ...

    case "your-node-type": {
      // Your execution logic here
    }
  }
}
```

## Patterns by Category

### Simple Passthrough (Input/Output nodes)

```typescript
case "text-input":
  return { output: inputs["prompt"] || inputs["input"] || "" };

case "preview-output":
  return { output: inputs["input"] || Object.values(inputs)[0] || "" };
```

### Synchronous Transformation

```typescript
case "your-transform": {
  const input = inputs["input"] || "";
  const config = node.data.transformConfig as string || "";

  // Perform transformation
  const result = someTransformFunction(input, config);

  return { output: result };
}
```

### API Call with Streaming

```typescript
case "your-ai-node": {
  const startTime = Date.now();
  let streamChunksReceived = 0;

  // Get prompt (from connection or inline value)
  const hasPromptEdge = "prompt" in inputs;
  const inlineUserPrompt = typeof node.data?.userPrompt === "string"
    ? node.data.userPrompt : "";
  const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

  // Build request body (handle owner-funded vs normal)
  const requestBody = options?.shareToken
    ? {
        type: "your-ai-node",
        prompt: promptInput,
        provider: node.data.provider,
        model: node.data.model,
        shareToken: options.shareToken,
        runId: options.runId,
        // NO apiKeys - server uses owner's keys
      }
    : {
        type: "your-ai-node",
        prompt: promptInput,
        provider: node.data.provider,
        model: node.data.model,
        apiKeys,
        // NO shareToken
      };

  const debugInfo: DebugInfo = {
    startTime,
    request: requestBody,
    streamChunksReceived: 0,
  };

  const response = await fetchWithTimeout("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(JSON.parse(text).error || "Request failed");
  }

  // Stream response
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullOutput = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    fullOutput += decoder.decode(value);
    streamChunksReceived++;
    debugInfo.streamChunksReceived = streamChunksReceived;
    onStreamUpdate?.(fullOutput, debugInfo);
  }

  debugInfo.endTime = Date.now();
  return { output: fullOutput, debugInfo };
}
```

## ExecuteNodeResult Interface

```typescript
interface ExecuteNodeResult {
  output: string;                // Required: main result
  reasoning?: string;            // For thinking models
  debugInfo?: DebugInfo;         // For API calls (timing, request)
  generatedCode?: string;        // For ai-logic nodes
  codeExplanation?: string;      // For ai-logic nodes
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
const inlineValue = node.data?.userPrompt as string || "";
const effectivePrompt = hasPromptEdge ? inputs["prompt"] : inlineValue;
```

## Error Handling

Throw errors for failures - the engine catches them:

```typescript
if (!response.ok) {
  const text = await response.text();
  let errorMessage: string;
  try {
    errorMessage = JSON.parse(text).error || "Request failed";
  } catch {
    errorMessage = text || "Request failed";
  }
  throw new Error(errorMessage);
}
```

## API Route (if needed)

If your node calls an API, add a handler in `app/api/execute/route.ts`:

```typescript
// In the POST handler switch:
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

## Validation

After completing this step, verify:
- [ ] Node executes when flow runs
- [ ] Inputs from connected nodes are received
- [ ] Output is passed to downstream nodes
- [ ] Errors are caught and displayed
- [ ] Streaming updates appear in real-time (if applicable)
- [ ] Owner-funded execution works (if API calls)
