---
name: supabase
description: Supabase development guide for PostgreSQL, RLS policies, migrations, database functions, Edge Functions, and Realtime. Use when working with Supabase, writing SQL, creating migrations, setting up RLS, deploying edge functions, or implementing realtime features.
---

# Supabase Development

This skill provides best practices for Supabase development. Load the relevant guide based on your task.

## Available Guides

| Task | Guide | When to use |
|------|-------|-------------|
| Writing SQL queries | [SQL_STYLE.md](SQL_STYLE.md) | Formatting, naming conventions, query patterns |
| Database functions | [FUNCTIONS.md](FUNCTIONS.md) | Creating PL/pgSQL functions and triggers |
| Schema migrations | [MIGRATIONS.md](MIGRATIONS.md) | Creating migration files with proper RLS |
| RLS policies | [RLS.md](RLS.md) | Row Level Security policies and performance |
| Edge Functions | [EDGE_FUNCTIONS.md](EDGE_FUNCTIONS.md) | Deno/TypeScript serverless functions |
| Realtime | [REALTIME.md](REALTIME.md) | Broadcast, presence, and live subscriptions |

## Quick Reference

### MCP Tools
Always use Supabase MCP tools for database operations:
- `mcp__supabase__execute_sql` - Run queries
- `mcp__supabase__apply_migration` - Apply DDL changes
- `mcp__supabase__list_tables` - List tables
- `mcp__supabase__deploy_edge_function` - Deploy functions
- `mcp__supabase__get_logs` - View logs
- `mcp__supabase__get_advisors` - Security/performance checks
- `mcp__supabase__search_docs` - Search documentation

### Core Principles
1. **Always enable RLS** on new tables
2. **Use `(select auth.uid())`** in policies (with select wrapper for performance)
3. **Qualify table names** with schema (e.g., `public.users`)
4. **Use lowercase SQL** with snake_case identifiers
5. **Prefer `broadcast`** over `postgres_changes` for realtime
