# Testing Patterns

Core patterns used throughout the Composer test suite.

## 1. Test Structure (AAA Pattern)

Arrange-Act-Assert for clear test organization:

```typescript
it("should update state when action is called", () => {
  // Arrange - Set up test data and dependencies
  const initialState = { count: 0 };
  const { result } = renderHook(() => useCounter(initialState));

  // Act - Perform the action being tested
  act(() => {
    result.current.increment();
  });

  // Assert - Verify the expected outcome
  expect(result.current.count).toBe(1);
});
```

## 2. Data Builders

Create helper functions for complex test data:

```typescript
function createNode(
  id: string,
  type: string,
  data: Record<string, unknown> = {}
): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: `Test ${type}`, ...data },
  };
}

function createEdge(
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

// Usage
const node = createNode("node1", "text-generation", { cacheable: true });
const edge = createEdge("input1", "node1");
```

**Benefits:**
- Consistent test data structure
- Easy customization via parameters
- Reduces boilerplate
- Single source of truth

## 3. Context Builders

For execution-related tests, build context objects:

```typescript
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

// Usage
const ctx = createMockContext({
  node: createNode("text-1", "text-input", { inputValue: "Hello" }),
  inputs: { prompt: "test prompt" },
});
```

## 4. Test Isolation

Always reset state between tests:

```typescript
describe("MyFeature", () => {
  const mockFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();  // Clear call history
    // Reset any shared state
  });

  afterEach(() => {
    // Clean up side effects if needed
  });

  it("test 1", () => {});
  it("test 2", () => {});  // Won't be affected by test 1
});
```

## 5. Async Testing

Handle async operations properly:

```typescript
// Using async/await
it("should fetch data", async () => {
  const { result } = renderHook(() => useFetchData());

  await act(async () => {
    await result.current.fetchData();
  });

  expect(result.current.data).toBeDefined();
});

// Using waitFor for polling/eventual consistency
it("should eventually update", async () => {
  const { result } = renderHook(() => useAsyncState());

  act(() => {
    result.current.startLoading();
  });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
});
```

## 6. Error Testing

Test error conditions explicitly:

```typescript
it("should throw on invalid input", () => {
  expect(() => {
    processData(null);
  }).toThrow("Input cannot be null");
});

it("should reject with error", async () => {
  mockApi.mockRejectedValue(new Error("Network error"));

  const { result } = renderHook(() => useApi());

  await act(async () => {
    await result.current.fetch();
  });

  expect(result.current.error).toBe("Network error");
});
```

## 7. Parameterized Tests

Test multiple cases efficiently:

```typescript
describe.each([
  { input: "", expected: false },
  { input: "valid", expected: true },
  { input: "   ", expected: false },
])("isValid($input)", ({ input, expected }) => {
  it(`returns ${expected}`, () => {
    expect(isValid(input)).toBe(expected);
  });
});
```

## 8. Testing Callbacks

Verify callbacks are called correctly:

```typescript
it("should call onChange with new value", () => {
  const onChange = vi.fn();
  const { result } = renderHook(() => useInput({ onChange }));

  act(() => {
    result.current.setValue("new value");
  });

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith("new value");
});
```

## 9. Testing State Updates

Verify updater functions work correctly:

```typescript
it("should update nodes via updater function", () => {
  const setNodes = vi.fn();
  const { result } = renderHook(() => useNodeUpdater({ setNodes }));

  act(() => {
    result.current.updateNode("node1", { label: "New Label" });
  });

  // Verify the updater function was called
  const updateFn = setNodes.mock.calls[0][0];

  // Test the updater with sample data
  const oldNodes = [createNode("node1", "text-input")];
  const newNodes = updateFn(oldNodes);

  expect(newNodes[0].data.label).toBe("New Label");
});
```

## 10. Snapshot Testing (Use Sparingly)

For complex output that's hard to assert manually:

```typescript
it("should render correctly", () => {
  const { container } = render(<ComplexComponent />);
  expect(container).toMatchSnapshot();
});
```

**Caution:** Snapshots can become brittle. Prefer explicit assertions.
