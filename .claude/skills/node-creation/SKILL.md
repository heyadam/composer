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

## Quick Reference

### Node Categories

| Category | Examples | Characteristics |
|----------|----------|-----------------|
| Input | text-input, image-input | No incoming edges, produces data |
| Processing | text-generation, ai-logic | Transforms inputs to outputs |
| Output | preview-output | Terminal node, displays results |
| Interactive | realtime-conversation | User-driven lifecycle, has inputs/outputs |

### Files to Modify

| Order | File | Purpose |
|-------|------|---------|
| 1 | `types/flow.ts` | Interface, NodeType, port schema, definition |
| 2 | `components/Flow/nodes/YourNode.tsx` | Component |
| 2 | `components/Flow/nodes/index.ts` | Export |
| 3 | `lib/execution/engine.ts` | Switch case |
| 4 | `lib/autopilot/config.ts` | Valid types |
| 4 | `lib/autopilot/system-prompt.ts` | LLM docs |
| 5 | `components/Flow/NodeSidebar.tsx` | Icon |
| 5 | `components/Flow/AgentFlow.tsx` | Defaults |

### Port Data Types

| Type | Color | Use for |
|------|-------|---------|
| string | cyan | Text data |
| image | purple | Image data (base64 JSON) |
| response | amber | Terminal output for preview |
| audio | emerald | Audio stream (MediaStream or base64) |

### Templates

See [TEMPLATES.md](TEMPLATES.md) for copy-paste templates for each node category.
