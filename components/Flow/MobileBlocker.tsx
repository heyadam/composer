"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Logo3D } from "@/components/Logo3D";

/**
 * Full-screen blocker shown on mobile devices.
 * Renders via portal to escape any parent transforms that break fixed positioning.
 */
export function MobileBlocker() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100svh",
        minHeight: "-webkit-fill-available",
        zIndex: 99999,
      }}
      className="flex flex-col items-center justify-center bg-background px-8"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mobile-blocker-title"
      aria-describedby="mobile-blocker-desc"
    >
      {/* Logo */}
      <div className="mb-6">
        <Logo3D size={120} />
      </div>

      {/* Title */}
      <h1
        id="mobile-blocker-title"
        className="text-3xl font-medium tracking-wide text-white"
      >
        composer
      </h1>

      {/* Divider */}
      <div className="my-8 h-px w-16 bg-white/20" />

      {/* Message */}
      <p
        id="mobile-blocker-desc"
        className="max-w-[280px] text-center text-base text-muted-foreground"
      >
        Composer is designed for larger screens.
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground/70">
        Please visit on a desktop or laptop.
      </p>
    </div>,
    document.body
  );
}
