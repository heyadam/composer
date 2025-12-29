# Test Templates

Copy-paste templates for common test scenarios.

## Hook Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMyHook } from "../useMyHook";

// Mock dependencies
vi.mock("@/lib/some-module", () => ({
  someFunction: vi.fn(),
}));

import { someFunction } from "@/lib/some-module";
const mockSomeFunction = vi.mocked(someFunction);

describe("useMyHook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSomeFunction.mockResolvedValue({ success: true });
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useMyHook());

    expect(result.current.value).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it("should update state on action", async () => {
    const { result } = renderHook(() => useMyHook());

    await act(async () => {
      await result.current.doSomething();
    });

    expect(result.current.value).toBe("expected");
  });

  it("should handle errors", async () => {
    mockSomeFunction.mockRejectedValue(new Error("Failed"));

    const { result } = renderHook(() => useMyHook());

    await act(async () => {
      await result.current.doSomething();
    });

    expect(result.current.error).toBe("Failed");
  });
});
```

## Node Executor Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { myNodeExecutor } from "../executors/my-node";
import type { Node } from "@xyflow/react";
import type { ExecutionContext } from "@/lib/execution/types";

function createNode(
  id: string,
  data: Record<string, unknown> = {}
): Node {
  return {
    id,
    type: "my-node",
    position: { x: 0, y: 0 },
    data: { label: "Test Node", ...data },
  };
}

function createContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext {
  return {
    node: createNode("test-node"),
    inputs: {},
    context: {},
    ...overrides,
  };
}

describe("my-node executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return output from node data", async () => {
    const ctx = createContext({
      node: createNode("node-1", { inputValue: "test" }),
    });

    const result = await myNodeExecutor.execute(ctx);

    expect(result.output).toBe("test");
  });

  it("should use inputs when provided", async () => {
    const ctx = createContext({
      node: createNode("node-1"),
      inputs: { prompt: "input value" },
    });

    const result = await myNodeExecutor.execute(ctx);

    expect(result.output).toContain("input value");
  });

  it("should store value in context", async () => {
    const context: Record<string, unknown> = {};
    const ctx = createContext({
      node: createNode("node-1", { inputValue: "stored" }),
      context,
    });

    await myNodeExecutor.execute(ctx);

    expect(context["myNode_node-1"]).toBe("stored");
  });
});
```

## Cache Test Template

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { CacheManager } from "../cache-manager";
import type { Node, Edge } from "@xyflow/react";

function createNode(id: string, type: string, data = {}): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: `Test ${type}`, cacheable: true, ...data },
  };
}

function createEdge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    sourceHandle: "output",
    target,
    targetHandle: "input",
  };
}

describe("CacheManager", () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  describe("basic operations", () => {
    it("should return null for cache miss", () => {
      const node = createNode("node1", "text-generation");
      expect(cache.get("node1", node, [], {})).toBeNull();
    });

    it("should return cached result on hit", () => {
      const node = createNode("node1", "text-generation");
      const result = { output: "cached" };

      cache.set("node1", node, [], {}, result);

      expect(cache.get("node1", node, [], {})).toEqual(result);
    });
  });

  describe("invalidation", () => {
    it("should invalidate when config changes", () => {
      const node = createNode("node1", "text-generation", { prompt: "v1" });
      cache.set("node1", node, [], {}, { output: "result" });

      const modified = createNode("node1", "text-generation", { prompt: "v2" });
      expect(cache.get("node1", modified, [], {})).toBeNull();
    });
  });
});
```

## Stream Parser Test Template

```typescript
import { describe, it, expect, vi } from "vitest";
import { parseStream } from "../stream-parser";

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
      return { done: false, value: encoder.encode(chunks[index++]) };
    },
    cancel: async () => {},
    releaseLock: () => {},
    closed: Promise.resolve(undefined),
  } as ReadableStreamDefaultReader<Uint8Array>;
}

