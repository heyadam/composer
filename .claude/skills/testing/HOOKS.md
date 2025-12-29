# Testing Hooks

Patterns for testing custom React hooks in Composer.

## Basic Hook Test

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMyHook } from "../useMyHook";

describe("useMyHook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useMyHook());

    expect(result.current.value).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });
});
```

## Testing Hooks with Props

```typescript
it("should use initial value from props", () => {
  const { result } = renderHook(() =>
    useMyHook({ initialValue: "test" })
  );

  expect(result.current.value).toBe("test");
});

// Test prop changes with rerender
it("should update when props change", () => {
  const { result, rerender } = renderHook(
    ({ value }) => useMyHook({ value }),
    { initialProps: { value: "initial" } }
  );

  expect(result.current.value).toBe("initial");

  rerender({ value: "updated" });

  expect(result.current.value).toBe("updated");
});
```

## Testing State Updates

```typescript
it("should update state when action is called", () => {
  const { result } = renderHook(() => useCounter());

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

**Important:** Always wrap state updates in `act()`.

## Testing Async Hooks

```typescript
it("should handle async operations", async () => {
  const mockFetch = vi.fn().mockResolvedValue({ data: "result" });

  const { result } = renderHook(() =>
    useDataFetcher({ fetch: mockFetch })
  );

  expect(result.current.isLoading).toBe(false);

  await act(async () => {
    await result.current.loadData();
  });

  expect(result.current.data).toBe("result");
  expect(result.current.isLoading).toBe(false);
});

// Using waitFor for eventual consistency
it("should eventually complete", async () => {
  const { result } = renderHook(() => useAsyncHook());

  act(() => {
    result.current.startProcess();
  });

  await waitFor(() => {
    expect(result.current.isComplete).toBe(true);
  });
});
```

## Testing Hooks with Dependencies

```typescript
// Mock the dependency module
vi.mock("@/lib/flows/api", () => ({
  createFlow: vi.fn(),
  updateFlow: vi.fn(),
}));

import { createFlow, updateFlow } from "@/lib/flows/api";

const mockCreateFlow = vi.mocked(createFlow);
const mockUpdateFlow = vi.mocked(updateFlow);

describe("useFlowOperations", () => {
  beforeEach(() => {
    mockCreateFlow.mockResolvedValue({ success: true, flow: { id: "123" } });
    mockUpdateFlow.mockResolvedValue({ success: true });
  });

  it("should create flow", async () => {
    const { result } = renderHook(() => useFlowOperations());

    await act(async () => {
      await result.current.saveFlow(nodes, edges, "My Flow");
    });

    expect(mockCreateFlow).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My Flow" })
    );
  });
});
```

## Testing Hooks with Context

```typescript
import { ReactNode } from "react";

// Create a wrapper with providers
const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <FlowProvider>
      {children}
    </FlowProvider>
  </AuthProvider>
);

it("should access context values", () => {
  const { result } = renderHook(
    () => useFlowContext(),
    { wrapper }
  );

  expect(result.current.nodes).toBeDefined();
});
```

## Real Example: useFlowExecution

```typescript
describe("useFlowExecution", () => {
  const mockSetNodes = vi.fn();
  const mockHasRequiredKey = vi.fn().mockReturnValue(true);

  const defaultNodes: Node[] = [
    createNode("text-1", "text-input", { inputValue: "Hello" }),
    createNode("gen-1", "text-generation", { userPrompt: "Test" }),
  ];

  const defaultEdges: Edge[] = [
    createEdge("text-1", "gen-1", "output", "prompt"),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: {},
        hasRequiredKey: mockHasRequiredKey,
        setNodes: mockSetNodes,
      })
    );

    expect(result.current.isRunning).toBe(false);
    expect(result.current.previewEntries).toEqual([]);
  });

  it("should set isRunning during execution", async () => {
    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: { openai: "test-key" },
        hasRequiredKey: mockHasRequiredKey,
        setNodes: mockSetNodes,
      })
    );

    // Track isRunning changes
    const runningStates: boolean[] = [];

    await act(async () => {
      runningStates.push(result.current.isRunning);
      await result.current.runFlow();
      runningStates.push(result.current.isRunning);
    });

    // Should have been true during execution
    expect(runningStates).toContain(true);
    // Should be false after completion
    expect(result.current.isRunning).toBe(false);
  });
});
```

## Testing Hook Cleanup

```typescript
it("should cleanup on unmount", () => {
  const cleanup = vi.fn();
  vi.spyOn(global, "clearInterval");

  const { unmount } = renderHook(() => useInterval(callback, 1000));

  unmount();

  expect(clearInterval).toHaveBeenCalled();
});
```

## Common Pitfalls

### 1. Forgetting act()
```typescript
// ❌ Wrong - state update outside act()
result.current.setValue("new");

// ✅ Correct
act(() => {
  result.current.setValue("new");
});
```

### 2. Not awaiting async act()
```typescript
// ❌ Wrong - not awaiting
act(async () => {
  await result.current.fetchData();
});

// ✅ Correct
await act(async () => {
  await result.current.fetchData();
});
```

### 3. Accessing stale result
```typescript
// ❌ Wrong - result is stale after act()
const value = result.current.value;
act(() => { result.current.increment(); });
expect(value).toBe(1); // Still 0!

// ✅ Correct - access after act()
act(() => { result.current.increment(); });
expect(result.current.value).toBe(1);
```
