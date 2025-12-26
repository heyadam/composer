# Gemini CLI Usage

Gemini CLI is the **primary tool** agents use for quick, low-complexity edits.

## Core Philosophy

**Gemini = Quick & Simple, Claude = Complex & Nuanced**

This skill exists because Gemini can make fast, parallel edits across many files. Use it for:
- High velocity batch operations
- Simple, well-defined changes
- Repetitive tasks at scale

**DON'T use this skill for complex work** - Claude handles that directly with better reasoning.

## Model Specification

**ALWAYS use `--model gemini-3-flash`**

```bash
# Correct - always specify model
gemini --model gemini-3-flash "Update import from @/old to @/new. Use replace tool."

# Wrong - missing model
gemini "Update import..."  # ❌
```

## Ideal Tasks for Gemini Agents

### ✅ Perfect for Gemini (Quick, Simple)

| Task | Why Gemini |
|------|------------|
| Update import paths | Find-and-replace across files |
| Rename variables/functions | Simple string replacement |
| Add displayName to components | Pattern addition |
| Fix simple linting errors | Well-defined fixes |
| Update config values | Known location, simple change |
| Add missing semicolons | Pattern fix |
| Remove unused imports | Line deletion |

### ❌ NOT for Gemini (Complex - Claude handles these)

| Task | Why Claude Instead |
|------|-------------------|
| Refactor class to hooks | Requires understanding state/lifecycle |
| Fix complex bugs | Requires reasoning about cause |
| Architectural changes | Requires understanding system |
| Add comprehensive types | Requires type inference |
| Optimize algorithms | Requires understanding correctness |
| Extract duplicated logic | Requires identifying patterns |

**Rule of thumb**: If you can describe it in one simple sentence, Gemini can do it. If you need to explain context or reasoning, Claude should do it directly.

## Standard Command Patterns

### Basic Edit

```bash
gemini --model gemini-3-flash "Replace all imports from '@/lib/old' with '@/lib/new'. Use replace tool."
```

### Pattern Addition

```bash
gemini --model gemini-3-flash "Add Button.displayName = 'Button'; after each component definition. Use replace tool."
```

### Simple Fix

```bash
gemini --model gemini-3-flash "Add 'use client' directive at the top of this file. Use replace tool."
```

### Rename

```bash
gemini --model gemini-3-flash "Rename all occurrences of 'oldFunction' to 'newFunction'. Use replace tool."
```

### Remove Pattern

```bash
gemini --model gemini-3-flash "Remove all console.log statements. Use replace tool."
```

## Prompt Best Practices

### ✅ Good Prompts (Simple, Direct)

```bash
# Clear, one-sentence task
gemini --model gemini-3-flash "Change import path from '@/utils' to '@/lib/utils'. Use replace tool."

# Specific pattern
gemini --model gemini-3-flash "Add 'export' before 'const' on line 15. Use replace tool."

# Simple transformation
gemini --model gemini-3-flash "Replace var with const throughout this file. Use replace tool."
```

### ❌ Bad Prompts (Too Complex - Claude should handle)

```bash
# Requires understanding - DON'T use Gemini
gemini --model gemini-3-flash "Refactor this code to be more efficient"  # ❌

# Requires judgment - DON'T use Gemini
gemini --model gemini-3-flash "Fix the bug in this function"  # ❌

# Requires context - DON'T use Gemini
gemini --model gemini-3-flash "Add appropriate error handling"  # ❌
```

## Decision: Gemini or Claude?

```
Can you describe the change in one simple sentence?
├─ YES → Use Gemini agents (fast, parallel)
│  "Update import path X to Y"
│  "Add displayName to component"
│  "Rename function A to B"
│
└─ NO → Claude handles directly (better reasoning)
   "Refactor to improve performance"
   "Fix the race condition"
   "Add proper error handling"
```

## Agent Prompt Template

When spawning agents, give them simple Gemini commands:

```markdown
You are Agent 1 of 3. Your task:

**Files assigned**: [FILE_PATHS]

**Task**: Update import paths from `@/old` to `@/new`

**Command to run for each file**:
```bash
gemini --model gemini-3-flash "Update all imports from '@/old' to '@/new' in this file. Use replace tool."
```

**Report back**: | File | Status | Changes Made |
```

## Piped Input (For Larger Context)

When file context helps:

```bash
cat path/to/file.ts | gemini --model gemini-3-flash "Add semicolons to all lines missing them. Use replace tool."
```

## Troubleshooting

### Gemini makes unexpected changes

**Cause**: Prompt too vague
**Fix**: Be more specific

```bash
# Bad - vague
gemini --model gemini-3-flash "Clean up this file"

# Good - specific
gemini --model gemini-3-flash "Remove all console.log statements. Use replace tool."
```

### Gemini doesn't make any changes

**Cause**: Prompt unclear about what tool to use
**Fix**: Always include "Use replace tool"

```bash
# Missing tool instruction
gemini --model gemini-3-flash "Update imports"

# With tool instruction
gemini --model gemini-3-flash "Update imports from @/old to @/new. Use replace tool."
```

### Task seems too complex for Gemini

**Cause**: Task requires reasoning, not just editing
**Fix**: Don't use this skill - have Claude handle it directly

```
User: "Refactor this component to be more performant"
→ Too complex for Gemini
→ Claude handles directly with proper analysis
```

## Summary

| Gemini Agents | Claude Direct |
|---------------|---------------|
| Quick edits | Complex refactoring |
| Pattern replacement | Bug fixes requiring analysis |
| Batch operations | Architectural changes |
| Simple additions | Nuanced improvements |
| High velocity | High quality reasoning |

**Use Gemini for speed. Use Claude for brains.**
