# Testing Execution Engine

Patterns for testing node executors and the execution engine.

## Testing Node Executors

Each node type has an executor that transforms inputs to outputs.

### Basic Executor Test

```typescript
import { describe, it, expect } from "vitest";
import { textInputExecutor } from "../executors/text-input";

function createMockContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext {
  return {
    node: {
      id: "test-node",
      type: "test",
      position: { x: 0, y: 0 },
      data: {},
    } as Node,
    inputs: {},
    context: {},
    ...overrides,
  };
}

describe("text-input executor", () => {
  it("returns inputValue from node data", async () => {
    const ctx = createMockContext({
      node: {
        id: "text-1",
        type: "text-input",
        position: { x: 0, y: 0 },
        data: { inputValue: "Hello, world!" },
      } as Node,
    });

    const result = await textInputExecutor.execute(ctx);

    expect(result.output).toBe("Hello, world!");
  });

  it("returns empty string when no input", async () => {
    const ctx = createMockContext({
      node: {
        id: "text-1",
        type: "text-input",
        position: { x: 0, y: 0 },
        data: {},
      } as Node,
    });

    const result = await textInputExecutor.execute(ctx);

    expect(result.output).toBe("");
  });
});
```

### Testing Executor with Inputs

```typescript
describe("text-generation executor", () => {
  it("uses prompt from inputs", async () => {
    const ctx = createMockContext({
      node: createNode("gen-1", "text-generation", {
        userPrompt: "Summarize: {{prompt}}",
      }),
      inputs: {
        prompt: "Long text to summarize...",
      },
    });

    // Mock the API call
    vi.mocked(callTextGeneration).mockResolvedValue({
      output: "Summary result",
    });

    const result = await textGenerationExecutor.execute(ctx);

    expect(callTextGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Summarize: Long text to summarize...",
      })
    );
    expect(result.output).toBe("Summary result");
  });
});
```

### Testing Context Storage

Executors can store values in the shared context:

```typescript
it("stores input in context for later use", async () => {
  const context: Record<string, unknown> = {};

  const ctx = createMockContext({
    node: createNode("text-1", "text-input", {
      inputValue: "stored value"
    }),
    context,
  });

  await textInputExecutor.execute(ctx);

  expect(context["userInput_text-1"]).toBe("stored value");
});
```

### Testing Executor Metadata

```typescript
describe("executor metadata", () => {
  it("text-generation has pulse output", () => {
    expect(textGenerationExecutor.hasPulseOutput).toBe(true);
  });

  it("text-generation tracks downstream", () => {
    expect(textGenerationExecutor.shouldTrackDownstream).toBe(true);
  });

  it("text-input does not have pulse output", () => {
    expect(textInputExecutor.hasPulseOutput).toBeUndefined();
  });
});
```

## Testing Executor Registry

```typescript
import {
  registerExecutor,
  getExecutor,
  clearExecutors
} from "../executor-registry";

describe("executor-registry", () => {
  beforeEach(() => {
    clearExecutors();
  });

  it("registers and retrieves executor", () => {
    const executor: NodeExecutor = {
      type: "custom-node",
      execute: async () => ({ output: "test" }),
    };

    registerExecutor(executor);

    expect(getExecutor("custom-node")).toBe(executor);
  });

  it("throws on duplicate registration", () => {
    const executor: NodeExecutor = {
      type: "duplicate",
      execute: async () => ({ output: "test" }),
    };

    registerExecutor(executor);

    expect(() => registerExecutor(executor)).toThrow(
      'Executor for type "duplicate" is already registered'
    );
  });

  it("returns undefined for unknown type", () => {
    expect(getExecutor("unknown")).toBeUndefined();
  });
});
```

## Testing Stream Parsing

