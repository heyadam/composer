# Motion.dev Animation System

Spring animations for Composer using [motion.dev](https://motion.dev).

## Architecture

```
lib/motion/presets.ts      # Spring configs, transitions, reduced motion
lib/hooks/useResizableSidebar.ts  # Reusable resize logic
```

## Quick Start

```tsx
import { motion } from "motion/react";
import { getTransition, springs } from "@/lib/motion/presets";

// Basic spring animation
<motion.div
  animate={{ width: 300 }}
  transition={springs.smooth}
/>

// Dynamic transition (instant vs spring)
<motion.div
  animate={{ width }}
  transition={getTransition(isResizing)}
/>
```

## Presets

### Springs

| Name | Use Case | Feel |
|------|----------|------|
| `smooth` | Sidebar open/close | Balanced, default |
| `snappy` | Micro-interactions | Quick, responsive |
| `gentle` | Modals, overlays | Slow, deliberate |
| `bouncy` | Playful elements | Energetic |

### Helpers

```tsx
import { getTransition, getAccessibleTransition, prefersReducedMotion } from "@/lib/motion/presets";

// Skip animation conditionally
getTransition(isResizing);  // instant if true, spring if false

// Respect prefers-reduced-motion (client-side only)
getAccessibleTransition(isResizing);
```

## Resizable Sidebar Hook

```tsx
import { useResizableSidebar } from "@/lib/hooks/useResizableSidebar";

const { width, isResizing, sidebarRef, startResizing } = useResizableSidebar({
  minWidth: 240,
  maxWidth: 800,
  defaultWidth: 340,
  storageKey: "my-sidebar-width",
  side: "right", // or "left"
});
```

Features:
- SSR-safe localStorage persistence (no flash)
- RAF-throttled resize for smooth drag
- Global mouse event handling during drag
- Cursor and user-select management

## Usage Pattern

```tsx
<motion.div
  initial={false}  // Don't animate on mount
  animate={{ width: w, minWidth: w }}
  style={{ willChange: isResizing ? "width" : "auto" }}
  transition={getTransition(isResizing)}
>
  <div ref={sidebarRef} style={{ width, minWidth: width }}>
    {/* Resize handle */}
    <div onMouseDown={startResizing} />
    {/* Content */}
  </div>
</motion.div>
```

Key points:
1. `initial={false}` — No animation on mount
2. `willChange` only during resize — Avoid constant GPU reservation
3. Dynamic transition — Instant during drag, spring on toggle
4. Outer motion.div clips overflow, inner div holds content

## Files Using Motion

- `components/Flow/ResponsesSidebar/ResponsesSidebar.tsx`
- `components/Flow/AutopilotSidebar/AutopilotSidebar.tsx`
- `components/ai-elements/shimmer.tsx`

## Test Checklist

- [x] Page load with sidebar open — no animation on mount
- [x] Toggle sidebar closed — spring animation
- [x] Toggle sidebar open — spring animation
- [x] Drag resize handle — instant width change, no spring
- [x] Release resize handle, then toggle — spring animation resumes

## Future Expansion

When adding more motion animations:

1. **New spring presets**: Add to `lib/motion/presets.ts`
2. **Resizable panels**: Use `useResizableSidebar` hook
3. **Reduced motion**: Use `getAccessibleTransition()` for accessibility
4. **Shared animations**: Create variants in presets file
