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

### Execution (`lib/execution/engine.ts`)

```typescript
case "your-input":
  return { output: (node.data.inputValue as string) || "" };
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

### Execution (`lib/execution/engine.ts`)

```typescript
case "your-processing": {
  const startTime = Date.now();

  const hasPromptEdge = "prompt" in inputs;
  const inlineUserPrompt = typeof node.data?.userPrompt === "string"
    ? node.data.userPrompt : "";
  const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

  const requestBody = options?.shareToken
    ? {
        type: "your-processing",
        prompt: promptInput,
        provider: node.data.provider,
        model: node.data.model,
        shareToken: options.shareToken,
        runId: options.runId,
      }
    : {
        type: "your-processing",
        prompt: promptInput,
        provider: node.data.provider,
        model: node.data.model,
        apiKeys,
      };

  const debugInfo: DebugInfo = { startTime, request: requestBody, streamChunksReceived: 0 };

  const response = await fetchWithTimeout("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(JSON.parse(text).error || "Request failed");
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullOutput = "";
  let streamChunksReceived = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullOutput += decoder.decode(value);
    streamChunksReceived++;
    debugInfo.streamChunksReceived = streamChunksReceived;
    onStreamUpdate?.(fullOutput, debugInfo);
  }

  debugInfo.endTime = Date.now();
  return { output: fullOutput, debugInfo };
}
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

### Execution (`lib/execution/engine.ts`)

```typescript
case "your-output":
  return { output: inputs["input"] || Object.values(inputs)[0] || "" };
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

### Execution (`lib/execution/engine.ts`)

```typescript
case "your-transform": {
  const input = inputs["input"] || "";
  const config = (node.data.config as string) || "";

  // Perform local transformation
  const result = input.toUpperCase(); // Example transformation

  return { output: result };
}
```

---

## Registration Checklist

After creating files, register everywhere:

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
