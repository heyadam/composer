"use client";

import type { ReactNode } from "react";

interface HeroPanelProps {
  children: ReactNode;
}

/**
 * Shared wrapper for hero panels with background styling and vignette effect.
 */
export function HeroPanel({ children }: HeroPanelProps) {
  return (
    <div className="relative h-full w-full overflow-hidden border bg-muted/40">
      {/* Background polish */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_30%_20%,hsl(var(--primary)/0.20),transparent_55%),radial-gradient(900px_circle_at_70%_80%,hsl(var(--foreground)/0.10),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px]"
      />
      {children}

      {/* Soft vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent"
      />
    </div>
  );
}
