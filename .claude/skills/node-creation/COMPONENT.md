# Step 2: React Component

Create the visual component in `components/Flow/nodes/`.

## Checklist

- [ ] Create `YourNode.tsx` component
- [ ] Use `NodeFrame` wrapper with `accentColor` prop
- [ ] Use `useEdgeConnections` hook for connection state
- [ ] Implement `PortRow` for input/output handles
- [ ] Use `NodeFooter` for execution output display
- [ ] Add `CacheToggle` if node is cacheable (processing nodes)
- [ ] Export from `index.ts`
- [ ] Add to `nodeTypes` mapping

## Component Template

```tsx
"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { YourNodeData } from "@/types/flow";
import { YourIcon } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { NodeFooter } from "./NodeFooter";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type YourNodeType = Node<YourNodeData, "your-node-type">;

export function YourNode({ id, data }: NodeProps<YourNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<YourIcon />}
      accentColor="cyan"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          input={{ id: "input", label: "String", colorClass: "cyan", isConnected: isInputConnected("input", true) }}
          output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
        />
      }
      footer={<NodeFooter error={data.executionError} output={data.executionOutput} />}
    >
      <div className="space-y-3">
        {/* Your node content here */}
        <textarea
          value={data.yourField || ""}
          onChange={(e) => updateNodeData(id, { yourField: e.target.value })}
          placeholder="Enter value..."
          className="nodrag node-input min-h-[60px] resize-y"
        />
      </div>
    </NodeFrame>
  );
}
```

## Shared Hooks

### useEdgeConnections

Centralizes edge connection checking, replacing repeated `edges.some()` calls:

```typescript
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

// Check if "prompt" handle is connected (or default handle if fallbackToDefault=true)
const promptConnected = isInputConnected("prompt", true);

// Check if "done" handle is connected (exact match only)
const doneConnected = isOutputConnected("done");
```

**Before (old pattern):**
```typescript
const edges = useEdges();
const isPromptConnected = edges.some(
  (edge) => edge.target === id && (edge.targetHandle === "prompt" || !edge.targetHandle)
);
```

**After (new pattern):**
```typescript
const { isInputConnected } = useEdgeConnections(id);
const isPromptConnected = isInputConnected("prompt", true);
```

### useImageFileInput

For nodes that handle image file uploads (ImageInputNode, PromptNode):

```typescript
import { useImageFileInput } from "@/lib/hooks/useImageFileInput";

const { fileInputRef, handleFileChange, handleClear, triggerFileSelect } = useImageFileInput({
  nodeId: id,
  dataKey: "uploadedImage",
  onImageAdded: (imageData) => {
    // Optional: Switch to vision model when image is added
  },
});

// In JSX:
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  onChange={handleFileChange}
  className="hidden"
/>
<button onClick={triggerFileSelect}>Upload</button>
<button onClick={handleClear}>Clear</button>
```

## Shared Components

### NodeFooter

Standardized footer for execution output. Handles errors, text output, reasoning, images, and audio:

```tsx
import { NodeFooter } from "./NodeFooter";

// Simple text output
<NodeFooter error={data.executionError} output={data.executionOutput} />

// With reasoning (for models with thinking/chain-of-thought)
<NodeFooter
  error={data.executionError}
  output={data.executionOutput}
  reasoning={data.executionReasoning}
/>

// With image output
<NodeFooter error={data.executionError} imageOutput={data.executionOutput} />

// With audio output
<NodeFooter error={data.executionError} audioOutput={data.executionOutput} />

// With custom content
<NodeFooter error={data.executionError}>
  <CustomOutputDisplay data={data} />
</NodeFooter>
```

### CacheToggle

For processing nodes that support incremental caching:

```tsx
import { CacheToggle } from "./CacheToggle";

// In node body, typically at the bottom
<CacheToggle
  nodeId={id}
  checked={data.cacheable ?? false}
  className="pt-2 border-t border-white/[0.06]"
/>
```

### ImageClearButton

Hover-reveal clear button for image previews:

```tsx
import { ImageClearButton } from "./ImageClearButton";

// Parent must have `group` class for hover reveal
<div className="relative group">
  <img src={imageUrl} className="w-full" />
  <ImageClearButton onClear={handleClear} />
</div>
```

## Key Patterns

### PortRow Configuration

```tsx
// Input only (like text-input)
<PortRow
  nodeId={id}
  output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
/>

// Output only (like preview-output)
<PortRow
  nodeId={id}
  input={{ id: "input", label: "Response", colorClass: "amber", isConnected: isInputConnected("input", true) }}
/>

// Both input and output
<PortRow
  nodeId={id}
  input={{ id: "prompt", label: "Prompt", colorClass: "cyan", isConnected: isInputConnected("prompt") }}
  output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
/>

// Multiple port rows for nodes with many ports
<>
  <PortRow
    nodeId={id}
    input={{ id: "prompt", label: "Prompt", colorClass: "cyan", isConnected: isInputConnected("prompt") }}
    output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
  />
  <PortRow
    nodeId={id}
    input={{ id: "image", label: "Image", colorClass: "purple", isConnected: isInputConnected("image") }}
    output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
  />
</>
```

