# Task Types

Which tasks are right for Gemini agents (quick/simple) vs Claude direct (complex).

## Core Rule

**One sentence = Gemini. Needs explanation = Claude.**

If you can describe the change in a single simple sentence, Gemini can do it fast in parallel. If you need to explain context, reasoning, or tradeoffs, Claude should handle it directly.

---

## ✅ Gemini Agent Tasks (Quick & Simple)

These tasks are perfect for parallel Gemini agents. Low complexity, high velocity.

### Import Updates

```bash
gemini --model gemini-3-flash "Replace all imports from '@/lib/old' with '@/lib/new'. Use replace tool."
```

### Variable/Function Renames

```bash
gemini --model gemini-3-flash "Rename all occurrences of 'oldFunction' to 'newFunction'. Use replace tool."
```

### Pattern Additions (displayName, directives)

```bash
gemini --model gemini-3-flash "Add ComponentName.displayName = 'ComponentName' after each exported component. Use replace tool."
```

```bash
gemini --model gemini-3-flash "Add 'use client' directive at the top of this file. Use replace tool."
```

### Pattern Removals

```bash
gemini --model gemini-3-flash "Remove all console.log statements. Use replace tool."
```

```bash
gemini --model gemini-3-flash "Remove all TODO comments. Use replace tool."
```

### Simple Linting Fixes

```bash
gemini --model gemini-3-flash "Add missing semicolons to all lines. Use replace tool."
```

### Config Value Updates

```bash
gemini --model gemini-3-flash "Replace 'https://old-api.com' with 'https://new-api.com'. Use replace tool."
```

### String/Value Replacements

```bash
gemini --model gemini-3-flash "Replace all 'v1' with 'v2' in this file. Use replace tool."
```

---

## ❌ Claude Tasks (Complex - No Agents)

These tasks are too complex for Gemini. Claude handles them directly - no agents needed.

### Type Additions

**Why Claude**: Requires understanding code semantics to infer correct types

```
❌ Don't use Gemini for: "Add TypeScript types to this file"
✅ Claude handles directly with proper type inference
```

### Bug Fixes

**Why Claude**: Requires reasoning about root cause and solution

```
❌ Don't use Gemini for: "Fix the bug in this function"
✅ Claude analyzes the issue and implements proper fix
```

### Refactoring (Class to Hooks)

**Why Claude**: Requires understanding state management and lifecycle

```
❌ Don't use Gemini for: "Convert this class component to hooks"
✅ Claude understands state/lifecycle patterns
```

### Comprehensive Documentation

**Why Claude**: Requires understanding what code does to document it well

```
❌ Don't use Gemini for: "Add JSDoc to all functions"
✅ Claude reads code and writes meaningful docs
```

### Performance Optimization

**Why Claude**: Requires understanding tradeoffs and system behavior

```
❌ Don't use Gemini for: "Optimize this algorithm"
✅ Claude analyzes performance characteristics
```

### Extract Duplicated Code

**Why Claude**: Requires pattern recognition and abstraction design

```
❌ Don't use Gemini for: "Extract duplicated logic"
✅ Claude identifies patterns and creates clean abstractions
```

### Architectural Changes

**Why Claude**: Requires understanding system design

```
❌ Don't use Gemini for: "Refactor this module structure"
✅ Claude understands dependencies and design patterns
```

### Error Handling

**Why Claude**: Requires understanding failure modes

```
❌ Don't use Gemini for: "Add proper error handling"
✅ Claude analyzes potential failures and handles them
```

---

## Quick Reference

| Task | Tool | Prompt Length |
|------|------|---------------|
| Import updates | ✅ Gemini | 1 sentence |
| Renames | ✅ Gemini | 1 sentence |
| Pattern adds/removes | ✅ Gemini | 1 sentence |
| Simple linting | ✅ Gemini | 1 sentence |
| Config changes | ✅ Gemini | 1 sentence |
| Type additions | ❌ Claude | Needs context |
| Bug fixes | ❌ Claude | Needs reasoning |
| Refactoring | ❌ Claude | Needs understanding |
| Documentation | ❌ Claude | Needs code comprehension |
| Optimization | ❌ Claude | Needs analysis |
| Architecture | ❌ Claude | Needs design thinking |

---

## The One-Sentence Test

Before spawning Gemini agents, ask yourself:

> Can I describe this change in one simple sentence?

**YES** → Use Gemini agents
```bash
"Replace X with Y"
"Add Z after each component"
"Remove all console.log statements"
```

**NO** → Claude handles it directly
```
"Fix the bug" (which bug? what's the cause?)
"Add types" (which types? need inference)
"Improve performance" (how? what tradeoffs?)
```

---

## Summary

**Gemini agents = Simple, repetitive, high-velocity**
- Find-replace operations
- Pattern additions/removals
- Config updates
- Simple string changes

**Claude direct = Complex, nuanced, needs reasoning**
- Bug fixes
- Type inference
- Refactoring
- Documentation
- Architecture
- Optimization

**Use Gemini for speed. Use Claude for brains.**
