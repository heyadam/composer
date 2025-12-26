# Work Division

Strategies for dividing work across parallel agents.

## Core Principles

1. **Balance workload**: Distribute files evenly across agents
2. **Group related files**: Keep interdependent files in same agent when possible
3. **Minimize dependencies**: Avoid agents needing results from other agents
4. **Respect boundaries**: Don't split tightly coupled code across agents

## Division Strategies

### 1. Directory-Based Division

**When to use**: Files naturally grouped by directory structure

**Pattern**: Assign each agent a specific directory or directory pattern

**Example**:
```
Files to process:
- src/components/UserProfile.tsx
- src/components/Dashboard.tsx
- src/components/Settings.tsx
- src/lib/api-client.ts
- src/lib/storage.ts
- src/hooks/useAuth.ts
- src/hooks/useData.ts

Division (3 agents):
Agent 1: src/components/* (3 files)
Agent 2: src/lib/* (2 files)
Agent 3: src/hooks/* (2 files)
```

**Advantages**:
- Natural grouping
- Easy to reason about
- Respects code organization

**Disadvantages**:
- May be unbalanced if directories have different file counts
- Less flexible

### 2. Feature-Based Division

**When to use**: Files grouped by feature or domain concept

**Pattern**: Assign each agent files related to a specific feature

**Example**:
```
Files to process:
- src/components/UserProfile.tsx
- src/lib/userApi.ts
- src/hooks/useUser.ts
- src/components/ProductList.tsx
- src/lib/productApi.ts
- src/hooks/useProducts.ts
- src/components/OrderHistory.tsx
- src/lib/orderApi.ts

Division (3 agents):
Agent 1: All user-related files (3 files)
  - UserProfile.tsx, userApi.ts, useUser.ts
Agent 2: All product-related files (3 files)
  - ProductList.tsx, productApi.ts, useProducts.ts
Agent 3: All order-related files (2 files)
  - OrderHistory.tsx, orderApi.ts
```

**Advantages**:
- Logical grouping
- Agent understands full context of feature
- Good for related changes

**Disadvantages**:
- Requires understanding feature boundaries
- May not always be obvious

### 3. Size-Balanced Division

**When to use**: Files have varying sizes, need to balance computation time

**Pattern**: Distribute files so each agent has roughly equal LOC (lines of code)

**Example**:
```
Files to process:
- small1.ts (100 lines)
- small2.ts (150 lines)
- small3.ts (120 lines)
- medium1.ts (400 lines)
- medium2.ts (350 lines)
- large.ts (1000 lines)

Division (3 agents):
Agent 1: large.ts (1000 lines)
  - Dedicated to single large file
Agent 2: medium1.ts + medium2.ts (750 lines)
  - Two medium files
Agent 3: small1.ts + small2.ts + small3.ts (370 lines)
  - Three small files

Note: Adjust by adding small files to Agent 3 or splitting differently
```

**Advantages**:
- Even workload distribution
- Efficient parallel execution
- Minimizes slowest agent bottleneck

**Disadvantages**:
- Requires knowing file sizes beforehand
- May split related files

### 4. Alphabetical Division

**When to use**: No other logical grouping exists, need simple division

**Pattern**: Sort files alphabetically, divide into equal chunks

**Example**:
```
Files to process (sorted):
1. api-client.ts
2. auth.ts
3. config.ts
4. dashboard.tsx
5. helpers.ts
6. profile.tsx
7. storage.ts
8. utils.ts

Division (3 agents):
Agent 1: Files 1-3 (api-client, auth, config)
Agent 2: Files 4-6 (dashboard, helpers, profile)
Agent 3: Files 7-8 (storage, utils)
```

**Advantages**:
- Simple, no analysis needed
- Predictable
- Good default when no pattern is obvious

**Disadvantages**:
- May split related files
- Ignores logical relationships

### 5. Dependency-Aware Division

**When to use**: Files have dependencies, need to keep them together

**Pattern**: Analyze imports, group files that import each other