### Color Classes (Port Data Types)

| Data Type | colorClass | CSS Variable |
|-----------|------------|--------------|
| String | `"cyan"` | `--port-cyan` |
| Image | `"purple"` | `--port-purple` |
| Response | `"amber"` | `--port-amber` |
| Audio | `"emerald"` | `--port-emerald` |
| Boolean | `"rose"` | `--port-rose` |
| Pulse | `"orange"` | `--port-orange` |

### Accent Colors (Node Types)

| Node Type | accentColor |
|-----------|-------------|
| text-input | `"violet"` |
| image-input | `"fuchsia"` |
| text-generation | `"cyan"` |
| image-generation | `"rose"` |
| ai-logic | `"amber"` |
| preview-output | `"emerald"` |
| react-component | `"blue"` |
| audio-* | `"teal"` |

### Port Properties

Each port object accepts these properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Handle ID (must match port schema) |
| `label` | string | Display label |
| `colorClass` | string | Port color (see table above) |
| `isConnected` | boolean | Whether an edge is connected |
| `required` | boolean | Optional. Shows visual indicator for required inputs |

### InputWithHandle (for connectable inputs)

Use when an input can be either connected or manually entered:

```tsx
import { InputWithHandle } from "./InputWithHandle";

<InputWithHandle
  id="prompt"
  label="User Prompt"
  colorClass="cyan"
  isConnected={isInputConnected("prompt")}
>
  <textarea
    value={isInputConnected("prompt") ? "" : (data.userPrompt ?? "")}
    onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
    placeholder={isInputConnected("prompt") ? "Connected" : "Enter prompt..."}
    disabled={isInputConnected("prompt")}
    className={cn(
      "nodrag node-input min-h-[60px]",
      isInputConnected("prompt") && "node-input:disabled"
    )}
  />
</InputWithHandle>
```

### CSS Classes for Inputs

Use the `node-input` CSS class for all text inputs/textareas:

```tsx
// Standard input
<textarea className="nodrag node-input min-h-[60px] resize-y" />

// Disabled/connected input
<textarea className="nodrag node-input min-h-[60px] node-input:disabled" disabled />
```

The `node-input` class applies:
- Proper background, border, and text colors
- Focus ring styles
- Consistent padding and sizing
- Dark mode compatibility

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
| `accentColor` | NodeAccentColor | No | Node accent color (default: "cyan") |
| `status` | ExecutionStatus | No | running/success/error |
| `fromCache` | boolean | No | Show "Cached" badge |
| `className` | string | No | Additional classes |
| `ports` | ReactNode | No | PortRow components |
| `children` | ReactNode | No | Main node content |
| `footer` | ReactNode | No | NodeFooter or custom content |

## Design System Tokens

The node styling uses CSS custom properties defined in `app/styles/nodes.css`:

```css
/* Border opacity hierarchy (use in Tailwind as border-white/[value]) */
--node-border-strong: 0.1;   /* Primary borders */
--node-border-medium: 0.06;  /* Secondary borders */
--node-border-subtle: 0.03;  /* Dividers, separators */

/* Background opacities */
--node-bg-strong: 0.05;
--node-bg-medium: 0.03;
--node-bg-subtle: 0.02;
```

When adding custom elements, prefer these tokens:
- `border-white/[0.1]` for strong borders
- `border-white/[0.06]` for medium borders
- `border-white/[0.03]` for subtle borders

## Real-World Examples

Study these existing node implementations for reference:

- **Simple input**: `InputNode.tsx` - Basic input with single output, `useEdgeConnections`
- **Image input**: `ImageInputNode.tsx` - File upload with `useImageFileInput`, `ImageClearButton`
- **Simple output**: `OutputNode.tsx` - Terminal node with `NodeFooter`
- **Processing with AI**: `PromptNode.tsx` - Multiple inputs, provider/model selection, streaming, `CacheToggle`
- **Image generation**: `ImageNode.tsx` - Image output handling, aspect ratio selector, `NodeFooter` with `imageOutput`
- **Complex logic**: `MagicNode.tsx` - Code generation, collapsible sections, `CacheToggle`, `NodeFooter`

## Validation

After completing this step, verify:
- [ ] Component renders without errors
- [ ] Port handles appear correctly
- [ ] Edges can connect to handles
- [ ] Input fields update node data
- [ ] Status badge shows during execution
- [ ] Footer displays output/errors correctly
- [ ] Cache toggle works (if applicable)
