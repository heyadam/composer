# AGENTS.md

This file is a quick-reference guide for coding agents working in this repo.

## Project Summary
- **Project**: Composer — a visual AI workflow builder (Next.js 16 App Router)
- **Primary UI**: `components/Flow/AgentFlow.tsx` (main canvas + top bar)
- **Auth**: Supabase + Google OAuth (see `lib/auth/`)

## Key Commands
```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Lint
npm run start    # Start production server
```

## Environment Variables
Required for local auth + providers:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `ANTHROPIC_API_KEY`

## Supabase (MCP Required)
- Use the Supabase MCP tools (`mcp__supabase__*`) for DB actions.
- Core tables: `profiles` (RLS enabled).
- OAuth redirect URL: `/auth/callback` (see `app/auth/callback/route.ts`).

## Auth & Profile UI
- **Auth Provider**: `lib/auth/context.tsx` (workarounds for client hanging).
- **Profile UI**: `components/Flow/ProfileDropdown.tsx` (sign-in/out + avatar).
- **Top Bar**: `components/Flow/AgentFlow.tsx` renders the profile control.
- **Proxy**: `proxy.ts` uses `lib/supabase/proxy.ts` to refresh Supabase sessions.

## Architecture Highlights
- Node types live in `components/Flow/nodes/`.
- Execution engine: `lib/execution/engine.ts`.
- Model list: `docs/AI_MODELS.md` is the source of truth.
- Design text standards: use `/content-design` skill.

## New User Experience (NUX)
- **Welcome Dialog**: `components/Flow/WelcomeDialog/` — two-step onboarding.
- **State**: Persisted to `avy-nux-step` in localStorage (values: `1`, `2`, `done`).
- **Step 1**: Welcome + Google sign-in (or skip).
- **Step 2**: API keys setup prompt.
- **Heroes**: Interactive React Flow demo (step 1) and 3D provider icons (step 2).

## When Unsure
- Check `CLAUDE.md` for deeper architecture and component notes.
