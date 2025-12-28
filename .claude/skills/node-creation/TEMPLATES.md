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

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { YourInputNodeData } from "@/types/flow";
import { Keyboard } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { cn } from "@/lib/utils";

type YourInputNodeType = Node<YourInputNodeData, "your-input">;

export function YourInputNode({ id, data }: NodeProps<YourInputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Keyboard className="h-4 w-4" />}
      iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-300"
      accentBorderClassName="border-purple-500"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected }}
        />
      }
    >
      <textarea
        value={data.inputValue || ""}
        onChange={(e) => updateNodeData(id, { inputValue: e.target.value })}
        placeholder="Enter text..."
        className={cn(
          "nodrag w-full min-h-[84px] resize-y rounded-md border border-input",
          "bg-background/60 dark:bg-muted/40 px-3 py-2 text-sm",
          "shadow-xs transition-[color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        )}
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
}

// Port schema
"your-processing": {
  inputs: [
    { id: "prompt", label: "prompt", dataType: "string", required: true },
    { id: "system", label: "system", dataType: "string", required: false },
  ],
  outputs: [{ id: "output", label: "string", dataType: "string" }],
},
```

### Component (`components/Flow/nodes/YourProcessingNode.tsx`)

```tsx
"use client";

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { YourProcessingNodeData } from "@/types/flow";
import { Sparkles } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { cn } from "@/lib/utils";

type YourProcessingNodeType = Node<YourProcessingNodeData, "your-processing">;

export function YourProcessingNode({ id, data }: NodeProps<YourProcessingNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  const isPromptConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "prompt"
  );
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Sparkles className="h-4 w-4" />}
      iconClassName="bg-orange-500/10 text-orange-600 dark:text-orange-300"
      accentBorderClassName="border-orange-500"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          input={{ id: "prompt", label: "Prompt", colorClass: "cyan", isConnected: isPromptConnected }}
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
            "nodrag w-full min-h-[60px] resize-y rounded-md border border-input px-3 py-2 text-sm",
            isPromptConnected
              ? "bg-muted/50 dark:bg-muted/20 cursor-not-allowed"
              : "bg-background/60 dark:bg-muted/40"
          )}
        />
      </InputWithHandle>
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

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { YourOutputNodeData } from "@/types/flow";
import { Square } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";

type YourOutputNodeType = Node<YourOutputNodeData, "your-output">;

export function YourOutputNode({ id, data }: NodeProps<YourOutputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  const isInputConnected = edges.some(
    (edge) => edge.target === id && (edge.targetHandle === "input" || !edge.targetHandle)
  );

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Square className="h-4 w-4" />}
      iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-300"
      accentBorderClassName="border-blue-500"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          input={{ id: "input", label: "Response", colorClass: "amber", isConnected: isInputConnected }}
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
        ) : (
          <p className="text-xs text-muted-foreground">Output appears here</p>
        )
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
}

// Port schema
"your-transform": {
  inputs: [{ id: "input", label: "input", dataType: "string", required: true }],
  outputs: [{ id: "output", label: "output", dataType: "string" }],
},
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
