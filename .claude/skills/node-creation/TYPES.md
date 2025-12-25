# Step 1: Type Definitions

Define your node's data interface and port schema in `types/flow.ts`.

## Checklist

- [ ] Create node data interface extending ExecutionData
- [ ] Add to `AgentNodeData` union type
- [ ] Create typed Node alias
- [ ] Add to `AgentNode` union type
- [ ] Add NodeType literal
- [ ] Add port schema to `NODE_PORT_SCHEMAS`
- [ ] Add to `nodeDefinitions` array

## Node Data Interface

All nodes extend `ExecutionData` for status tracking:

```typescript
// Base interface (already exists in types/flow.ts)
interface ExecutionData {
  executionStatus?: ExecutionStatus;
  executionOutput?: string;
  executionError?: string;
}

// Your new node data
export interface YourNodeData extends Record<string, unknown>, ExecutionData {
  label: string;           // Required: display name
  yourField?: string;      // Your custom fields
}
```

### Pattern by Category

**Input Node** (produces data, no inputs):
```typescript
export interface YourInputNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  inputValue?: string;
}
```

**Processing Node** (transforms data):
```typescript
export interface YourProcessingNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  userPrompt?: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
}
```

**Output Node** (terminal display):
```typescript
export interface YourOutputNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
}
```

## Union Types

Add your new types to the unions in `types/flow.ts`:

```typescript
// 1. Add to AgentNodeData union (~line 156)
export type AgentNodeData =
  | InputNodeData
  | OutputNodeData
  | YourNodeData;  // Add here

// 2. Add NodeType literal (~line 167)
export type NodeType = "text-input" | "preview-output" | "your-node-type";

// 3. Create typed alias (~line 170)
export type YourNode = Node<YourNodeData, "your-node-type">;

// 4. Add to AgentNode union (~line 179)
export type AgentNode =
  | InputNode
  | OutputNode
  | YourNode;  // Add here
```

## Port Schema

Define inputs and outputs in `NODE_PORT_SCHEMAS` (~line 246):

```typescript
export const NODE_PORT_SCHEMAS: Record<NodeType, NodePortSchema> = {
  // ...existing schemas...

  "your-node-type": {
    inputs: [
      { id: "prompt", label: "prompt", dataType: "string", required: true },
      { id: "system", label: "system", dataType: "string", required: false },
    ],
    outputs: [
      { id: "output", label: "string", dataType: "string" }
    ],
  },
};
```

### Port Data Types

| Type | Color | Description |
|------|-------|-------------|
| `"string"` | cyan | Text data |
| `"image"` | purple | Image data (base64 JSON) |
| `"response"` | amber | Terminal output for preview |
| `"audio"` | emerald | Audio stream (MediaStream or base64) |

## Node Definition

Add to `nodeDefinitions` array (~line 200) for sidebar:

```typescript
export const nodeDefinitions: NodeDefinition[] = [
  // ...existing definitions...
  {
    type: "your-node-type",
    label: "Your Node",
    description: "Brief description",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
];
```

### Color Options

| Category | Color Class |
|----------|-------------|
| Input | `bg-purple-500/10 text-purple-700 dark:text-purple-300` |
| AI/Processing | `bg-gray-500/10 text-gray-700 dark:text-gray-300` |
| Output | `bg-blue-500/10 text-blue-700 dark:text-blue-300` |
| Logic | `bg-orange-500/10 text-orange-700 dark:text-orange-300` |

## Validation

After completing this step, verify:
- [ ] `npm run lint` passes
- [ ] TypeScript compiles without errors
- [ ] Port schema has valid dataTypes (`"string"`, `"image"`, `"response"`, or `"audio"`)
