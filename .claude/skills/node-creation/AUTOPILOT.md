# Step 4: Autopilot Integration

Integrate your node with the Autopilot AI assistant so it can create and configure your node type.

## Checklist

- [ ] Add to `VALID_NODE_TYPES` in `lib/autopilot/config.ts`
- [ ] Add required fields to `NODE_REQUIRED_FIELDS`
- [ ] Document node in `lib/autopilot/system-prompt.ts`
- [ ] Add connection examples if node has multiple inputs

## 1. config.ts Updates

### Add to Valid Node Types

```typescript
// lib/autopilot/config.ts (~line 23)

export const VALID_NODE_TYPES = [
  "text-input",
  "image-input",
  "text-generation",
  "image-generation",
  "ai-logic",
  "preview-output",
  "react-component",
  "comment",
  "your-node-type",  // Add here
] as const;
```

### Add Required Fields

```typescript
// lib/autopilot/config.ts (~line 58)

export const NODE_REQUIRED_FIELDS: Record<ValidNodeType, string[]> = {
  // ...existing entries...
  "your-node-type": ["label"],  // Only label is universally required
};
```

## 2. system-prompt.ts Updates

Add comprehensive documentation for the LLM in `buildSystemPrompt()`:

### Node Type Documentation

Add a new section under `## Available Node Types`:

```typescript
### 8. your-node-type (Your Node Name)
Brief description of what the node does and when to use it.
\`\`\`typescript
{
  type: "your-node-type",
  data: {
    label: string,           // Display name
    yourField?: string,      // Optional field description
    provider?: "openai" | "google" | "anthropic",  // If applicable
    model?: string           // If applicable
  }
}
\`\`\`
```

### Input Handles (if applicable)

If your node has multiple inputs, document the handles:

```typescript
**Input Handles:**
- \`prompt\` - Description of prompt input (dataType: "string")
- \`image\` - Description of image input (dataType: "image")

When connecting to this node, use \`targetHandle\` to specify which input:
- To connect text: \`targetHandle: "prompt"\`
- To connect image: \`targetHandle: "image"\`
```

### Connection Example

Add an example showing how to create and connect the node:

```typescript
Example - connecting inputs to your-node-type:
\`\`\`json
{
  "actions": [
    {
      "type": "addNode",
      "node": {
        "id": "autopilot-your-node-1234",
        "type": "your-node-type",
        "position": { "x": 400, "y": 200 },
        "data": {
          "label": "My Node",
          "yourField": "value"
        }
      }
    },
    {
      "type": "addEdge",
      "edge": {
        "id": "edge-to-prompt",
        "source": "text-input-1",
        "target": "autopilot-your-node-1234",
        "targetHandle": "prompt",
        "data": { "dataType": "string" }
      }
    }
  ],
  "explanation": "Added your node with connected input"
}
\`\`\`
```

## 3. Connection Rules Update

Update the `## Connection Rules` section if your node has special connection requirements:

```typescript
## Connection Rules
- text-input nodes have OUTPUT connections only
- preview-output nodes have INPUT connections only
- your-node-type nodes have [INPUT/OUTPUT/BOTH] connections
```

## 4. Default Recommendations (optional)

If your node should be a default for certain use cases:

```typescript
6. **Defaults**:
   - Default to Google Gemini 3 Flash for Text Generation nodes
   - Default to your-node-type for [specific use case] with provider: "...", model: "..."
```

## Complete Documentation Template

Here's the full format for the system prompt:

```typescript
### N. your-node-type (Your Node Display Name)
Brief description explaining purpose and use cases. Mention any special behavior.
**Default: provider="openai", model="gpt-5.2"** (if applicable)
\`\`\`typescript
{
  type: "your-node-type",
  data: {
    label: string,              // Required: Display name
    yourField?: string,         // What this field does
    provider?: "openai" | "google" | "anthropic",
    model?: string              // See model list below
  }
}
\`\`\`

**Input Handles:**
- \`handleId\` - Description (dataType: "string"|"image"|"response")

When connecting to this node, use \`targetHandle\` to specify which input:
- To connect to handleId: \`targetHandle: "handleId"\`

**Available Models (ONLY use these exact IDs):** (if applicable)
- OpenAI: \`model-1\`, \`model-2\`
- Google: \`model-1\`, \`model-2\`
```

## Validation

After completing this step, verify:
- [ ] Autopilot can create your node via chat
- [ ] Autopilot connects edges correctly to your node
- [ ] Autopilot uses correct targetHandle for multi-input nodes
- [ ] Validation passes for your node type
- [ ] Error messages are helpful if invalid
