# Three.js Scene Node Implementation Plan

## Overview

Create a new **"3D Scene"** node (`threejs-scene`) that generates Three.js scenes using React Three Fiber, and extend the preview-output node to render 3D scenes.

**User Choices:**
- Renderer: React Three Fiber (@react-three/fiber + @react-three/drei)
- Scene Input: Variable injection (accessible as `sceneInput` in generated code)
- Node Name: "3D Scene" (type: `threejs-scene`)

---

## Node Specification

### Inputs (3)
| Handle | Label | Type | Required | Description |
|--------|-------|------|----------|-------------|
| `prompt` | prompt | string | Yes | Scene description |
| `system` | system | string | No | Additional instructions |
| `scene` | scene | string | No | Variable injection → `sceneInput` |

### Outputs (2)
| Handle | Label | Type | Description |
|--------|-------|------|-------------|
| `output` | code | response | JSON: `{"type":"threejs","code":"..."}` |
| `done` | Done | pulse | Fires when generation completes |

---

## Files to Create

### 1. `lib/three-utils.ts`
Utility functions: `isThreejsOutput()`, `parseThreejsOutput()`, `extractThreejsCode()`

### 2. `components/Flow/nodes/ThreejsSceneNode.tsx`
Node component following ReactNode.tsx pattern:
- NodeFrame with `accentColor="violet"`, icon=`<Box />`
- 3 InputWithHandle textareas (prompt, system, scene info display)
- ProviderModelSelector + CacheToggle
- PortRows for code + done outputs

### 3. `lib/execution/executors/threejs-scene.ts`
Executor with:
- `hasPulseOutput: true`
- `shouldTrackDownstream: true`
- Resolves inputs from edges or inline data
- Streams JSON-wrapped R3F code

### 4. `components/Flow/ResponsesSidebar/ThreePreview.tsx`
Sandboxed iframe preview with:
- CDN-loaded Three.js, @react-three/fiber, @react-three/drei
- `sceneInput` variable injection
- Babel JSX transform
- Error boundary
- Collapsible code view

---

## Files to Modify

### Type System
| File | Changes |
|------|---------|
| `types/flow.ts` | Add `ThreejsSceneNodeData` interface, add to `NodeType` union, `AgentNodeData` union, `NODE_PORT_SCHEMAS`, `nodeDefinitions` |
| `types/flow.ts` | Add `threeOutput?: string` to `OutputNodeData` |
| `types/flow.ts` | Add `three` input port to preview-output schema |

### Components
| File | Changes |
|------|---------|
| `components/Flow/nodes/index.ts` | Export ThreejsSceneNode |
| `components/Flow/nodes/OutputNode.tsx` | Add `three` input port display |
| `components/Flow/ResponsesSidebar/ResponsesContent.tsx` | Render ThreePreview for threeOutput |
| `components/Flow/ResponsesSidebar/types.ts` | Add `threeOutput` to PreviewEntry |

### Execution
| File | Changes |
|------|---------|
| `lib/execution/executors/index.ts` | Register threejsSceneExecutor |
| `lib/execution/executors/preview-output.ts` | Handle `three` input |
| `lib/execution/utils/debug.ts` | Add `createThreejsSceneDebugInfo()` |

### API
| File | Changes |
|------|---------|
| `app/api/execute/route.ts` | Add `threejs-scene` handler with R3F system prompt |

### UI Registration
| File | Changes |
|------|---------|
| `components/Flow/AgentFlow.tsx` | Add default node data, getDataType case |
| `components/Flow/NodeSidebar.tsx` | Add icon mapping |
| `components/Flow/NodeToolbar.tsx` | Add icon mapping |
| `components/Flow/CommandPalette.tsx` | Add icon mapping, category |
| `components/Flow/AutopilotSidebar/ChangesPreview.tsx` | Add icon + label mapping |

### Autopilot
| File | Changes |
|------|---------|
| `lib/autopilot/config.ts` | Add to VALID_NODE_TYPES |
| `lib/autopilot/system-prompt.ts` | Add node documentation |

### Documentation
| File | Changes |
|------|---------|
| `.claude/rules/nodes.md` | Document ThreejsSceneNode |
| `.claude/rules/execution.md` | Add to executor table |
| `.claude/rules/types.md` | Document ThreejsSceneNodeData |

---

## Implementation Order

1. **Types** - Define interfaces and port schemas in `types/flow.ts`
2. **Utils** - Create `lib/three-utils.ts`
3. **Component** - Create `ThreejsSceneNode.tsx` and export
4. **Executor** - Create executor and register
5. **API** - Add route handler for code generation
6. **Preview** - Create `ThreePreview.tsx` and integrate
7. **Output Node** - Add `three` input handling
8. **UI** - Register icons and defaults
9. **Autopilot** - Update config and system prompt
10. **Docs** - Update Claude rules

---

## Key Implementation Details

### System Prompt for Code Generation
```
You are an expert Three.js and React Three Fiber developer...
- Generate single React functional component with <Canvas> wrapper
- NO imports (React, THREE, Canvas, useFrame, drei components are global)
- Use `sceneInput` variable for dynamic content
- Include OrbitControls by default
```

### CDN Libraries for ThreePreview
```javascript
{
  "imports": {
    "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
    "@react-three/fiber": "https://esm.sh/@react-three/fiber@8.17.10",
    "@react-three/drei": "https://esm.sh/@react-three/drei@9.117.0"
  }
}
```

### Variable Injection Pattern
```javascript
// In ThreePreview.tsx, before executing code:
window.sceneInput = decodedSceneInput;
// Generated code can access: sceneInput variable
```

---

## Testing Checklist

- [ ] Node appears in sidebar/toolbar/command palette
- [ ] Prompt/system/scene inputs work (connected & inline)
- [ ] Code generation streams correctly
- [ ] Output connects to preview-output `three` port
- [ ] 3D scene renders in ResponsesSidebar
- [ ] sceneInput variable injection works
- [ ] OrbitControls enable scene rotation
- [ ] Error boundary catches rendering errors
- [ ] Caching works when enabled
- [ ] Autopilot can create/connect the node
