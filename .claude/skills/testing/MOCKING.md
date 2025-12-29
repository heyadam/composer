# Mocking Strategies

Comprehensive guide to mocking in Composer tests.

## Module Mocking

Mock entire modules before importing:

```typescript
// Must be at top level, before imports
vi.mock("@/lib/flows/api", () => ({
  createFlow: vi.fn(),
  updateFlow: vi.fn(),
  loadFlow: vi.fn(),
}));

// Import after mocking
import { createFlow, updateFlow, loadFlow } from "@/lib/flows/api";

// Type-safe mock references
const mockCreateFlow = vi.mocked(createFlow);
const mockUpdateFlow = vi.mocked(updateFlow);

describe("tests", () => {
  beforeEach(() => {
    // Set up default mock implementations
    mockCreateFlow.mockResolvedValue({ success: true, flow: { id: "123" } });
    mockUpdateFlow.mockResolvedValue({ success: true });
  });
});
```

## Mock with Factory Function

For complex mock objects:

```typescript
vi.mock("@/lib/flow-storage", () => ({
  createSavedFlow: vi.fn((nodes, edges, name) => ({
    nodes,
    edges,
    metadata: {
      name,
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      schemaVersion: 1,
    },
  })),
  downloadFlow: vi.fn(),
  openFlowFilePicker: vi.fn(),
}));
```

## Function Mocking

### Basic Mock Function

```typescript
const mockCallback = vi.fn();

// Call the mock
mockCallback("arg1", "arg2");

// Assertions
expect(mockCallback).toHaveBeenCalled();
expect(mockCallback).toHaveBeenCalledTimes(1);
expect(mockCallback).toHaveBeenCalledWith("arg1", "arg2");
```

### Mock Return Values

```typescript
const mockFn = vi.fn();

// Return specific value
mockFn.mockReturnValue("result");

// Return different values on successive calls
mockFn
  .mockReturnValueOnce("first")
  .mockReturnValueOnce("second")
  .mockReturnValue("default");

// Async return values
mockFn.mockResolvedValue({ data: "async result" });
mockFn.mockRejectedValue(new Error("Failed"));

// Conditional return values
mockFn.mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error("Second call fails"));
```

### Mock Implementation

```typescript
const mockFn = vi.fn().mockImplementation((x) => x * 2);

expect(mockFn(5)).toBe(10);

// Change implementation per test
mockFn.mockImplementation((x) => x + 1);
expect(mockFn(5)).toBe(6);
```

## Spy Functions

Spy on existing methods without replacing them:

```typescript
// Spy on console.error
const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

// Run code that logs errors
doSomethingThatLogs();

// Verify it was called
expect(consoleSpy).toHaveBeenCalledWith("Expected error message");

// Restore original
consoleSpy.mockRestore();
```

### Spy on Object Methods

```typescript
const obj = {
  method: (x: number) => x * 2,
};

const spy = vi.spyOn(obj, "method");

obj.method(5);

expect(spy).toHaveBeenCalledWith(5);
expect(spy).toHaveReturnedWith(10);
```

## Mocking External APIs

### Mock Fetch

```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: "response" }),
  text: async () => "response text",
});

// Or more detailed
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.includes("/api/flows")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ flows: [] }),
    });
  }
  return Promise.reject(new Error("Not found"));
});
```

### Mock Stream Reader

Simplified test helper for mocking `ReadableStreamDefaultReader`. This implements
only the methods needed for testing - not a complete implementation.

```typescript
/**
 * Creates a mock stream reader for testing NDJSON parsing.
 * Note: This is a simplified test helper, not a full implementation.
 * Only implements read(), cancel(), releaseLock(), and closed.
 */
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

// Usage
const reader = createMockReader([
  '{"type":"text","text":"Hello"}\n',
  '{"type":"text","text":" world"}\n',
]);
```

## Mocking React Flow

```typescript
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    getNodes: vi.fn().mockReturnValue([]),
    getEdges: vi.fn().mockReturnValue([]),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    fitView: vi.fn(),
  }),
  useNodesState: vi.fn().mockReturnValue([[], vi.fn(), vi.fn()]),
  useEdgesState: vi.fn().mockReturnValue([[], vi.fn(), vi.fn()]),
}));
```

## Mocking Next.js Router

```typescript
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/current-path",
  useSearchParams: () => new URLSearchParams(),
}));
```

## Mocking Timers

```typescript
describe("timer tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should debounce calls", () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 100);

    debounced();
    debounced();
    debounced();

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should run interval", () => {
    const callback = vi.fn();
    setInterval(callback, 1000);

    vi.advanceTimersByTime(3000);

    expect(callback).toHaveBeenCalledTimes(3);
  });
});
```

## Clearing and Resetting Mocks

```typescript
beforeEach(() => {
  // Clear call history but keep implementation
  vi.clearAllMocks();

  // Or reset to initial state (removes implementations)
  // vi.resetAllMocks();

  // Or restore original implementations
  // vi.restoreAllMocks();
});

// For specific mocks
mockFn.mockClear();  // Clear calls
mockFn.mockReset();  // Clear calls + implementation
mockFn.mockRestore(); // Restore original (for spies)
```

## Mock Assertions

```typescript
// Call count
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(3);
expect(mockFn).not.toHaveBeenCalled();

// Arguments
expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
expect(mockFn).toHaveBeenLastCalledWith("final");
expect(mockFn).toHaveBeenNthCalledWith(1, "first call");

// Partial matching
expect(mockFn).toHaveBeenCalledWith(
  expect.objectContaining({ id: "123" })
);
expect(mockFn).toHaveBeenCalledWith(
  expect.stringContaining("partial")
);

// Return values (for spies)
expect(spy).toHaveReturnedWith("value");
expect(spy).toHaveReturnedTimes(2);
```

## Common Patterns

### Mock Once, Then Default

```typescript
mockFn
  .mockResolvedValueOnce({ special: true })  // First call
  .mockResolvedValue({ special: false });     // All subsequent
```

### Conditional Mocking by Arguments

```typescript
mockFn.mockImplementation((type) => {
  switch (type) {
    case "success":
      return Promise.resolve({ ok: true });
    case "error":
      return Promise.reject(new Error("Failed"));
    default:
      return Promise.resolve({ ok: false });
  }
});
```

### Capture Arguments for Later Assertion

```typescript
const capturedArgs: unknown[] = [];

mockFn.mockImplementation((...args) => {
  capturedArgs.push(args);
  return { success: true };
});

// After running tests
expect(capturedArgs[0]).toEqual(["first", "call"]);
```
