# Step 6: Claude Rules Documentation

Update the project documentation files that Claude Code uses as context.

## Checklist

- [ ] Update node count and summary in `CLAUDE.md`
- [ ] Add node documentation in `.claude/rules/nodes.md`
- [ ] Add executor to table in `.claude/rules/execution.md`
- [ ] Add data interface and update lists in `.claude/rules/types.md`

## 1. CLAUDE.md Updates

Update the Node Types Summary section:

```markdown
<!-- CLAUDE.md (~line 87) -->
| Node types | `nodes.md` | All 12 node types and their features |
                              ^^-- increment count

<!-- (~line 98) Node Types Summary - add your node -->
- `text-input`: Text entry point
- `image-input`: Image upload entry point
...
- `your-node-type`: Brief description of what it does
```

## 2. .claude/rules/nodes.md

Add documentation for your node under the appropriate category:

```markdown
<!-- .claude/rules/nodes.md -->

## Processing Nodes  <!-- or Input/Output/Utility/Annotation -->

**YourNode** (type: `your-node-type`): Brief description:
- Key feature 1
- Key feature 2
- Input/output port details
- Default configuration
```

### Category Guidelines

| Category | Use for |
|----------|---------|
| Input Nodes | Entry points (text-input, image-input, audio-input) |
| Processing Nodes | AI-powered transformations |
| Utility Nodes | Data manipulation without AI (string-combine, switch) |
| Annotation Nodes | Comments and documentation |
| Output Nodes | Exit points (preview-output) |

## 3. .claude/rules/execution.md

Add your executor to the Executor Files table:

```markdown
<!-- .claude/rules/execution.md (~line 61) -->

## Executor Files

| File | Node Type | Metadata |
|------|-----------|----------|
| `text-input.ts` | text-input | - |
...
| `your-node.ts` | your-node-type | hasPulseOutput |  <!-- Add here -->
| `comment.ts` | comment | - |
```

### Metadata Flags

| Flag | When to use |
|------|-------------|
| `hasPulseOutput` | Node has a "done" output port |
| `shouldTrackDownstream` | Node streams output to preview nodes |
| `-` | No special metadata |

## 4. .claude/rules/types.md

Update three sections:

### Add Data Interface

```markdown
<!-- .claude/rules/types.md - Node Data Interfaces section -->

### YourNodeData

- `field1`: Description of field
- `field2`: Description of field
```

### Update Pulse Ports List

If your node has `hasPulseOutput`:

```markdown
<!-- .claude/rules/types.md (~line 17) -->

**Pulse Ports**: Processing nodes (`text-generation`, `image-generation`, `ai-logic`, `react-component`, `audio-transcription`, `your-node-type`) have a `done` output port...
```

### Update Node Type Constants

```markdown
<!-- .claude/rules/types.md - Node Type Constants section -->

Valid node types for flow operations:
- `text-input`
- `image-input`
...
- `your-node-type`  <!-- Add here, alphabetically or logically grouped -->
```

## Why Update These Files?

The `.claude/rules/` files serve as **project memory** that Claude Code loads automatically. Keeping them accurate ensures:

1. **Accurate context**: Claude knows about all node types when assisting
2. **Correct counts**: Node type counts match actual implementation
3. **Consistent naming**: Type names and descriptions stay in sync
4. **Better suggestions**: Autopilot and code generation work correctly

## Validation

After updating:
- [ ] Node count in CLAUDE.md matches actual node count
- [ ] Node appears in appropriate category in nodes.md
- [ ] Executor table in execution.md is complete
- [ ] Data interface documented in types.md
- [ ] Node type appears in "Valid node types" list
