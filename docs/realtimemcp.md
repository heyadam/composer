# MCP Server Async Push Implementation Plan

Convert the MCP server from polling-based to push-based (SSE streaming) execution using the MCP 2025-03-26 "Streamable HTTP" transport.

## Progress Tracker

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| 1.1 | Add streaming types to `lib/mcp/types.ts` | ✅ Complete | ProgressNotification, NodeExecutionEvent, StreamingRunResult |
| 1.2 | Create `lib/mcp/sse.ts` | ✅ Complete | formatSSEEvent, formatProgressEvent, formatResultEvent, formatErrorEvent, formatHeartbeat |
| 2 | Update `lib/execution/server-execute.ts` | ✅ Complete | executeFlowServerWithProgress with AbortSignal support |
| 3 | Add streaming tool to `lib/mcp/tools.ts` | ✅ Complete | createFlowExecutionStream, countExecutableNodes |
| 4 | Update `app/api/mcp/route.ts` for SSE | ✅ Complete | Node.js runtime (crypto dependency), Accept header detection, SSE response |
| 5 | Verify polling fallback | ✅ Complete | Existing tests pass (319/319) |
| 6 | Write tests | ✅ Complete | 28 SSE utility tests + 8 route SSE tests (354/354 total) |

## Summary

**Current**: Client calls `run_flow` → gets job_id → polls `get_run_status` repeatedly
**Target**: Client calls `run_flow` → receives SSE stream with progress updates and final results

## Critical Requirements (from review)

| Issue | Solution |
|-------|----------|
| **Edge runtime required** | SSE on Vercel needs `export const runtime = "edge"` |
| **`after()` incompatible with SSE** | Remove `after()` - stream keeps function alive |
| **Client disconnect handling** | Propagate `request.signal` (AbortSignal) to execution |
| **Heartbeats needed** | Send ping every 15s to prevent idle timeout |
| **Protocol version** | Update to `2025-03-26` |

## Files to Modify

| File | Changes |
|------|---------|
| `lib/mcp/types.ts` | Add streaming event types |
| `lib/mcp/sse.ts` | **NEW** - SSE formatting utilities |
| `lib/execution/server-execute.ts` | Add progress callback + AbortSignal support |
| `lib/mcp/tools.ts` | Add `runFlowStreaming` with ReadableStream |
| `app/api/mcp/route.ts` | Edge runtime, SSE response, remove `after()` |
| `lib/mcp/job-store.ts` | Keep for reconnection fallback |

---

## Phase 1: Types and SSE Utilities

### 1.1 Add types to `lib/mcp/types.ts`

```typescript
/** Progress notification during execution */
export interface ProgressNotification {
  progressToken: string;
  progress: number;
  total?: number;
  message?: string;
}

/** Node execution event */
export interface NodeExecutionEvent {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: "running" | "success" | "error";
  output?: StructuredOutput;
  error?: string;
  timestamp: string;
}

/** Streaming result */
export interface StreamingRunResult {
  status: "completed" | "failed";
  outputs?: Record<string, StructuredOutput>;
  errors?: Record<string, string>;
  duration_ms: number;
}
```

### 1.2 Create `lib/mcp/sse.ts`

```typescript
/** Format SSE event in MCP JSON-RPC format */
export function formatSSEEvent(data: unknown, id?: string): string {
  const lines: string[] = [];
  if (id) lines.push(`id: ${id}`);
  lines.push(`event: message`);
  lines.push(`data: ${JSON.stringify(data)}`);
  lines.push("");
  return lines.join("\n") + "\n";
}

/** Format progress notification */
export function formatProgressEvent(params: ProgressNotification): string {
  return formatSSEEvent({
    jsonrpc: "2.0",
    method: "notifications/progress",
    params,
  });
}

/** Format final result */
export function formatResultEvent(requestId: string | number, result: unknown): string {
  return formatSSEEvent({
    jsonrpc: "2.0",
    id: requestId,
    result: {
      content: [{ type: "text", text: JSON.stringify(result) }],
    },
  });
}
```

---

## Phase 2: Execution Engine Progress Callbacks

### 2.1 Update `lib/execution/server-execute.ts`

Add new function `executeFlowServerWithProgress`:

```typescript
export type NodeProgressCallback = (event: NodeExecutionEvent) => void;

export async function executeFlowServerWithProgress(
  nodes: Node[],
  edges: Edge[],
  apiKeys: ApiKeys,
  inputOverrides?: Record<string, string>,
  onProgress?: NodeProgressCallback,
  signal?: AbortSignal
): Promise<ExecutionResult> {
  // ... existing setup ...

  async function executeNodeAndContinue(node: Node): Promise<void> {
    if (executedNodes.has(node.id)) return;
    if (signal?.aborted) throw new Error("Execution cancelled");

    const label = (node.data?.label as string) || node.id;

    // Emit "running" event
    onProgress?.({
      nodeId: node.id,
      nodeLabel: label,
      nodeType: node.type || "unknown",
      status: "running",
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await executeNode(node, inputs, apiKeys);
      executedOutputs[node.id] = result;
      executedNodes.add(node.id);

      // Emit "success" event
      onProgress?.({
        nodeId: node.id,
        nodeLabel: label,
        nodeType: node.type || "unknown",
        status: "success",
        output: node.type === "preview-output" ? parseOutput(result) : undefined,
        timestamp: new Date().toISOString(),
      });

      // ... continue downstream ...
    } catch (error) {
      // Emit "error" event
      onProgress?.({
        nodeId: node.id,
        nodeLabel: label,
        nodeType: node.type || "unknown",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
```

---

## Phase 3: Streaming Tool Implementation

### 3.1 Update `lib/mcp/tools.ts`

Add streaming execution function that returns a `ReadableStream` directly (NOT TransformStream - avoids buffering large outputs):

```typescript
export function createFlowExecutionStream(
  token: string,
  inputs: Record<string, string>,
  requestId: string | number,
  signal: AbortSignal
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      // 1. Validate and rate limit (same as existing runFlow)
      // 2. Load flow and decrypt keys

      const totalNodes = countExecutableNodes(nodes);
      let completedNodes = 0;
      const startTime = Date.now();

      // Heartbeat to prevent idle timeout (every 15s)
      const heartbeat = setInterval(() => {
        if (!signal.aborted) {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }
      }, 15000);

      // Progress callback enqueues directly to stream
      const onProgress = (event: NodeExecutionEvent) => {
        if (signal.aborted) return;
        if (event.status === "success") completedNodes++;

        controller.enqueue(encoder.encode(formatSSEEvent({
          jsonrpc: "2.0",
          method: "notifications/progress",
          params: {
            progressToken: String(requestId),
            progress: completedNodes,
            total: totalNodes,
            node: event,
          },
        })));
      };

      try {
        // Execute with AbortSignal propagation
        const result = await executeFlowServerWithProgress(
          nodes, edges, apiKeys, inputOverrides, onProgress, signal
        );

        // Send final result
        controller.enqueue(encoder.encode(formatSSEEvent({
          jsonrpc: "2.0",
          id: requestId,
          result: {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: Object.keys(result.errors).length > 0 ? "failed" : "completed",
                outputs: transformOutputs(result.outputs),
                errors: result.errors,
                duration_ms: Date.now() - startTime,
              }),
            }],
          },
        })));
      } catch (error) {
        // Send error response
        controller.enqueue(encoder.encode(formatSSEEvent({
          jsonrpc: "2.0",
          id: requestId,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Unknown error",
          },
        })));
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },

    cancel() {
      // Called when client disconnects - signal already handles abort
    },
  });
}
```

**Key improvements over TransformStream approach**:
- No buffering - events enqueue directly
- Backpressure handled naturally
- Heartbeats prevent idle timeout
- AbortSignal cancels execution on disconnect
- Clean error handling with proper JSON-RPC format

---

## Phase 4: Route Handler SSE Response

### 4.1 Update `app/api/mcp/route.ts`

**Critical changes**:
1. Add Edge runtime (required for SSE on Vercel)
2. Update protocol version to 2025-03-26
3. Pass `request.signal` to streaming function
4. Remove `after()` for streaming case (stream keeps function alive)

