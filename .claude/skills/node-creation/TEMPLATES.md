# Node Templates

Copy-paste templates for common node types. Replace `YourNode` and `your-node-type` with your actual names.

## Input Node Template

For nodes that start a flow with user-provided data. No incoming edges, one output.

### Type Definition (`types/flow.ts`)

```typescript
// Add interface (~line 30)
export interface YourInputNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  inputValue?: string;
}

// Add to AgentNodeData union (~line 156)
export type AgentNodeData = ... | YourInputNodeData;

// Add NodeType literal (~line 167)
export type NodeType = "..." | "your-input";

// Add typed alias (~line 170)
export type YourInputNode = Node<YourInputNodeData, "your-input">;

// Add to AgentNode union (~line 179)
export type AgentNode = ... | YourInputNode;

// Add to nodeDefinitions (~line 200)
{
  type: "your-input",
  label: "Your Input",
  description: "Entry point description",
  color: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
},

// Add port schema (~line 246)
"your-input": {
  inputs: [],
  outputs: [{ id: "output", label: "string", dataType: "string" }],
},
```

### Component (`components/Flow/nodes/YourInputNode.tsx`)

```tsx
"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { YourInputNodeData } from "@/types/flow";
import { Keyboard } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type YourInputNodeType = Node<YourInputNodeData, "your-input">;

export function YourInputNode({ id, data }: NodeProps<YourInputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isOutputConnected } = useEdgeConnections(id);

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Keyboard />}
      accentColor="violet"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
        />
      }
    >
      <textarea
        value={data.inputValue || ""}
        onChange={(e) => updateNodeData(id, { inputValue: e.target.value })}
        placeholder="Enter text..."
        className="nodrag node-input min-h-[84px] resize-y"
      />
    </NodeFrame>
  );
}
```

### Executor (`lib/execution/executors/your-input.ts`)

```typescript
import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const yourInputExecutor: NodeExecutor = {
  type: "your-input",

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const inputValue = typeof ctx.node.data?.inputValue === "string"
      ? ctx.node.data.inputValue : "";
    return { output: inputValue };
  },
};
```

---

## Processing Node Template (with AI)

For nodes that transform data using an AI API. Has inputs and outputs.

### Type Definition (`types/flow.ts`)

```typescript
export interface YourProcessingNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  userPrompt?: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  cacheable?: boolean;
}

// Port schema
"your-processing": {
  inputs: [
    { id: "prompt", label: "prompt", dataType: "string", required: true },
    { id: "system", label: "system", dataType: "string", required: false },
  ],
  outputs: [
    { id: "output", label: "string", dataType: "string" },
    { id: "done", label: "done", dataType: "pulse" },
  ],
},
```

### Component (`components/Flow/nodes/YourProcessingNode.tsx`)

```tsx
"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { YourProcessingNodeData } from "@/types/flow";
import { Sparkles } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { NodeFooter } from "./NodeFooter";
import { CacheToggle } from "./CacheToggle";
import { ConfigSelect } from "./ConfigSelect";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";
import { cn } from "@/lib/utils";

type YourProcessingNodeType = Node<YourProcessingNodeData, "your-processing">;

export function YourProcessingNode({ id, data }: NodeProps<YourProcessingNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Sparkles />}
      accentColor="amber"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            input={{ id: "prompt", label: "Prompt", colorClass: "cyan", isConnected: isInputConnected("prompt") }}
            output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
        </>
      }
      footer={<NodeFooter error={data.executionError} output={data.executionOutput} />}
    >
      <div className="space-y-3">
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
              "nodrag node-input min-h-[60px] resize-y",
              isInputConnected("prompt") && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Use ConfigSelect for dropdowns with labels */}
        {/* <ConfigSelect
          label="Option"
          value={data.option || "default"}
          options={[{ value: "default", label: "Default" }]}
          onChange={(value) => updateNodeData(id, { option: value })}
        /> */}

        <CacheToggle
          nodeId={id}
          checked={data.cacheable ?? false}
          className="pt-2 border-t border-white/[0.06]"
        />
      </div>
    </NodeFrame>
  );
}
```

