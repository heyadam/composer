---
name: gemini-agents
description: High-velocity parallel code changes using Gemini CLI. Spawn 2-4 agents where each uses Gemini CLI for quick, low-complexity edits across multiple files simultaneously. Claude directs, Gemini executes simple changes fast. Use for batch operations like import updates, renames, pattern fixes, and other repetitive tasks. NOT for complex edits - Claude handles those directly.
---

# Gemini Agents Skill

**High velocity, low complexity** - Use Gemini CLI for quick parallel edits that Claude directs.

## Core Philosophy

**Claude = Complex, Gemini = Quick**

- **Claude handles**: Complex refactoring, architectural changes, nuanced edits, anything requiring deep understanding
- **Gemini handles**: Simple, repetitive, well-defined changes where speed matters

**When to use this skill**:
- You have 3+ files needing similar simple changes
- Changes are low-complexity (imports, renames, pattern fixes)
- You want high velocity / parallel execution
- Claude can describe the change in a simple prompt

**When NOT to use this skill**:
- Complex transformations (Claude does these directly)
- Changes requiring nuanced judgment
- Architectural refactoring
- Anything where you'd want Claude's reasoning

## Agent Count Matrix

| Files/Tasks | Agents | Rationale |
|-------------|--------|-----------|
| 1-2 | 0 (don't use skill) | Claude direct is faster |
| 3-5 | 2-3 | Optimal parallelization |
| 6-10 | 3-4 | Sweet spot for coordination |
| 10+ | 4 (max) | Avoid resource contention |

## When to Use

- **Batch operations**: 3+ files need similar simple changes
- **Repetitive tasks**: Import updates, renames, pattern fixes, simple additions
- **Well-defined changes**: Can be described in a short prompt
- **Parallel-safe**: No interdependencies between files
- **Speed priority**: You want changes done fast, not perfectly reasoned
- **User keywords**: "batch", "parallel", "all files in...", "quick changes"

## Available Guides

| Guide | Purpose |
|-------|---------|
| [AGENT_PROMPTS.md](AGENT_PROMPTS.md) | Template prompts for instructing agents |
| [WORK_DIVISION.md](WORK_DIVISION.md) | Strategies for dividing work across agents |
| [TASK_TYPES.md](TASK_TYPES.md) | Task types suited for Gemini (simple) vs Claude (complex) |
| [GEMINI_USAGE.md](GEMINI_USAGE.md) | Gemini CLI command patterns and best practices |
| [EXAMPLES.md](EXAMPLES.md) | Real-world usage examples |

## Quick Start Workflow

1. **Analyze task**: Identify file count, task type, dependencies
2. **Decide agent count**: Use matrix above
3. **Divide work**: Load WORK_DIVISION.md for strategy
4. **Craft prompts**: Load AGENT_PROMPTS.md for template
5. **Spawn agents**: Launch general-purpose agents in parallel
6. **Aggregate results**: Collect status reports, present summary table

## Coordination Pattern

```markdown
Claude (Coordinator):
├─ Analyzes task: Is this simple/repetitive? → Use this skill
├─                Is this complex? → Claude handles directly (no agents)
├─ Divides work (by directory, feature, or size)
├─ Spawns 2-4 general-purpose agents in parallel
├─ Each agent:
│  ├─ Runs Gemini CLI: gemini --model gemini-3-flash "simple prompt"
│  ├─ Gemini makes quick edits to assigned files
│  └─ Reports: | File | Status | Changes Made |
└─ Aggregates results into summary table
```

## Result Format

Present aggregated results as:

```markdown
## Batch Operation Results

| File | Agent | Status | Changes Made |
|------|-------|--------|--------------|
| path/to/A.ts | 1 | ✓ Success | Updated 3 imports |
| path/to/B.ts | 1 | ✓ Success | Added type annotations |
| path/to/C.ts | 2 | ✗ Failed | [Error message] |

**Summary**:
- Total files: N
- Successful: X
- Failed: Y
- Time saved: ~Z% (parallel vs sequential)

**Next steps**: [Recommendations for failed files or validation]
```

## Safety Guidelines

- **Pre-flight check**: Recommend `git status` before operations
- **Error isolation**: Single file failure doesn't block other agents
- **Partial results**: Always report what succeeded, even if some failed
- **Validation**: Suggest running tests/linters after changes
- **Rollback**: Remind user they can use `git diff` to review changes

## Key Principles

1. **Claude = Complex, Gemini = Quick**: Never delegate complex work to Gemini
2. **High velocity**: Use this skill when speed matters more than perfect reasoning
3. **Simple prompts**: If you can't describe the change in one sentence, it's too complex for Gemini
4. **Gemini CLI primary**: Agents run `gemini --model gemini-3-flash` for all edits
5. **Parallel execution**: 2-4 agents working simultaneously = faster results
6. **Clear task division**: Each agent gets specific, independent, simple work
7. **Fail gracefully**: Partial success is still valuable
