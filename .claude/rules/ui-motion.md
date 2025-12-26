# UI Components & Motion

## UI Framework

Uses shadcn/ui components in `components/ui/` with Tailwind CSS v4. Import alias `@/*` maps to project root.

**Content Design**: When adding or modifying UI text (labels, placeholders, descriptions, tooltips, button text), use the `/content-design` skill (`.claude/skills/content-design/`). This ensures consistent tone and formatting across the application.

**AI Elements**: Use the AI Elements MCP (`mcp__ai-elements__get_ai_elements_components` and `mcp__ai-elements__get_ai_elements_component`) to discover and add UI components. AI Elements registry is configured at `@ai-elements` for components from `https://registry.ai-sdk.dev/`.

## Custom Components

**ThinkingSummary** (`components/ThinkingSummary.tsx`): Reusable collapsible component for displaying AI thinking/reasoning output:
- Props: `reasoning` (required), `defaultExpanded`, `maxHeight`, `className`
- Shows a "Thinking" header with Brain icon, expands to show full reasoning text
- Used in PromptNode footer when Google Gemini thinking is enabled
- Shimmer loading effect while reasoning is streaming

## Motion Animation System

Uses [motion.dev](https://motion.dev) (npm package `motion`) for spring-based animations. See `docs/motion.md` for detailed documentation.

**Motion Presets** (`lib/motion/presets.ts`): Centralized spring animation configurations:
- `springs.smooth`: Balanced default for sidebar open/close (stiffness: 300, damping: 30)
- `springs.snappy`: Quick micro-interactions (stiffness: 400, damping: 25)
- `springs.gentle`: Slow modals/overlays (stiffness: 200, damping: 25)
- `springs.bouncy`: Playful elements (stiffness: 350, damping: 20)
- `getTransition(skipAnimation)`: Returns instant transition during resize, spring otherwise
- `getAccessibleTransition()`: Respects `prefers-reduced-motion` setting

**useResizableSidebar Hook** (`lib/hooks/useResizableSidebar.ts`): Reusable hook for resizable sidebar behavior:
- SSR-safe localStorage persistence (no flash on load)
- RAF-throttled resize for smooth drag
- Global mouse event handling during drag
- Cursor and user-select management
- Returns: `{ width, isResizing, sidebarRef, startResizing }`

**Animation Patterns**:
- Use `initial={false}` to prevent animation on mount
- Use `style` with `willChange: "width"` only during resize
- Use `animate` with spring transition for open/close toggle
- `AnimatedLabel` component in AgentFlow.tsx for nav button labels with AnimatePresence

**Animated Components**:
- `AutopilotSidebar`: Left sidebar with spring open/close, absolute positioned to overlay canvas
- `ResponsesSidebar`: Right sidebar with spring open/close
- Header nav buttons: Labels animate in/out based on available width using `AnimatedLabel`
- Logo container: Animates position when sidebar opens

## Templates Modal

**Templates Modal** (`components/Flow/TemplatesModal/`): New flow creation dialog with AI prompt input:
- `index.tsx`: Main modal component with AI prompt input and template selection
- `templates.ts`: Template definitions loading from `lib/flows/templates/*.avy.json`
- `hooks/useTemplatesModal.ts`: Unified hook managing open/close state, auto-open logic, and "don't show again" persistence
- Features mode selector (Execute/Plan), model selector (Sonnet/Opus), and extended thinking toggle
- Three pre-built templates: Story & Image Gen, Basic Text Gen, Image to Image
- "Start blank" option to dismiss and begin with empty canvas
- Auto-opens when: NUX complete, not collaborating, flow is empty, no cloud flow loaded
