# Test Setup

Configuration and environment for running tests in Composer.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run specific test file
npx vitest run lib/hooks/__tests__/useFlowExecution.test.ts

# Run tests matching a pattern
npx vitest run -t "should handle"
```

## Configuration

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",     // Browser-like environment
    globals: true,            // No need to import describe, it, expect
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),  // @ maps to project root
    },
  },
});
```

### vitest.setup.ts

Global setup that runs before all tests. Add global mocks or polyfills here.

## Test File Naming

- Use `.test.ts` or `.test.tsx` suffix
- Place in `__tests__` directory adjacent to source
- Name should match the module being tested

```
useFlowExecution.ts         # Source
__tests__/
  useFlowExecution.test.ts  # Test
```

## Global Test Functions

These are available globally (no import needed):

```typescript
describe("group name", () => {});
it("should do something", () => {});
expect(value).toBe(expected);
beforeEach(() => {});
afterEach(() => {});
beforeAll(() => {});
afterAll(() => {});
```

## Vitest Utilities

Import from `vitest`:

```typescript
import { vi } from "vitest";

vi.fn()              // Create mock function
vi.mock("module")    // Mock entire module
vi.spyOn(obj, "method")  // Spy on method
vi.mocked(fn)        // Type-safe mock cast
vi.clearAllMocks()   // Clear all mock state
vi.resetAllMocks()   // Reset all mocks to initial state
```

## React Testing Library

Import from `@testing-library/react`:

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";

// Component testing
render(<Component />);
screen.getByText("text");
fireEvent.click(element);

// Hook testing
const { result } = renderHook(() => useMyHook());
act(() => { result.current.doSomething(); });
await waitFor(() => expect(result.current.value).toBe(expected));
```

## Path Aliases

Use `@/` prefix for absolute imports in tests:

```typescript
import { useFlowExecution } from "@/lib/hooks/useFlowExecution";
import { executeFlow } from "@/lib/execution/engine";
```

## Debugging Tests

```typescript
// Log current state
console.log(result.current);

// Pause test execution (in watch mode)
// ⚠️ WARNING: Remove before committing - will timeout CI!
await new Promise(resolve => setTimeout(resolve, 1000000));

// Use test.only to run single test
it.only("should do something", () => {});

// Skip a test
it.skip("broken test", () => {});
```

## Code Coverage

```bash
# Run tests with coverage report
npx vitest run --coverage

# Run coverage in watch mode
npx vitest --coverage
```

Coverage report shows which lines, branches, and functions are untested. Focus on:
- Critical paths (execution engine, cache invalidation)
- Error handling branches
- Edge cases in graph utilities

## Real Test Examples

See actual tests for reference patterns:
- Hooks: `lib/hooks/__tests__/useFlowExecution.test.ts`
- Execution: `lib/execution/__tests__/executors.test.ts`
- Caching: `lib/execution/cache/__tests__/cache-manager.test.ts`
- Streaming: `lib/execution/__tests__/streaming.test.ts`