### Executor (`lib/execution/executors/your-processing.ts`)

```typescript
import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
import { fetchWithTimeout } from "../utils/fetch";
import { parseTextStream, parseErrorResponse } from "../utils/streaming";
import { buildApiRequestBody, redactRequestBody } from "../utils/request";
import { createTextGenerationDebugInfo } from "../utils/debug";

export const yourProcessingExecutor: NodeExecutor = {
  type: "your-processing",
  hasPulseOutput: true,
  shouldTrackDownstream: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs, apiKeys, signal, options, onStreamUpdate } = ctx;
    const startTime = Date.now();

    const hasPromptEdge = "prompt" in inputs;
    const inlineUserPrompt = typeof node.data?.userPrompt === "string"
      ? node.data.userPrompt : "";
    const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

    const requestBody = buildApiRequestBody({
      type: "your-processing",
      prompt: promptInput,
      provider: node.data.provider,
      model: node.data.model,
      apiKeys,
      options,
    });

    const debugInfo = createTextGenerationDebugInfo(startTime, redactRequestBody(requestBody));

    const response = await fetchWithTimeout("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response, "Request failed"));
    }

    const reader = response.body!.getReader();
    const { output } = await parseTextStream(reader, (text, rawChunks) => {
      debugInfo.streamChunksReceived = rawChunks.length;
      onStreamUpdate?.(text, debugInfo);
    });

    debugInfo.endTime = Date.now();
    return { output, debugInfo };
  },
};
```

---

## Output Node Template

For terminal nodes that display final results. One input, no outputs.

### Type Definition (`types/flow.ts`)

```typescript
export interface YourOutputNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
}

// Port schema
"your-output": {
  inputs: [{ id: "input", label: "response", dataType: "response" }],
  outputs: [],
},
```

### Component (`components/Flow/nodes/YourOutputNode.tsx`)

```tsx
"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { YourOutputNodeData } from "@/types/flow";
import { Square } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { NodeFooter } from "./NodeFooter";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type YourOutputNodeType = Node<YourOutputNodeData, "your-output">;

export function YourOutputNode({ id, data }: NodeProps<YourOutputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected } = useEdgeConnections(id);

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Square />}
      accentColor="emerald"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          input={{ id: "input", label: "Response", colorClass: "amber", isConnected: isInputConnected("input", true) }}
        />
      }
      footer={
        <NodeFooter
          error={data.executionError}
          output={data.executionOutput}
          emptyMessage="Output appears here"
        />
      }
    />
  );
}
```

### Executor (`lib/execution/executors/your-output.ts`)

```typescript
import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const yourOutputExecutor: NodeExecutor = {
  type: "your-output",

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const output = ctx.inputs["input"] || Object.values(ctx.inputs)[0] || "";
    return { output };
  },
};
```

---

## Transform Node Template (No API)

For nodes that transform data locally without external API calls.

### Type Definition (`types/flow.ts`)

```typescript
export interface YourTransformNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  config?: string;
  cacheable?: boolean;
}

// Port schema
"your-transform": {
  inputs: [{ id: "input", label: "input", dataType: "string", required: true }],
  outputs: [
    { id: "output", label: "output", dataType: "string" },
    { id: "done", label: "done", dataType: "pulse" },
  ],
},
```

### Component (`components/Flow/nodes/YourTransformNode.tsx`)

```tsx
"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { YourTransformNodeData } from "@/types/flow";
import { RefreshCw } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { NodeFooter } from "./NodeFooter";
import { CacheToggle } from "./CacheToggle";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type YourTransformNodeType = Node<YourTransformNodeData, "your-transform">;

export function YourTransformNode({ id, data }: NodeProps<YourTransformNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<RefreshCw />}
      accentColor="amber"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            input={{ id: "input", label: "Input", colorClass: "cyan", isConnected: isInputConnected("input", true) }}
            output={{ id: "output", label: "Output", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
        </>
      }
      footer={<NodeFooter error={data.executionError} output={data.executionOutput} />}
    >
      <div className="space-y-3">
        <input
          value={data.config || ""}
          onChange={(e) => updateNodeData(id, { config: e.target.value })}
          placeholder="Configuration..."
          className="nodrag node-input"
        />

        <CacheToggle
          nodeId={id}
          checked={data.cacheable ?? false}
          className="pt-2 border-t border-white/[0.06]"
        />
      </div>
    </NodeFrame>
  );
}
```