**Example**:
```
Files to process:
- types.ts (no dependencies)
- utils.ts (imports types.ts)
- api.ts (imports types.ts, utils.ts)
- hooks.ts (imports api.ts)
- components.tsx (imports hooks.ts, utils.ts)
- other.ts (no dependencies)

Division (2 agents):
Agent 1: Dependency chain
  - types.ts → utils.ts → api.ts → hooks.ts → components.tsx
Agent 2: Independent file
  - other.ts

Note: Only use when dependencies require sequential processing
Otherwise, separate files can be edited in parallel
```

**Advantages**:
- Respects code dependencies
- Prevents breaking changes

**Disadvantages**:
- Complex to analyze
- May not parallelize well
- Usually unnecessary (most edits don't require dependency order)

## Decision Matrix

| Files | Best Strategy | Rationale |
|-------|---------------|-----------|
| 3-5 files in different dirs | Directory-based | Natural grouping |
| 3-5 files in same feature | Feature-based | Logical cohesion |
| Mix of large/small files | Size-balanced | Even workload |
| No obvious pattern | Alphabetical | Simple default |
| Tightly coupled files | Dependency-aware | Prevent breaks (rare) |

## Agent Count Guidelines

### 3-5 Files → 2-3 Agents

**2 agents**:
- 3 files: 2+1 split
- 4 files: 2+2 split
- 5 files: 3+2 split

**3 agents**:
- 4 files: 2+1+1 (if uneven complexity)
- 5 files: 2+2+1

### 6-10 Files → 3-4 Agents

**3 agents**:
- 6 files: 2+2+2
- 7 files: 3+2+2
- 8 files: 3+3+2
- 9 files: 3+3+3

**4 agents**:
- 8 files: 2+2+2+2
- 9 files: 3+2+2+2
- 10 files: 3+3+2+2

### 10+ Files → 4 Agents (Max)

- Divide as evenly as possible
- Cap at 4 agents to avoid coordination overhead
- Consider if task can be split into multiple skill invocations

## Example Workflows

### Example 1: Update Imports (Directory-Based)

```markdown
Task: Update import paths in 7 files

Files:
- src/components/A.tsx
- src/components/B.tsx
- src/components/C.tsx
- src/lib/utils.ts
- src/lib/api.ts
- src/hooks/useData.ts
- src/hooks/useFetch.ts

Division (3 agents):
- Agent 1: src/components/* (3 files) - A, B, C
- Agent 2: src/lib/* (2 files) - utils, api
- Agent 3: src/hooks/* (2 files) - useData, useFetch
```

### Example 2: Add Types (Size-Balanced)

```markdown
Task: Add TypeScript types to untyped files

Files:
- dashboard.tsx (800 lines)
- profile.tsx (700 lines)
- settings.tsx (150 lines)
- utils.ts (100 lines)
- helpers.ts (80 lines)

Division (3 agents):
- Agent 1: dashboard.tsx (800 lines)
- Agent 2: profile.tsx (700 lines)
- Agent 3: settings.tsx, utils.ts, helpers.ts (330 lines)
```

### Example 3: Fix Linting (Feature-Based)

```markdown
Task: Fix ESLint errors across 6 files

Files:
- UserProfile.tsx (user feature)
- UserSettings.tsx (user feature)
- ProductList.tsx (product feature)
- ProductDetail.tsx (product feature)
- CartView.tsx (cart feature)
- Checkout.tsx (cart feature)

Division (3 agents):
- Agent 1: User feature (UserProfile, UserSettings)
- Agent 2: Product feature (ProductList, ProductDetail)
- Agent 3: Cart feature (CartView, Checkout)
```

## Common Mistakes

1. **Over-splitting**: Spawning 4 agents for 4 small files wastes coordination overhead
2. **Ignoring relationships**: Splitting tightly coupled files causes confusion
3. **Unbalanced loads**: One agent gets 1 file, another gets 10
4. **Complex dependencies**: Assuming agents need sequential order (rarely true for edits)

## Best Practices

1. **Start simple**: Use directory or alphabetical for straightforward tasks
2. **Consider file size**: Large files slow down agents, balance accordingly
3. **Group logically when possible**: Feature-based makes sense when clear
4. **Don't overthink**: Most divisions work fine, just avoid extremes
5. **Validate division**: Quick mental check that it's reasonable before spawning
