---
name: node-creation
description: Step-by-step guide for creating new nodes in Composer. Covers type definitions, React components, execution engine, Autopilot integration, and validation.
---

# Node Creation

This skill guides you through creating new nodes for the Composer visual workflow builder. Follow the steps in order.

## Workflow

| Step | Guide | What you'll do |
|------|-------|----------------|
| 1 | [TYPES.md](TYPES.md) | Define node data interface and port schema in `types/flow.ts` |
| 2 | [COMPONENT.md](COMPONENT.md) | Create React component with NodeFrame wrapper |
| 3 | [EXECUTION.md](EXECUTION.md) | Add execution logic to `lib/execution/engine.ts` |
| 4 | [AUTOPILOT.md](AUTOPILOT.md) | Integrate with Autopilot system |
| 5 | [SIDEBAR.md](SIDEBAR.md) | Register in sidebar and set defaults |
| 6 | [VALIDATION.md](VALIDATION.md) | Test and validate the implementation |
| 7 | [DOCUMENTATION.md](DOCUMENTATION.md) | Write user-facing docs for the Nextra docs site |

## Quick Reference

### Node Categories

| Category | Examples | Characteristics |
|----------|----------|-----------------|
| Input | text-input, image-input | No incoming edges, produces data |
| Processing | text-generation, ai-logic | Transforms inputs to outputs, often cacheable |
| Output | preview-output | Terminal node, displays results |
| Interactive | realtime-conversation | User-driven lifecycle, has inputs/outputs |

### Files to Modify

| Order | File | Purpose |
|-------|------|---------|
| 1 | `types/flow.ts` | Interface, NodeType, port schema, definition |
| 2 | `components/Flow/nodes/YourNode.tsx` | Component |
| 2 | `components/Flow/nodes/index.ts` | Export |
| 3 | `lib/execution/executors/your-node.ts` | Executor |
| 3 | `lib/execution/executors/index.ts` | Register executor |
| 4 | `lib/autopilot/config.ts` | Valid types |
| 4 | `lib/autopilot/system-prompt.ts` | LLM docs |
| 5 | `components/Flow/NodeSidebar.tsx` | Icon |
| 5 | `components/Flow/AgentFlow.tsx` | Defaults |
| 7 | `app/docs/nodes/your-node-type/page.mdx` | User docs |
| 7 | `app/docs/nodes/_meta.js` | Navigation |

### Shared Hooks

| Hook | Purpose | Used by |
|------|---------|---------|
| `useEdgeConnections` | Check if handles are connected | All nodes |
| `useImageFileInput` | Image file upload handling | ImageInputNode, PromptNode |

### Shared Components

| Component | Purpose | Used by |
|-----------|---------|---------|
| `NodeFrame` | Base node wrapper with accent colors | All nodes |
| `PortRow` | Port labels with handles | All nodes |
| `NodeFooter` | Execution output display | Processing/output nodes |
| `CacheToggle` | Enable/disable caching | Cacheable processing nodes |
| `ImageClearButton` | Clear button for images | Image-handling nodes |
| `InputWithHandle` | Connectable input fields | Processing nodes |

### Port Data Types

| Type | Color | CSS Variable | Use for |
|------|-------|--------------|---------|
| string | cyan | `--port-cyan` | Text data |
| image | purple | `--port-purple` | Image data (base64 JSON) |
| response | amber | `--port-amber` | Terminal output for preview |
| audio | emerald | `--port-emerald` | Audio stream (MediaStream or base64) |
| boolean | rose | `--port-rose` | Boolean flags |
| pulse | orange | `--port-orange` | Execution signals (done port) |

### Accent Colors

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

### Design System Tokens

Border opacity hierarchy (use in Tailwind as `border-white/[value]`):

| Token | Value | Use for |
|-------|-------|---------|
| `--node-border-strong` | 0.1 | Primary borders |
| `--node-border-medium` | 0.06 | Secondary borders |
| `--node-border-subtle` | 0.03 | Dividers, separators |

### Templates

See [TEMPLATES.md](TEMPLATES.md) for copy-paste templates for each node category.