describe("parseStream", () => {
  it("should parse complete chunks", async () => {
    const chunks = ['{"text":"Hello"}\n', '{"text":" world"}\n'];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseStream(reader, onChunk);

    expect(result.output).toBe("Hello world");
    expect(onChunk).toHaveBeenCalledTimes(2);
  });

  it("should buffer partial chunks", async () => {
    const chunks = ['{"text":"Hel', 'lo"}\n'];
    const reader = createMockReader(chunks);

    const result = await parseStream(reader, vi.fn());

    expect(result.output).toBe("Hello");
  });

  it("should handle errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const chunks = ["invalid json\n"];
    const reader = createMockReader(chunks);

    await parseStream(reader, vi.fn());

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
```

## API Route Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

// Mock external dependencies
vi.mock("@/lib/ai-client", () => ({
  generateText: vi.fn(),
}));

import { generateText } from "@/lib/ai-client";
const mockGenerateText = vi.mocked(generateText);

describe("POST /api/my-route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockResolvedValue({ text: "response" });
  });

  it("should return 200 on success", async () => {
    const request = new Request("http://localhost/api/my-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.text).toBe("response");
  });

  it("should return 400 for missing prompt", async () => {
    const request = new Request("http://localhost/api/my-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("should return 500 on API error", async () => {
    mockGenerateText.mockRejectedValue(new Error("API Error"));

    const request = new Request("http://localhost/api/my-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "test" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
```

## Component Test Template

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MyComponent } from "../MyComponent";

// Mock hooks if needed
vi.mock("@/lib/hooks/useMyHook", () => ({
  useMyHook: () => ({
    value: "mocked",
    setValue: vi.fn(),
  }),
}));

describe("MyComponent", () => {
  it("should render with default props", () => {
    render(<MyComponent />);

    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  it("should handle click events", async () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should update on input change", async () => {
    render(<MyComponent />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "new value" } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("new value")).toBeInTheDocument();
    });
  });

  it("should show loading state", () => {
    render(<MyComponent isLoading />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
```

## Test Data Builders Template

```typescript
import type { Node, Edge } from "@xyflow/react";

// Node builder
export function createNode(
  id: string,
  type: string,
  data: Record<string, unknown> = {},
  position = { x: 0, y: 0 }
): Node {
  return {
    id,
    type,
    position,
    data: { label: `Test ${type}`, ...data },
  };
}

// Edge builder
export function createEdge(
  source: string,
  target: string,
  sourceHandle = "output",
  targetHandle = "input"
): Edge {
  return {
    id: `${source}-${target}`,
    source,
    sourceHandle,
    target,
    targetHandle,
  };
}

// Flow builder (nodes + edges)
export function createFlow(config: {
  inputs?: string[];
  processors?: string[];
  outputs?: string[];
}) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  config.inputs?.forEach((id) => {
    nodes.push(createNode(id, "text-input", { inputValue: "" }));
  });

  config.processors?.forEach((id, i) => {
    nodes.push(createNode(id, "text-generation", { userPrompt: "" }));
    if (config.inputs?.[0]) {
      edges.push(createEdge(config.inputs[0], id));
    }
  });

  config.outputs?.forEach((id) => {
    nodes.push(createNode(id, "preview-output"));
    if (config.processors?.[0]) {
      edges.push(createEdge(config.processors[0], id));
    }
  });

  return { nodes, edges };
}

// Usage (createNode and createEdge defined above)
const { nodes, edges } = createFlow({
  inputs: ["input-1"],
  processors: ["gen-1", "gen-2"],
  outputs: ["output-1"],
});
```

## Best Practices

### When to Use `mockResolvedValue` vs `mockImplementation`

```typescript
// Use mockResolvedValue for simple return values
mockFn.mockResolvedValue({ data: "result" });

// Use mockImplementation when you need:
// - Conditional logic based on arguments
// - Side effects
// - Complex async behavior
mockFn.mockImplementation((id) => {
  if (id === "special") return Promise.resolve({ special: true });
  return Promise.resolve({ special: false });
});
```

### Avoid Testing Implementation Details

```typescript
// ❌ Bad - testing internal state
expect(hook.internalCache.size).toBe(3);

// ✅ Good - testing behavior
expect(hook.getCachedValue("key")).toBe("value");
```

### When to Use Integration vs Unit Tests

| Use Unit Tests For | Use Integration Tests For |
|-------------------|--------------------------|
| Pure functions | Full flow execution |
| Individual hooks | Multi-node interactions |
| Single executors | Cache + execution together |
| Edge cases | Happy path end-to-end |
