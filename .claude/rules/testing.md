# Testing & Mobile

## Unit Tests

Unit tests use **Vitest** with React Testing Library. Test files are in `lib/hooks/__tests__/`:
- `useFlowExecution.test.ts`: Tests for flow execution hook
- `useAutopilotIntegration.test.ts`: Tests for autopilot integration hook
- `useNodeParenting.test.ts`: Tests for node parenting behavior (comment auto-parenting, deletion cascading)
- `useFlowOperations.test.ts`: Tests for flow file operations (save, load, templates)
- `useUndoRedo.test.ts`: Tests for undo/redo functionality (snapshot management, keyboard shortcuts)

Run tests with `npm test` (65 tests) or `npm run test:watch` for watch mode.

## Mobile Support

**Mobile Blocker** (`components/Flow/MobileBlocker.tsx`): Full-screen blocker for mobile devices:
- Detects mobile via user agent (not screen width) using `useMobileDetection` hook
- Shows animated 3D orb with "composer" branding
- Renders via portal to `document.body` for proper iOS Safari coverage
- Uses `100svh` and `-webkit-fill-available` for full viewport coverage
- Prevents heavy flow editor from loading on mobile (checked in `app/page.tsx`)

**Mobile Detection Hook** (`lib/hooks/useMobileDetection.ts`): SSR-safe hook that returns `null` until checked, then `true`/`false` based on user agent regex matching mobile devices.

## New User Experience (NUX)

**Welcome Dialog** (`components/Flow/WelcomeDialog/`): Three-step onboarding flow for new users:
- `index.tsx`: Main dialog controller with step logic
- `DialogShell.tsx`: Shared two-column layout (content left, hero right)
- `StepIndicator.tsx`: Progress dots showing current step
- `hooks/useNuxState.ts`: Manages NUX step state (`"1"` | `"2"` | `"3"` | `"done"`) persisted to localStorage
- `heroes/DemoHero.tsx`: Interactive React Flow demo that auto-executes on mount
- `heroes/ProvidersHero.tsx`: 3D scene showing provider icons flowing into Composer
- `heroes/DemoOutputsModal.tsx`: Modal for viewing demo execution outputs
- `heroes/HeroPanel.tsx`: Shared panel wrapper for hero content
- `three/`: 3D components (RoundedTile, CurvedLine, SvgIcon, GoogleIcon, ComposerIcon)

**NUX Steps**:
1. Welcome with sign-in options (Google OAuth or skip), interactive demo hero
2. API keys introduction explaining benefits (control, privacy, mix providers)
3. API keys form with inputs for Anthropic, OpenAI, Google Gemini, VIP code unlock

State persisted to `avy-nux-step` in localStorage.

**useNuxState** (`lib/hooks/useNuxState.ts`): Manages NUX step state (`"1"` | `"2"` | `"3"` | `"done"`) persisted to localStorage.

**useDemoExecution** (`lib/hooks/useDemoExecution.ts`): Auto-executes welcome-preview flow for NUX Step 1 demo.