### Executor (`lib/execution/executors/your-transform.ts`)

```typescript
import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const yourTransformExecutor: NodeExecutor = {
  type: "your-transform",
  hasPulseOutput: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { inputs, node } = ctx;
    const input = inputs["input"] || "";
    const config = (node.data.config as string) || "";

    // Perform local transformation
    const result = input.toUpperCase(); // Example transformation

    return { output: result };
  },
};
```

---

## Image Input Node Template

For nodes that accept image uploads as flow input.

### Type Definition (`types/flow.ts`)

```typescript
export interface YourImageInputNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  uploadedImage?: string;
}

// Port schema
"your-image-input": {
  inputs: [],
  outputs: [{ id: "output", label: "image", dataType: "image" }],
},
```

### Component (`components/Flow/nodes/YourImageInputNode.tsx`)

```tsx
"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { YourImageInputNodeData } from "@/types/flow";
import { ImageIcon, Upload } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { ImageClearButton } from "./ImageClearButton";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";
import { useImageFileInput } from "@/lib/hooks/useImageFileInput";
import { parseImageOutput, getImageDataUrl } from "@/lib/image-utils";
import { cn } from "@/lib/utils";

type YourImageInputNodeType = Node<YourImageInputNodeData, "your-image-input">;

export function YourImageInputNode({ id, data }: NodeProps<YourImageInputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isOutputConnected } = useEdgeConnections(id);
  const { fileInputRef, handleFileChange, handleClear, triggerFileSelect } = useImageFileInput({
    nodeId: id,
    dataKey: "uploadedImage",
  });

  const imageData = data.uploadedImage ? parseImageOutput(data.uploadedImage) : null;

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<ImageIcon />}
      accentColor="fuchsia"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          output={{ id: "output", label: "Image", colorClass: "purple", isConnected: isOutputConnected("output", true) }}
        />
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {imageData ? (
        <div className="relative group rounded-lg overflow-hidden border border-white/[0.06]">
          <img
            src={getImageDataUrl(imageData)}
            alt="Uploaded"
            className="w-full h-auto max-h-[200px] object-cover"
          />
          <ImageClearButton onClear={handleClear} />
        </div>
      ) : (
        <button
          onClick={triggerFileSelect}
          className={cn(
            "nodrag w-full h-24 flex flex-col items-center justify-center gap-2",
            "rounded-lg border border-dashed border-white/[0.1]",
            "bg-white/[0.02] hover:bg-white/[0.04] transition-colors",
            "text-white/40 hover:text-white/60"
          )}
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs">Upload image</span>
        </button>
      )}
    </NodeFrame>
  );
}
```

---

## Registration Checklist

After creating files, register everywhere:

### `lib/execution/executors/index.ts`
```typescript
import { yourNodeExecutor } from "./your-node-type";

// Add to registration block:
registerExecutor(yourNodeExecutor);
```

### `components/Flow/nodes/index.ts`
```typescript
import { YourNode } from "./YourNode";

export const nodeTypes: NodeTypes = {
  // ...existing
  "your-node-type": YourNode,
};

export { YourNode };
```

### `components/Flow/NodeSidebar.tsx`
```typescript
import { YourIcon } from "lucide-react";

const iconMap = {
  // ...existing
  "your-node-type": YourIcon,
};
```

### `components/Flow/AgentFlow.tsx`
```typescript
const defaultNodeData = {
  // ...existing
  "your-node-type": { label: "Your Node", yourField: "" },
};
```

