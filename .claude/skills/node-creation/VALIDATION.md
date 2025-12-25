# Step 6: Validation Checklist

Complete validation before considering the node done.

## Build Validation

- [ ] `npm run lint` passes without errors
- [ ] `npm run build` completes successfully
- [ ] `npm test` passes (all tests)

## Unit Testing (Optional)

For complex nodes, consider adding unit tests in `lib/hooks/__tests__/`:

**Test patterns to follow:**
- `useFlowExecution.test.ts` - Tests for execution behavior
- `useAutopilotIntegration.test.ts` - Tests for autopilot actions

**What to test:**
- Execution logic returns correct output for given inputs
- Error handling produces appropriate error messages
- Streaming callbacks are invoked correctly
- Node data updates propagate properly

**Example test structure:**
```typescript
import { describe, it, expect, vi } from "vitest";

describe("your-node-type execution", () => {
  it("should transform input correctly", async () => {
    const node = { type: "your-node-type", data: { config: "value" } };
    const inputs = { input: "test" };
    const result = await executeNode(node, inputs, {});
    expect(result.output).toBe("expected output");
  });
});
```

## Visual Validation

- [ ] Node renders correctly on canvas
- [ ] NodeFrame styling is consistent with other nodes
- [ ] Status badge shows running/success/error states
- [ ] Port handles display with correct colors
- [ ] Icon is visible in node header
- [ ] Node appears in sidebar with correct icon and description

## Connection Validation

- [ ] Edges can connect to input handles
- [ ] Edges can connect from output handles
- [ ] Connected inputs show "Connected" placeholder (if using InputWithHandle)
- [ ] Disconnecting edge restores input field
- [ ] Edge colors match data type (cyan/purple/amber/emerald)

## Execution Validation

- [ ] Node executes when flow runs
- [ ] Input data is received from connected nodes
- [ ] Output data passes to downstream nodes
- [ ] Error states display correctly in footer
- [ ] Streaming updates appear in real-time (if applicable)
- [ ] Cancel button stops execution

## Autopilot Validation

- [ ] Autopilot can create the node via chat command
- [ ] Autopilot sets correct default values
- [ ] Autopilot connects edges with correct targetHandle
- [ ] Validation catches invalid configurations
- [ ] Error messages are helpful

## Persistence Validation

- [ ] Node saves correctly to JSON (File > Save)
- [ ] Node loads correctly from JSON (File > Open)
- [ ] Flow file validates schema
- [ ] Cloud save/load works for authenticated users

## Edge Cases

- [ ] Empty inputs handled gracefully
- [ ] API errors display user-friendly messages
- [ ] Cancellation during execution works
- [ ] Multiple instances work independently
- [ ] Very long text displays correctly (truncation/scroll)
- [ ] Node works in collaborator mode (live flows)

## Owner-Funded Execution (if API calls)

- [ ] Works with `shareToken` in execution options
- [ ] Rate limiting respects per-flow limits
- [ ] API key retrieval works server-side

## Common Issues

### TypeScript Errors

**"Property 'X' does not exist on type 'AgentNodeData'"**
- Add your data interface to the `AgentNodeData` union in `types/flow.ts`

**"Type 'X' is not assignable to type 'NodeType'"**
- Add your node type to the `NodeType` union in `types/flow.ts`

### Runtime Errors

**Node doesn't appear in sidebar**
- Check `nodeDefinitions` in `types/flow.ts`
- Verify icon mapping in `NodeSidebar.tsx`

**Execution doesn't work**
- Verify switch case in `lib/execution/engine.ts`
- Check that node type string matches exactly

**Autopilot can't create node**
- Add to `VALID_NODE_TYPES` in `lib/autopilot/config.ts`
- Add to `NODE_REQUIRED_FIELDS`

### Styling Issues

**Node width inconsistent**
- Use `className="w-[280px]"` on NodeFrame

**Port colors wrong**
- Verify `colorClass` matches data type: `"cyan"` for string, `"purple"` for image, `"amber"` for response, `"emerald"` for audio

## Final Checklist

Before marking complete:

- [ ] All validation sections above pass
- [ ] No console errors/warnings
- [ ] Node integrates naturally with existing flow patterns
- [ ] Documentation in system-prompt.ts is accurate