```typescript
function createMockReader(
  chunks: string[]
): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return {
    read: async () => {
      if (index >= chunks.length) {
        return { done: true, value: undefined };
      }
      const chunk = chunks[index++];
      return { done: false, value: encoder.encode(chunk) };
    },
    cancel: async () => {},
    releaseLock: () => {},
    closed: Promise.resolve(undefined),
  } as ReadableStreamDefaultReader<Uint8Array>;
}

describe("parseNdjsonStream", () => {
  it("parses complete NDJSON lines", async () => {
    const chunks = [
      '{"type":"text","text":"Hello"}\n',
      '{"type":"text","text":" world"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseNdjsonStream(reader, onChunk);

    expect(result.output).toBe("Hello world");
    expect(onChunk).toHaveBeenCalledTimes(2);
  });

  it("buffers incomplete lines across chunks", async () => {
    const chunks = [
      '{"type":"text","tex',  // Incomplete
      't":"complete"}\n',     // Rest of line
    ];
    const reader = createMockReader(chunks);

    const result = await parseNdjsonStream(reader, vi.fn());

    expect(result.output).toBe("complete");
  });

  it("handles malformed JSON gracefully", async () => {
    const consoleError = vi.spyOn(console, "error")
      .mockImplementation(() => {});

    const chunks = [
      '{"type":"text","text":"Good"}\n',
      'invalid json\n',
    ];
    const reader = createMockReader(chunks);

    await parseNdjsonStream(reader, vi.fn());

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
```

## Testing Cache Manager

```typescript
import { CacheManager } from "../cache-manager";

describe("CacheManager", () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  it("returns null for cache miss", () => {
    const node = createNode("node1", "text-generation", { cacheable: true });

    const result = cache.get("node1", node, [], {});

    expect(result).toBeNull();
  });

  it("returns cached result on hit", () => {
    const node = createNode("node1", "text-generation", { cacheable: true });
    const result = { output: "cached output" };

    cache.set("node1", node, [], {}, result);
    const cached = cache.get("node1", node, [], {});

    expect(cached).toEqual(result);
  });

  it("invalidates when config changes", () => {
    const node = createNode("node1", "text-generation", {
      cacheable: true,
      userPrompt: "original"
    });
    cache.set("node1", node, [], {}, { output: "result" });

    // Change the prompt
    const modifiedNode = createNode("node1", "text-generation", {
      cacheable: true,
      userPrompt: "modified",
    });

    expect(cache.get("node1", modifiedNode, [], {})).toBeNull();
  });

  describe("invalidateDownstream", () => {
    it("removes node and all downstream nodes", () => {
      const edges = [
        createEdge("node1", "node2"),
        createEdge("node2", "node3"),
      ];

      // Cache all nodes
      cache.set("node1", createNode("node1", "text-input"), edges, {}, { output: "1" });
      cache.set("node2", createNode("node2", "text-generation"), edges, {}, { output: "2" });
      cache.set("node3", createNode("node3", "preview-output"), edges, {}, { output: "3" });

      cache.invalidateDownstream("node2", edges);

      expect(cache.has("node1")).toBe(true);   // Upstream preserved
      expect(cache.has("node2")).toBe(false);  // Invalidated
      expect(cache.has("node3")).toBe(false);  // Downstream invalidated
    });
  });
});
```

## Testing Graph Utilities

```typescript
describe("graph-utils", () => {
  describe("getTopologicalOrder", () => {
    it("returns nodes in execution order", () => {
      const nodes = [
        createNode("a", "text-input"),
        createNode("b", "text-generation"),
        createNode("c", "preview-output"),
      ];
      const edges = [
        createEdge("a", "b"),
        createEdge("b", "c"),
      ];

      const order = getTopologicalOrder(nodes, edges);

      expect(order).toEqual(["a", "b", "c"]);
    });

    it("handles parallel branches", () => {
      const nodes = [
        createNode("input", "text-input"),
        createNode("branch1", "text-generation"),
        createNode("branch2", "text-generation"),
        createNode("output", "preview-output"),
      ];
      const edges = [
        createEdge("input", "branch1"),
        createEdge("input", "branch2"),
        createEdge("branch1", "output"),
        createEdge("branch2", "output"),
      ];

      const order = getTopologicalOrder(nodes, edges);

      // Input must come first, output must come last
      expect(order[0]).toBe("input");
      expect(order[order.length - 1]).toBe("output");
    });
  });
});
```

## Integration Test Example

```typescript
describe("executor integration", () => {
  it("executes a simple flow end-to-end", async () => {
    const nodes = [
      createNode("input", "text-input", { inputValue: "Hello" }),
      createNode("gen", "text-generation", {
        userPrompt: "Echo: {{prompt}}"
      }),
    ];
    const edges = [createEdge("input", "gen", "output", "input")];

    // Mock the AI API
    vi.mocked(callTextGeneration).mockResolvedValue({
      output: "Echo: Hello",
    });

    const results = await executeFlow(nodes, edges, { openai: "key" });

    expect(results["input"].output).toBe("Hello");
    expect(results["gen"].output).toBe("Echo: Hello");
  });
});
```