### `lib/autopilot/config.ts`
```typescript
export const VALID_NODE_TYPES = [
  // ...existing
  "your-node-type",
] as const;

export const NODE_REQUIRED_FIELDS = {
  // ...existing
  "your-node-type": ["label"],
};
```

---

## Documentation Templates

Templates for user-facing documentation in `app/docs/nodes/`.

### Input Node Documentation

Create `app/docs/nodes/your-input/page.mdx`:

```mdx
# Your Input

Entry point for [data type] data in your workflow.

## Overview

The Your Input node provides [input mechanism] where you can [action]. Use this as the starting point for [use case] workflows.

## Ports

| Port | Type | Direction | Description |
|------|------|-----------|-------------|
| Output | String (cyan) | Out | The [data type] entered in the node |

## Tips

- [Tip about using the input effectively]
- Connect to [suggested downstream nodes]
```

### Processing Node Documentation (with AI)

Create `app/docs/nodes/your-processing/page.mdx`:

```mdx
# Your Processing

[Brief description of what this node does].

## Overview

The Your Processing node [detailed explanation]. It supports [providers/features].

## Ports

| Port | Type | Direction | Description |
|------|------|-----------|-------------|
| Prompt | String (cyan) | In | [Input description] |
| System | String (cyan) | In | [Optional input description] |
| Output | Response (amber) | Out | [Output description] |
| Done | Pulse (orange) | Out | Fires when processing completes |

## Configuration

### Provider & Model

Select your AI provider and model:

- **OpenAI**: [Available models]
- **Google**: [Available models]
- **Anthropic**: [Available models]

### Provider-Specific Options

**OpenAI**:
- [Option]: [Description]

**Google Gemini**:
- [Option]: [Description]

## Caching

Enable the **Cache output** toggle to reuse results when inputs haven't changed. This speeds up re-runs and saves API costs.

## Inline Inputs

If a port isn't connected, you can enter text directly in the node:
- **[Field name]** field for [purpose]

## Streaming

Responses stream in real-time. Connected Preview Output nodes show the response as it generates.
```

### Output Node Documentation

Create `app/docs/nodes/your-output/page.mdx`:

```mdx
# Your Output

Display [content type] at the end of your workflow.

## Overview

The Your Output node [what it displays/does]. Use this as the terminal node for [use case] workflows.

## Ports

| Port | Type | Direction | Description |
|------|------|-----------|-------------|
| Input | Response (amber) | In | The content to display |

## Display Features

- [Feature 1]
- [Feature 2]

## Tips

- Connect from [suggested upstream nodes]
- [Tip about rendering/formatting]
```

### Transform Node Documentation (No API)

Create `app/docs/nodes/your-transform/page.mdx`:

```mdx
# Your Transform

[Brief description of transformation].

## Overview

The Your Transform node [what it does]. It processes data locally without external API calls.

## Ports

| Port | Type | Direction | Description |
|------|------|-----------|-------------|
| Input | String (cyan) | In | [Input description] |
| Output | String (cyan) | Out | [Output description] |
| Done | Pulse (orange) | Out | Fires when transformation completes |

## Configuration

- **[Option]**: [Description]

## Caching

Enable the **Cache output** toggle to skip re-execution when inputs haven't changed.

## Example

Input: `[example input]`
Output: `[example output]`
```

### Navigation Entry (`app/docs/nodes/_meta.js`)

Add your node in the correct category:

```javascript
export default {
  index: "Overview",
  "-- Input Nodes": {
    type: "separator",
    title: "Input Nodes",
  },
  "text-input": "Text Input",
  // Add input nodes here
  "your-input": "Your Input",
  "-- Processing Nodes": {
    type: "separator",
    title: "Processing Nodes",
  },
  "text-generation": "Text Generation",
  // Add processing nodes here
  "your-processing": "Your Processing",
  "-- Annotation": {
    type: "separator",
    title: "Annotation",
  },
  comment: "Comment",
  "-- Output Nodes": {
    type: "separator",
    title: "Output Nodes",
  },
  "preview-output": "Preview Output",
  // Add output nodes here
  "your-output": "Your Output",
};
```
