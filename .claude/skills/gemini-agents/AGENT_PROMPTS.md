# Agent Prompts

Template prompts for spawning agents that use Gemini CLI for quick, simple edits.

## Core Principle

**Gemini for speed, Claude for brains**

Each agent runs Gemini CLI commands to make quick, low-complexity edits in parallel. If a task is complex, don't use this skill - Claude handles it directly.

## Prompt Structure

Each agent prompt should contain:

1. **Agent identity**: Which agent number (e.g., "Agent 1 of 3")
2. **Files assigned**: Explicit list of file paths
3. **Simple task**: One-sentence description of the change
4. **Gemini command**: The exact command to run
5. **Reporting format**: Structured output for aggregation

## Standard Template

```markdown
You are Agent [N] of [TOTAL]. Your task:

**Files assigned**:
- [FILE_PATH_1]
- [FILE_PATH_2]
- [FILE_PATH_3]

**Task**: [ONE_SENTENCE_DESCRIPTION]

**For each file, run**:
```bash
gemini --model gemini-3-flash "[SIMPLE_PROMPT]. Use replace tool."
```

**Report back** in this format:
| File | Status | Changes Made |
|------|--------|--------------|
| path/to/file.ts | ✓ Success | Description of changes |
```

**Key**: Keep the Gemini prompt simple. If you can't describe it in one sentence, it's too complex for this skill.

## Task-Specific Templates

### Import Updates

```markdown
You are Agent 1 of 2. Your task:

**Files assigned**:
- src/components/UserProfile.tsx
- src/components/Dashboard.tsx
- src/components/Settings.tsx

**Task**: Update import paths from `@/lib/old-utils` to `@/lib/utils`

**For each file, run**:
```bash
gemini --model gemini-3-flash "Replace all imports from '@/lib/old-utils' with '@/lib/utils'. Use replace tool."
```

**Report back**:
| File | Status | Changes Made |
|------|--------|--------------|
```

### Pattern Fixes (displayName)

```markdown
You are Agent 1 of 3. Your task:

**Files assigned**:
- src/components/Button.tsx
- src/components/Input.tsx
- src/components/Select.tsx

**Task**: Add displayName to all React components

**For each file, run**:
```bash
gemini --model gemini-3-flash "Add ComponentName.displayName = 'ComponentName'; after each exported component. Use replace tool."
```

**Report back**:
| File | Status | Changes Made |
|------|--------|--------------|
```

### Rename Variable/Function

```markdown
You are Agent 2 of 3. Your task:

**Files assigned**:
- src/lib/utils.ts
- src/lib/api.ts

**Task**: Rename `oldFunction` to `newFunction`

**For each file, run**:
```bash
gemini --model gemini-3-flash "Rename all occurrences of 'oldFunction' to 'newFunction'. Use replace tool."
```

**Report back**:
| File | Status | Changes Made |
|------|--------|--------------|
```

### Remove Pattern

```markdown
You are Agent 1 of 2. Your task:

**Files assigned**:
- src/components/Dashboard.tsx
- src/components/Profile.tsx

**Task**: Remove all console.log statements

**For each file, run**:
```bash
gemini --model gemini-3-flash "Remove all console.log statements from this file. Use replace tool."
```

**Report back**:
| File | Status | Changes Made |
|------|--------|--------------|
```

### Add Directive

```markdown
You are Agent 1 of 4. Your task:

**Files assigned**:
- src/components/ClientComponent.tsx
- src/components/InteractiveWidget.tsx

**Task**: Add 'use client' directive

**For each file, run**:
```bash
gemini --model gemini-3-flash "Add 'use client' directive at the very top of this file. Use replace tool."
```

**Report back**:
| File | Status | Changes Made |
|------|--------|--------------|
```

### Update Config Values

```markdown
You are Agent 1 of 2. Your task:

**Files assigned**:
- config/dev.json
- config/prod.json

**Task**: Update API URL from old to new

**For each file, run**:
```bash
gemini --model gemini-3-flash "Replace 'https://old-api.com' with 'https://new-api.com'. Use replace tool."
```

**Report back**:
| File | Status | Changes Made |
|------|--------|--------------|
```

## What NOT to Delegate

These tasks are **TOO COMPLEX** for Gemini agents. Claude handles them directly:

| Task | Why it's too complex |
|------|---------------------|
| Convert class to hooks | Requires understanding state/lifecycle |
| Add comprehensive types | Requires type inference |
| Fix bugs | Requires reasoning about cause |
| Refactor for performance | Requires understanding tradeoffs |
| Extract duplicated code | Requires pattern recognition |
| Architectural changes | Requires system understanding |

**Rule**: If the Gemini prompt needs more than one sentence, it's too complex. Don't spawn agents - do it yourself.

## Reporting Guidelines

### Success Report

```markdown
| File | Status | Changes Made |
|------|--------|--------------|
| src/components/A.tsx | ✓ Success | Updated 3 import paths |
| src/components/B.tsx | ✓ Success | Updated 2 import paths |
```

### Failure Report

```markdown
| File | Status | Changes Made |
|------|--------|--------------|
| src/components/C.tsx | ✗ Failed | Error: Gemini returned error - syntax issue at line 42 |
```

Include error messages verbatim for debugging.

## Best Practices

1. **Keep prompts simple**: One sentence describing the change
2. **Always specify model**: `--model gemini-3-flash`
3. **Include "Use replace tool"**: Tells Gemini how to make changes
4. **One task type per agent**: Don't mix different change types
5. **Report clearly**: Be specific about what changed
6. **Don't over-complicate**: If task seems complex, Claude handles it directly
