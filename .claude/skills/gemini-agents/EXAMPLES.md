# Usage Examples

Real-world scenarios demonstrating the gemini-agents skill in action.

## Example 1: Update Import Paths

### User Request
```
Update all imports from @/lib/old-utils to @/lib/utils across these 5 files:
- src/components/UserProfile.tsx
- src/components/Dashboard.tsx
- src/components/Settings.tsx
- src/hooks/useData.ts
- src/hooks/useFetch.ts
```

### Claude's Response

I'll use the gemini-agents skill to handle this in parallel.

**Analysis**:
- 5 files total
- Simple import path replacement (one-sentence task)
- Can group by directory (components vs hooks)

**Division Strategy**: Directory-based, 2 agents
- Agent 1: src/components/* (3 files)
- Agent 2: src/hooks/* (2 files)

**Spawning agents...**

### Agent 1 Prompt

```markdown
You are Agent 1 of 2. Your task:

**Files assigned**:
- src/components/UserProfile.tsx
- src/components/Dashboard.tsx
- src/components/Settings.tsx

**Task**: Update import path from `@/lib/old-utils` to `@/lib/utils`

**For each file, run**:
```bash
gemini -y -m gemini-3-flash-preview "Replace all imports from '@/lib/old-utils' with '@/lib/utils'. Use replace tool."
```

**Report back**:
| File | Status | Changes Made |
|------|--------|--------------|
```

### Agent 2 Prompt

```markdown
You are Agent 2 of 2. Your task:

**Files assigned**:
- src/hooks/useData.ts
- src/hooks/useFetch.ts

**Task**: Update import path from `@/lib/old-utils` to `@/lib/utils`

**For each file, run**:
```bash
gemini -y -m gemini-3-flash-preview "Replace all imports from '@/lib/old-utils' with '@/lib/utils'. Use replace tool."
```

**Report back**:
| File | Status | Changes Made |
|------|--------|--------------|
```

### Aggregated Results

```markdown
## Batch Operation Results

| File | Agent | Status | Changes Made |
|------|-------|--------|--------------|
| src/components/UserProfile.tsx | 1 | ✓ Success | Updated 2 imports |
| src/components/Dashboard.tsx | 1 | ✓ Success | Updated 3 imports |
| src/components/Settings.tsx | 1 | ✓ Success | Updated 1 import |
| src/hooks/useData.ts | 2 | ✓ Success | Updated 2 imports |
| src/hooks/useFetch.ts | 2 | ✓ Success | Updated 1 import |

**Summary**:
- Total files: 5
- Successful: 5
- Failed: 0
- Time saved: ~60% (parallel vs sequential)

**Next steps**: Run `npm run typecheck` to verify all imports resolve correctly
```

---

## Example 2: Add displayName to Components

### User Request
```
Fix ESLint errors by adding displayName to all React components in these 8 files:
- src/components/auth/LoginForm.tsx
- src/components/auth/SignupForm.tsx
- src/components/dashboard/Header.tsx
- src/components/dashboard/Sidebar.tsx
- src/components/dashboard/Footer.tsx
- src/components/profile/Avatar.tsx
- src/components/profile/Settings.tsx
- src/components/profile/Preferences.tsx
```

### Claude's Response

I'll use gemini-agents with 3 agents, grouping by feature directory.

**Division Strategy**: Feature-based
- Agent 1: auth/* (2 files)
- Agent 2: dashboard/* (3 files)
- Agent 3: profile/* (3 files)

### Agent Prompt Template

Each agent receives:
```markdown
**For each file, run**:
```bash
gemini -y -m gemini-3-flash-preview "Add ComponentName.displayName = 'ComponentName'; after each exported component definition. Use replace tool."
```
```

### Aggregated Results

```markdown
## Batch Operation Results

| File | Agent | Status | Changes Made |
|------|-------|--------|--------------|
| src/components/auth/LoginForm.tsx | 1 | ✓ Success | Added displayName to LoginForm |
| src/components/auth/SignupForm.tsx | 1 | ✓ Success | Added displayName to SignupForm |
| src/components/dashboard/Header.tsx | 2 | ✓ Success | Added displayName to Header |
| src/components/dashboard/Sidebar.tsx | 2 | ✓ Success | Added displayName to Sidebar |
| src/components/dashboard/Footer.tsx | 2 | ✓ Success | Added displayName to Footer |
| src/components/profile/Avatar.tsx | 3 | ✓ Success | Added displayName to Avatar |
| src/components/profile/Settings.tsx | 3 | ✓ Success | Added displayName to Settings |
| src/components/profile/Preferences.tsx | 3 | ✓ Success | Added displayName to Preferences |

**Summary**:
- Total files: 8
- Successful: 8
- Time saved: ~70% (3 agents in parallel)

**Next steps**: Run `npm run lint` to verify ESLint errors are resolved
```

---

## Example 3: Rename Component Across Files

### User Request
```
Rename Button component to PrimaryButton across these 6 files:
- src/components/Button.tsx (definition)
- src/components/Form.tsx (usage)
- src/components/Modal.tsx (usage)
- src/components/Toolbar.tsx (usage)
- src/components/Settings.tsx (usage)
- src/components/Profile.tsx (usage)
```

### Claude's Response

I'll use gemini-agents with 3 agents, alphabetically grouped.

**Division Strategy**: Alphabetical (2 files each)
- Agent 1: Button.tsx, Form.tsx
- Agent 2: Modal.tsx, Settings.tsx
- Agent 3: Toolbar.tsx, Profile.tsx

### Agent Instructions

Each agent runs:
```bash
gemini -y -m gemini-3-flash-preview "Rename all occurrences of 'Button' to 'PrimaryButton'. Include imports, exports, JSX tags, and type references. Use replace tool."
```

### Aggregated Results

```markdown
## Batch Operation Results

| File | Agent | Status | Changes Made |
|------|-------|--------|--------------|
| src/components/Button.tsx | 1 | ✓ Success | Renamed component definition + export |
| src/components/Form.tsx | 1 | ✓ Success | Updated 2 imports + 3 usages |
| src/components/Modal.tsx | 2 | ✓ Success | Updated 1 import + 1 usage |
| src/components/Settings.tsx | 2 | ✓ Success | Updated 1 import + 2 usages |
| src/components/Toolbar.tsx | 3 | ✓ Success | Updated 1 import + 4 usages |
| src/components/Profile.tsx | 3 | ✓ Success | Updated 1 import + 1 usage |

**Summary**:
- Total files: 6
- Successful: 6
- Total renamings: 20+ occurrences

**Next steps**: Run tests to verify component still works correctly
```

---

## Example 4: Remove console.log Statements

### User Request
```
Remove all console.log statements from these files:
- src/lib/api.ts
- src/lib/auth.ts
- src/lib/storage.ts
- src/hooks/useData.ts
```

### Claude's Response

I'll use gemini-agents with 2 agents.

**Division Strategy**: Size-balanced
- Agent 1: api.ts, auth.ts
- Agent 2: storage.ts, useData.ts

### Agent Instructions

Each agent runs:
```bash
gemini -y -m gemini-3-flash-preview "Remove all console.log statements from this file. Use replace tool."
```

### Aggregated Results

```markdown
## Batch Operation Results

| File | Agent | Status | Changes Made |
|------|-------|--------|--------------|
| src/lib/api.ts | 1 | ✓ Success | Removed 5 console.log statements |
| src/lib/auth.ts | 1 | ✓ Success | Removed 3 console.log statements |
| src/lib/storage.ts | 2 | ✓ Success | Removed 2 console.log statements |
| src/hooks/useData.ts | 2 | ✓ Success | Removed 4 console.log statements |

**Summary**:
- Total files: 4
- Successful: 4
- Console.logs removed: 14

**Next steps**: Run `npm run build` to verify no build errors
```

---

## Example 5: Add 'use client' Directive

### User Request
```
Add 'use client' directive to these Next.js client components:
- src/components/InteractiveForm.tsx
- src/components/DynamicChart.tsx
- src/components/AnimatedButton.tsx
- src/components/LiveCounter.tsx
- src/components/ModalDialog.tsx
```

### Claude's Response

I'll use gemini-agents with 2 agents.

### Agent Instructions

Each agent runs:
```bash
gemini -y -m gemini-3-flash-preview "Add 'use client' directive at the very top of this file. Use replace tool."
```

### Aggregated Results

```markdown
## Batch Operation Results

| File | Agent | Status | Changes Made |
|------|-------|--------|--------------|
| src/components/InteractiveForm.tsx | 1 | ✓ Success | Added 'use client' |
| src/components/DynamicChart.tsx | 1 | ✓ Success | Added 'use client' |
| src/components/AnimatedButton.tsx | 1 | ✓ Success | Added 'use client' |
| src/components/LiveCounter.tsx | 2 | ✓ Success | Added 'use client' |
| src/components/ModalDialog.tsx | 2 | ✓ Success | Added 'use client' |

**Summary**:
- Total files: 5
- Successful: 5

**Next steps**: Run `npm run build` to verify Next.js compilation
```

---

## Example 6: Error Handling (Partial Failure)

### User Request
```
Update API URLs from old to new across 4 config files
```

### Scenario: One file has syntax error

### Aggregated Results with Failure

```markdown
## Batch Operation Results

| File | Agent | Status | Changes Made |
|------|-------|--------|--------------|
| config/dev.json | 1 | ✓ Success | Updated 3 URLs |
| config/staging.json | 1 | ✓ Success | Updated 3 URLs |
| config/prod.json | 2 | ✗ Failed | Syntax error at line 42: unexpected token |
| config/test.json | 2 | ✓ Success | Updated 2 URLs |

**Summary**:
- Total files: 4
- Successful: 3
- Failed: 1

**Failed file details**:
- **config/prod.json**: File contains syntax error that prevented modification. Fix the syntax error first, then retry.

**Next steps**:
1. Fix syntax error in config/prod.json line 42
2. Re-run URL update for config/prod.json only
3. Validate all config files with `npm run lint`
```

---

## What NOT to Use This Skill For

These tasks are **too complex** for Gemini agents. Claude handles them directly:

### ❌ Convert Class to Hooks
```
User: Convert these 3 class components to functional components with hooks
```
**Why not Gemini**: Requires understanding state management, lifecycle methods, and hook dependencies. Claude handles this directly with proper analysis.

### ❌ Add TypeScript Types
```
User: Add comprehensive TypeScript types to these 4 files
```
**Why not Gemini**: Requires type inference and understanding code semantics. Claude analyzes and adds appropriate types.

### ❌ Fix Bugs
```
User: Fix the race condition in these API calls
```
**Why not Gemini**: Requires reasoning about cause and solution. Claude investigates and implements proper fix.

### ❌ Refactor for Performance
```
User: Optimize these database queries
```
**Why not Gemini**: Requires understanding tradeoffs and system behavior. Claude analyzes and recommends improvements.

---

## Key Patterns Demonstrated

1. **Directory-based division**: Example 1 (components vs hooks)
2. **Feature-based division**: Example 2 (auth vs dashboard vs profile)
3. **Alphabetical division**: Example 3 (when no other pattern fits)
4. **Size-balanced division**: Example 4 (distribute by file count)
5. **Partial failure handling**: Example 6 (graceful degradation)

## Task Suitability Summary

| Example | Task | Suitable for Gemini? | Why |
|---------|------|---------------------|-----|
| 1 | Import updates | ✅ Yes | Simple find-replace |
| 2 | Add displayName | ✅ Yes | Pattern addition |
| 3 | Rename component | ✅ Yes | String replacement |
| 4 | Remove console.log | ✅ Yes | Pattern removal |
| 5 | Add directive | ✅ Yes | Simple addition |
| 6 | Update URLs | ✅ Yes | String replacement |
| - | Class to hooks | ❌ No | Complex transformation |
| - | Add types | ❌ No | Requires inference |
| - | Fix bugs | ❌ No | Requires reasoning |

**Remember: One sentence = Gemini. Needs explanation = Claude.**
