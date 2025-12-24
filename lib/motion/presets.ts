import type { Transition } from "motion/react";

/**
 * Motion.dev spring animation presets
 *
 * Usage:
 *   import { springs, getTransition } from "@/lib/motion/presets";
 *
 *   <motion.div transition={springs.smooth} />
 *   <motion.div transition={getTransition(isResizing)} />
 */

// Spring configurations
export const springs = {
  /** Smooth sidebar open/close - balanced feel */
  smooth: {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 1,
  } as const,

  /** Snappy micro-interactions */
  snappy: {
    type: "spring",
    stiffness: 400,
    damping: 25,
    mass: 0.8,
  } as const,

  /** Gentle, slower animations */
  gentle: {
    type: "spring",
    stiffness: 200,
    damping: 25,
    mass: 1.2,
  } as const,

  /** Bouncy, playful feel */
  bouncy: {
    type: "spring",
    stiffness: 350,
    damping: 20,
    mass: 1,
  } as const,
} satisfies Record<string, Transition>;

/** Instant transition (no animation) */
export const instant: Transition = { duration: 0 };

/**
 * Get transition based on whether we want animation or instant update.
 * Respects prefers-reduced-motion when checked client-side.
 *
 * @param skipAnimation - If true, returns instant transition
 * @param spring - Which spring preset to use (default: "smooth")
 */
export function getTransition(
  skipAnimation: boolean,
  spring: keyof typeof springs = "smooth"
): Transition {
  if (skipAnimation) return instant;
  return springs[spring];
}

/**
 * Check if user prefers reduced motion.
 * Only call this client-side (in useEffect or event handlers).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get transition that respects reduced motion preference.
 * Only call this client-side.
 *
 * @param skipAnimation - If true, returns instant transition
 * @param spring - Which spring preset to use (default: "smooth")
 */
export function getAccessibleTransition(
  skipAnimation: boolean,
  spring: keyof typeof springs = "smooth"
): Transition {
  if (skipAnimation || prefersReducedMotion()) return instant;
  return springs[spring];
}