```typescript
// Add at top of file
export const runtime = "edge";
export const maxDuration = 300;

// Update protocol version
case "initialize":
  return {
    protocolVersion: "2025-03-26",  // Was 2024-11-05
    capabilities: { tools: {} },
    serverInfo: { name: "composer-mcp", version: "2.0.0" },
  };

// Handle run_flow with streaming
case "run_flow": {
  const acceptsSSE = request.headers.get("Accept")?.includes("text/event-stream");

  if (acceptsSSE) {
    // Streaming mode - no after() needed, stream keeps function alive
    const stream = createFlowExecutionStream(
      args.token,
      args.inputs,
      validatedReq.id,
      request.signal  // Pass AbortSignal for client disconnect
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } else {
    // Polling fallback for clients that don't support SSE
    const { response, executionPromise } = await runFlow(args.token, args.inputs);
    after(executionPromise);
    return jsonRpcResponse(response);
  }
}
```

### 4.2 SSE Response Headers

Required headers for proper SSE behavior:

| Header | Purpose |
|--------|---------|
| `Content-Type: text/event-stream` | SSE content type |
| `Cache-Control: no-cache, no-transform` | Prevent caching/modification |
| `Connection: keep-alive` | Maintain connection |
| `X-Accel-Buffering: no` | Disable nginx buffering |

---

## Phase 5: Keep Polling Fallback

### 5.1 Retain `get_run_status` for edge cases

- Client reconnection after disconnect
- Flows exceeding 5-minute Vercel timeout
- Non-streaming MCP clients

### 5.2 Save results to job store on completion

Even with streaming, persist final results so `get_run_status` works:

```typescript
// At end of streaming execution
await jobStore.complete(jobId, structuredOutputs);
```

---

## Implementation Order

1. **Types** (`lib/mcp/types.ts`) - Add streaming types
2. **SSE utilities** (`lib/mcp/sse.ts`) - Create new file
3. **Execution engine** (`lib/execution/server-execute.ts`) - Add progress callbacks
4. **Streaming tools** (`lib/mcp/tools.ts`) - Add `runFlowStreaming`
5. **Route handler** (`app/api/mcp/route.ts`) - Return SSE for `run_flow`
6. **Tests** - Update existing tests, add streaming tests

---

## Testing Strategy

### Unit Tests

1. **SSE Format Tests** (`lib/mcp/__tests__/sse.test.ts`)
   - `formatSSEEvent` produces valid SSE format
   - Handles special characters (newlines, quotes)
   - Progress events include all required fields

2. **Streaming Tools Tests** (`lib/mcp/__tests__/tools.test.ts`)
   - `createFlowExecutionStream` returns ReadableStream
   - Progress events emitted in correct order
   - AbortSignal cancellation works
   - Error handling produces valid JSON-RPC error

3. **Execution Engine Tests** (`lib/execution/__tests__/server-execute.test.ts`)
   - `executeFlowServerWithProgress` calls callbacks correctly
   - AbortSignal stops execution mid-flow
   - Existing `executeFlowServer` still works (no regression)

### Integration Tests

4. **Route Tests** (`lib/mcp/__tests__/route.test.ts`)
   - Accept header detection works correctly
   - SSE response has correct headers
   - JSON fallback works when SSE not accepted
   - Protocol version is `2025-03-26`

### Edge Cases

5. **Edge Case Tests**
   - Client disconnect mid-stream (AbortSignal)
   - Execution timeout (5 min limit)
   - Very large outputs (>1MB images)
   - Empty flow (no nodes to execute)
   - All nodes fail (error-only result)

### Manual Testing

6. **Claude Code Integration**
   - Configure Claude Code to use streaming endpoint
   - Verify progress appears in real-time
   - Test with slow network (throttled)

---

## Security Notes

- Same rate limits apply (10/min, 100/day per token)
- Same owner-funded execution validation
- Add per-token concurrent connection limit (3 max)

---

## Runtime Considerations

Using **Node.js runtime** (not Edge) because `lib/encryption.ts` uses Node.js `crypto` module for API key encryption/decryption. SSE streaming works fine with Node.js runtime on Vercel.

```typescript
// In app/api/mcp/route.ts
export const runtime = "nodejs";  // Required for crypto module
export const maxDuration = 300;   // 5 minutes
```

**Note**: Edge runtime would require rewriting encryption to use Web Crypto API (`crypto.subtle`).
