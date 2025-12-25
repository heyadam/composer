# Step 2: React Component

Create the visual component in `components/Flow/nodes/`.

## Checklist

- [ ] Create `YourNode.tsx` component
- [ ] Use `NodeFrame` wrapper for consistent styling
- [ ] Implement `PortRow` for input/output handles
- [ ] Handle connection state for connected inputs
- [ ] Export from `index.ts`
- [ ] Add to `nodeTypes` mapping

## Component Template

```tsx
"use client";

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { YourNodeData } from "@/types/flow";
import { YourIcon } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { cn } from "@/lib/utils";

type YourNodeType = Node<YourNodeData, "your-node-type">;

export function YourNode({ id, data }: NodeProps<YourNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  // Check connection states
  const isInputConnected = edges.some(
    (edge) => edge.target === id && (edge.targetHandle === "input" || !edge.targetHandle)
  );
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<YourIcon className="h-4 w-4" />}
      iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-300"
      accentBorderClassName="border-purple-500"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          input={{ id: "input", label: "String", colorClass: "cyan", isConnected: isInputConnected }}
          output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected }}
        />
      }
      footer={
        data.executionError ? (
          <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
            {data.executionError}
          </p>
        ) : data.executionOutput ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {data.executionOutput}
          </p>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* Your node content here */}
        <textarea
          value={data.yourField || ""}
          onChange={(e) => updateNodeData(id, { yourField: e.target.value })}
          placeholder="Enter value..."
          className={cn(
            "nodrag w-full min-h-[60px] resize-y rounded-md border border-input",
            "bg-background/60 dark:bg-muted/40 px-3 py-2 text-sm",
            "shadow-xs transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          )}
        />
      </div>
    </NodeFrame>
  );
}
```

## Key Patterns

### PortRow Configuration

```tsx
// Input only (like text-input)
<PortRow
  nodeId={id}
  output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected }}
/>

// Output only (like preview-output)
<PortRow
  nodeId={id}
  input={{ id: "input", label: "String", colorClass: "amber", isConnected: isInputConnected }}
/>

// Both input and output
<PortRow
  nodeId={id}
  input={{ id: "prompt", label: "Prompt", colorClass: "cyan", isConnected: isPromptConnected }}
  output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected }}
/>
```

### Color Classes

| Data Type | colorClass |
|-----------|------------|
| String | `"cyan"` |
| Image | `"purple"` |
| Response | `"amber"` |
| Audio | `"emerald"` |

### Port Properties

Each port object accepts these properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Handle ID (must match port schema) |
| `label` | string | Display label |
| `colorClass` | string | Color: `"cyan"`, `"purple"`, `"amber"`, or `"emerald"` |
| `isConnected` | boolean | Whether an edge is connected |
| `required` | boolean | Optional. Shows visual indicator for required inputs |

Example with optional input:
```tsx
<PortRow
  nodeId={id}
  input={{ id: "system", label: "System", colorClass: "cyan", isConnected: isSystemConnected, required: false }}
  output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected }}
/>
```

### InputWithHandle (for connectable inputs)

Use when an input can be either connected or manually entered:

```tsx
import { InputWithHandle } from "./InputWithHandle";

<InputWithHandle
  id="prompt"
  label="User Prompt"
  colorClass="cyan"
  isConnected={isPromptConnected}
>
  <textarea
    value={isPromptConnected ? "" : (data.userPrompt ?? "")}
    onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
    placeholder={isPromptConnected ? "Connected" : "Enter prompt..."}
    disabled={isPromptConnected}
    className={cn(
      "nodrag w-full min-h-[60px]",
      isPromptConnected ? "bg-muted/50 cursor-not-allowed" : "bg-background/60"
    )}
  />
</InputWithHandle>
```

### Connection State Checking

```typescript
const edges = useEdges();

// Check if specific handle is connected (input)
const isPromptConnected = edges.some(
  (edge) => edge.target === id && edge.targetHandle === "prompt"
);

// Check if default/unnamed handle is connected
const isInputConnected = edges.some(
  (edge) => edge.target === id && (edge.targetHandle === "input" || !edge.targetHandle)
);

// Check output connection
const isOutputConnected = edges.some(
  (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
);
```

## Register Component

### 1. Export from index.ts

```typescript
// components/Flow/nodes/index.ts
import type { NodeTypes } from "@xyflow/react";
import { YourNode } from "./YourNode";

export const nodeTypes: NodeTypes = {
  // ...existing types...
  "your-node-type": YourNode,
};

export { YourNode };
```

## NodeFrame Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | string | Yes | Editable node title |
| `onTitleChange` | (title: string) => void | No | Title change handler |
| `icon` | ReactNode | Yes | lucide-react icon |
| `iconClassName` | string | Yes | Icon background/color |
| `accentBorderClassName` | string | Yes | Border color class |
| `status` | ExecutionStatus | No | running/success/error |
| `className` | string | No | Additional classes |
| `ports` | ReactNode | No | PortRow components |
| `children` | ReactNode | No | Main node content |
| `footer` | ReactNode | No | Execution output area |

## Real-World Examples

Study these existing node implementations for reference:

- **Simple input**: `InputNode.tsx` - Basic input with single output
- **Simple output**: `OutputNode.tsx` - Terminal node with footer rendering
- **Processing with AI**: `PromptNode.tsx` - Multiple inputs, provider/model selection, streaming
- **Complex logic**: `MagicNode.tsx` - Code generation, collapsible sections, validation

## Validation

After completing this step, verify:
- [ ] Component renders without errors
- [ ] Port handles appear correctly
- [ ] Edges can connect to handles
- [ ] Input fields update node data
- [ ] Status badge shows during execution
