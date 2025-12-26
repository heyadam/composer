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
    <div className="relative h-full w-full overflow-hidden bg-zinc-950/20">
      {/* Background polish */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_30%_20%,hsl(var(--primary)/0.25),transparent_60%),radial-gradient(900px_circle_at_70%_80%,hsl(var(--foreground)/0.15),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,white/5_1px,transparent_1px),linear-gradient(to_bottom,white/5_1px,transparent_1px)] [background-size:48px_48px]"
      />
      {children}

      {/* Soft vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent"
      />
    </div>
  );
}
