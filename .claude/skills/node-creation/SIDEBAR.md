# Step 5: UI Registration

Register your node across all UI components that display node types.

## Checklist

- [ ] Add icon mapping in `NodeSidebar.tsx`
- [ ] Add icon mapping in `NodeToolbar.tsx`
- [ ] Add icon mapping and category in `CommandPalette.tsx`
- [ ] Add icon and label mappings in `ChangesPreview.tsx`
- [ ] Add default data in `AgentFlow.tsx`

> **Note**: All icon map files use `Record<NodeType, ...>` which TypeScript enforces exhaustively. The build will fail if any file is missing your new node type.

## 1. NodeSidebar Icon Mapping

Add your node's icon to the icon map in `components/Flow/NodeSidebar.tsx`:

```typescript
// components/Flow/NodeSidebar.tsx (~line 8)
import { YourIcon } from "lucide-react";

const iconMap: Record<NodeType, typeof Keyboard> = {
  "text-input": Keyboard,
  "image-input": Upload,
  "preview-output": Square,
  "text-generation": MessageSquare,
  "image-generation": ImageIcon,
  "ai-logic": Sparkles,
  "comment": MessageSquarePlus,
  "react-component": Code,
  "your-node-type": YourIcon,  // Add here
};
```

### Icon Selection Guide

Choose an icon from `lucide-react` that represents your node's function:

| Category | Suggested Icons |
|----------|-----------------|
| Input | `Keyboard`, `Upload`, `FileInput`, `Type` |
| Processing | `MessageSquare`, `Sparkles`, `Wand2`, `Cpu` |
| Output | `Square`, `Eye`, `Monitor`, `ExternalLink` |
| Transform | `ArrowRight`, `Shuffle`, `Layers`, `GitBranch` |
| AI | `Brain`, `Bot`, `Cpu`, `Zap` |
| Data | `Database`, `Table`, `FileJson`, `FileText` |

Browse all icons: https://lucide.dev/icons/

## 2. NodeToolbar Icon Mapping

Add your node's icon to `components/Flow/NodeToolbar.tsx`:

```typescript
// components/Flow/NodeToolbar.tsx (~line 7)
import { YourIcon } from "lucide-react";

const iconMap: Record<NodeType, typeof Keyboard> = {
  "text-input": Keyboard,
  "image-input": Upload,
  // ...existing entries
  "your-node-type": YourIcon,  // Add here
};
```

## 3. CommandPalette Icon and Category

Add your node to `components/Flow/CommandPalette.tsx`:

```typescript
// components/Flow/CommandPalette.tsx (~line 20)
import { YourIcon } from "lucide-react";

const iconMap: Record<NodeType, typeof Keyboard> = {
  "text-input": Keyboard,
  // ...existing entries
  "your-node-type": YourIcon,  // Add here
};

// (~line 50) Add to appropriate category in categorizedNodes
const categorizedNodes = {
  Input: ["text-input", "image-input", "audio-input"],
  "AI Models": ["text-generation", "image-generation", "react-component", "realtime-conversation"],
  Logic: ["ai-logic", "switch", "string-combine", "your-node-type"],  // Add to existing category
  Output: ["preview-output", "audio-transcription"],
  Annotation: ["comment"],
};
```

### Category Guidelines

| Category | Node Types |
|----------|------------|
| Input | Entry points that receive user data |
| AI Models | Nodes that call AI providers |
| Logic | Data transformation, routing, combining |
| Output | Terminal nodes, transcription |
| Annotation | Comments, documentation |

## 4. ChangesPreview Icon and Label

Add mappings in `components/Flow/AutopilotSidebar/ChangesPreview.tsx`:

```typescript
// components/Flow/AutopilotSidebar/ChangesPreview.tsx (~line 12)
import { YourIcon } from "lucide-react";

const iconMap: Record<NodeType, typeof Keyboard> = {
  "text-input": Keyboard,
  // ...existing entries
  "your-node-type": YourIcon,  // Add here
};

// (~line 57)
const nodeTypeLabels: Record<NodeType, string> = {
  "text-input": "Text Input",
  // ...existing entries
  "your-node-type": "Your Node",  // Add human-readable label
};
```

## 5. AgentFlow Default Data

Add default values for your node in `components/Flow/AgentFlow.tsx`:

```typescript
// components/Flow/AgentFlow.tsx (~line 86)

const defaultNodeData: Record<NodeType, Record<string, unknown>> = {
  "text-input": { label: "Input Text", inputValue: "" },
  "image-input": { label: "Input Image" },
  "preview-output": { label: "Preview Output" },
  "text-generation": {
    label: "AI Text",
    prompt: "",
    provider: "google",
    model: "gemini-3-flash-preview"
  },
  "image-generation": {
    label: "AI Image",
    prompt: "",
    provider: "google",
    model: "gemini-2.5-flash-image"
  },
  "ai-logic": { label: "AI Logic", transformPrompt: "", codeExpanded: false },
  "comment": { label: "Comment", description: "", color: "gray" },
  "react-component": {
    label: "React Component",
    userPrompt: "",
    provider: "anthropic",
    model: "claude-haiku-4-5"
  },
  "your-node-type": {  // Add here
    label: "Your Node",
    yourField: "",
    // Add provider/model if applicable:
    // provider: "google",
    // model: "gemini-3-flash-preview",
  },
};
```

### Default Data Best Practices

1. **Always include `label`** - This is the node's display name
2. **Initialize optional fields** - Provide sensible defaults
3. **Match type interface** - Values should match your `YourNodeData` interface
4. **Provider/model defaults** - If your node uses AI, set sensible defaults

### Common Default Patterns

**Input node:**
```typescript
"your-input": {
  label: "Your Input",
  inputValue: "",
}
```

**Processing node (with AI):**
```typescript
"your-processing": {
  label: "Your Processing",
  userPrompt: "",
  provider: "google",
  model: "gemini-3-flash-preview",
}
```

**Output node:**
```typescript
"your-output": {
  label: "Your Output",
}
```

**Transform node (no AI):**
```typescript
"your-transform": {
  label: "Your Transform",
  config: "",
}
```

## 6. Verify nodeDefinitions

Ensure you already added the definition in `types/flow.ts` (Step 1):

```typescript
export const nodeDefinitions: NodeDefinition[] = [
  // ...other definitions
  {
    type: "your-node-type",
    label: "Your Node",
    description: "Brief description",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
];
```

## Validation

After completing this step, verify:
- [ ] `npm run build` passes (TypeScript catches missing icon mappings)
- [ ] Node appears in Node Sidebar with correct icon
- [ ] Node appears in NodeToolbar with correct icon
- [ ] Node appears in CommandPalette under correct category
- [ ] Can drag and drop node onto canvas
- [ ] Node creates with correct default data
- [ ] Icon displays correctly in node header
- [ ] Autopilot changes preview shows correct icon and label
