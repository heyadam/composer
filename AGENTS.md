# AGENTS.md

This file is a quick-reference guide for coding agents working in this repo.

## Project Summary
- **Project**: Composer — a visual AI workflow builder (Next.js 16 App Router)
- **Primary UI**: `components/Flow/AgentFlow.tsx` (main canvas + top bar)
- **Auth**: Supabase + Google OAuth (see `lib/auth/`)

## Key Commands
```bash
nvm use          # Activate Node.js 24 from .nvmrc
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Lint
npm test         # Run Vitest unit tests
npm run start    # Start production server
```

## Environment Variables
Required for local auth + providers:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `ANTHROPIC_API_KEY`

Required for owner-funded execution:
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` (32-byte hex string for AES-256-GCM)

## Supabase (MCP Required)
- Use the Supabase MCP tools (`mcp__supabase__*`) for DB actions.
- Core tables: `profiles`, `flows`, `user_api_keys`, `flow_execution_log` (all RLS enabled).
- Key RPCs: `get_owner_keys_for_execution`, `check_and_log_run` (rate limiting).
- OAuth redirect URL: `/auth/callback` (see `app/auth/callback/route.ts`).

## Auth & Profile UI
- **Auth Provider**: `lib/auth/context.tsx` (workarounds for client hanging).
- **Profile UI**: `components/Flow/ProfileDropdown.tsx` (sign-in/out + avatar).
- **Top Bar**: `components/Flow/AgentFlow.tsx` renders the profile control.
- **Proxy**: `proxy.ts` uses `lib/supabase/proxy.ts` to refresh Supabase sessions.

## Live Publishing & Collaboration
- **UI**: `components/Flow/ShareDialog.tsx` (publish) + `components/Flow/LiveSettingsPopover.tsx` (live controls).
- **Publish callback**: `onPublish(flowId, liveId, shareToken, useOwnerKeys)` in `components/Flow/ShareDialog.tsx`.
- **State guard**: `components/Flow/AgentFlow.tsx` ties published state to `flowId` to avoid stale load overrides.
- **Collaborator entry**: `app/[code]/[token]/page.tsx` loads live flow for collaborators.
- **Real-time sync**: Supabase Broadcast (node/edge changes) + Presence (collaborator tracking).
- **Owner-funded execution**: Owner can share API keys with collaborators (rate-limited: 10/min, 100/day).
- **Auto-unpublish**: Flow unpublishes when owner leaves (uses `navigator.sendBeacon`).

## Architecture Highlights
- Node types live in `components/Flow/nodes/`.
- Execution engine: `lib/execution/engine.ts`.
- Core hooks in `lib/hooks/`:
  - `useFlowExecution.ts`: Execution state, run/cancel/reset
  - `useAutopilotIntegration.ts`: Autopilot apply/undo, highlight management
  - `useNodeParenting.ts`: Comment auto-parenting, deletion cascading
  - `useFlowOperations.ts`: Flow save/load/template operations
  - `useCollaboration.ts`: Real-time sync, Supabase Presence, cursor tracking
  - `useUndoRedo.ts`: Snapshot-based undo/redo with keyboard shortcuts
  - `useResizableSidebar.ts`: Drag-to-resize with SSR-safe localStorage persistence
- Collaboration: `CollaboratorCursors.tsx` + `usePerfectCursor.ts` for smooth cursor animations.
- Motion animations: `lib/motion/presets.ts` (spring configs) + sidebars use motion.dev for open/close.
- Encryption: `lib/encryption.ts` (AES-256-GCM for API key storage).
- Service client: `lib/supabase/service.ts` (server-only, for owner key access).
- Shared API helpers: `lib/api/providers.ts` (e.g., `getAnthropicClient`)
- Model list: `docs/AI_MODELS.md` is the source of truth.
- Design text standards: use `/content-design` skill.
- Tests: `lib/hooks/__tests__/` using Vitest + React Testing Library (65 tests).

## New User Experience (NUX)
- **Welcome Dialog**: `components/Flow/WelcomeDialog/` — three-step onboarding.
- **State**: Persisted to `avy-nux-step` in localStorage (values: `1`, `2`, `3`, `done`).
- **Step 1**: Welcome + Google sign-in (or skip), interactive React Flow demo.
- **Step 2**: API keys intro explaining benefits (skip option).
- **Step 3**: API keys form with inputs + VIP code unlock (skip option).
- **Heroes**: Interactive demo (step 1) and 3D provider icons (step 2).

## When Unsure
- Check `CLAUDE.md` for deeper architecture and component notes.
