# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Project**: Composer — a visual AI workflow builder. Live at [composer.design](https://composer.design)

## Build Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm test         # Run Vitest unit tests (65 tests)
npm run start    # Start production server
```

## Git & GitHub

**GitHub CLI installed**: Prefer using `gh` commands for GitHub operations (creating PRs, viewing issues, etc.) over web-based workflows.

For Git operations, use standard `git` commands (commit, checkout, push, pull, branch, etc.).

## Environment Setup

**Node.js 24+** required. Use `nvm use` to activate the version in `.nvmrc`.

Requires API keys for the AI providers you want to use:
- `OPENAI_API_KEY` - For OpenAI models
- `GOOGLE_GENERATIVE_AI_API_KEY` - For Google Gemini models
- `ANTHROPIC_API_KEY` - For Anthropic Claude models

Supabase authentication:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` - Supabase anon/publishable key

See @docs/AI_MODELS.md for the full list of supported models per provider.

## Database

This project uses **Supabase** for the database. Use the **Supabase MCP tools** (`mcp__supabase__*`) for all database operations including:
- Querying and modifying data (`mcp__supabase__execute_sql`)
- Creating and applying migrations (`mcp__supabase__apply_migration`)
- Listing tables and extensions (`mcp__supabase__list_tables`, `mcp__supabase__list_extensions`)
- Generating TypeScript types (`mcp__supabase__generate_typescript_types`)
- Managing Edge Functions (`mcp__supabase__deploy_edge_function`)
- Viewing logs and advisories (`mcp__supabase__get_logs`, `mcp__supabase__get_advisors`)

For documentation, use `mcp__supabase__search_docs` to query the Supabase docs via GraphQL.

## Skills

### Supabase Skill

Invoke `/supabase` to load the router. Provides guides for SQL style, functions, migrations, RLS policies, Edge Functions, and Realtime.

### Node Creation Skill

Invoke `/node-creation` for step-by-step guides: types → component → execution → autopilot → sidebar → validation. Templates in `TEMPLATES.md`.

### Content Design Skill

Invoke `/content-design` when writing or modifying user-facing text for capitalization rules, placeholder patterns, and UI conventions.

### Gemini Agents Skill

Invoke `/gemini-agents` for high-velocity parallel code changes. Spawns 2-4 agents using Gemini CLI (`gemini --model gemini-3-flash`) for quick, low-complexity edits across multiple files simultaneously. Use for batch operations like import updates, renames, pattern fixes. NOT for complex edits—Claude handles those directly.

## Architecture Overview

This is an AI agent workflow builder using Next.js 16 App Router with React Flow for visual flow editing.

**Detailed documentation is in `.claude/rules/`** - these files are automatically loaded as project memory.

### Quick Reference

| Topic | Rule File | Key Components |
|-------|-----------|----------------|
| Core architecture | `architecture.md` | Flow editor, providers, edges, sidebars |
| Node types | `nodes.md` | All 9 node types and their features |
| Execution | `execution.md` | Engine, API routes, execution hooks |
| Autopilot | `autopilot.md` | AI chat interface, flow generation |
| Collaboration | `collaboration.md` | Live sharing, cursors, owner-funded execution |
| Auth & Storage | `auth-storage.md` | Supabase auth, API keys, flow persistence |
| Audio & Realtime | `audio-realtime.md` | Audio registry, WebRTC, voice conversation |
| Type System | `types.md` | Node data interfaces, port types |
| UI & Motion | `ui-motion.md` | shadcn/ui, motion.dev animations |
| Testing | `testing.md` | Vitest tests, mobile blocker, NUX |

### Node Types Summary

- `text-input`: Text entry point
- `image-input`: Image upload entry point
- `text-generation`: LLM prompt execution (multi-provider)
- `image-generation`: AI image generation
- `ai-logic`: Custom code transformation
- `react-component`: AI-generated React components
- `realtime-conversation`: Real-time voice conversation (OpenAI Realtime API)
- `comment`: Annotation boxes
- `preview-output`: Flow exit point

### Port Data Types

Color-coded connections: cyan=string, purple=image, amber=response, emerald=audio

### Key Patterns

**IMPORTANT: Always consult @docs/AI_MODELS.md for the authoritative list of model IDs.** Do not hardcode or assume model names.

**Documentation Lookup**: Use the **Context7 MCP tools** (`mcp__context7__resolve-library-id` and `mcp__context7__get-library-docs`) to fetch the latest documentation for any libraries or SDKs. Note: `docs/AI_MODELS.md` supersedes Context7 for model information.

**AI Elements**: Use the AI Elements MCP (`mcp__ai-elements__get_ai_elements_components` and `mcp__ai-elements__get_ai_elements_component`) to discover and add UI components.
