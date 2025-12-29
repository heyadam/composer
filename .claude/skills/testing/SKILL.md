---
name: testing
description: Writing and running tests with Vitest and React Testing Library. Use when adding tests for hooks, components, execution engine, or any other functionality.
---

# Testing Skill

Comprehensive guide for writing tests in Composer using Vitest and React Testing Library.

## When to Use

- Adding tests for new features
- Testing custom hooks
- Testing React components
- Testing execution engine logic
- Mocking AI providers and external APIs
- Debugging test failures

## Quick Reference

| Guide | Purpose |
|-------|---------|
| [Setup](SETUP.md) | Configuration, running tests, environment |
| [Patterns](PATTERNS.md) | Core testing patterns and best practices |
| [Hooks](HOOKS.md) | Testing custom React hooks |
| [Execution](EXECUTION.md) | Testing node executors and engine |
| [Mocking](MOCKING.md) | Mocking modules, functions, streams, APIs |
| [Templates](TEMPLATES.md) | Copy-paste templates for common scenarios |

## Test Commands

```bash
npm test          # Run all tests once
npm run test:watch # Run tests in watch mode
```

## Directory Structure

Tests live in `__tests__` directories adjacent to source code:

```
lib/
├── hooks/
│   └── __tests__/
│       ├── useFlowExecution.test.ts
│       └── useFlowOperations.test.ts
├── execution/
│   └── __tests__/
│       ├── executors.test.ts
│       └── streaming.test.ts
│   └── cache/__tests__/
│       └── cache-manager.test.ts
```

## Core Principles

1. **Isolate tests** - Use `beforeEach` to reset state
2. **Use builders** - Create helper functions for test data
3. **Mock at boundaries** - Mock external modules, not internal logic
4. **Test behavior** - Focus on what code does, not how it does it
5. **Keep tests focused** - One concept per test

## Framework Stack

- **Vitest** - Test runner with Jest-compatible API
- **React Testing Library** - Component and hook testing
- **jsdom** - Browser environment simulation
- **vi** - Mocking utilities (vi.fn, vi.mock, vi.spyOn)
