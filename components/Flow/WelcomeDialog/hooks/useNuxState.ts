"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "avy-nux-step";

export type NuxStep = "1" | "2" | "3" | "done";

/**
 * Check if NUX is complete (safe to call during render).
 * Returns true if the user has completed or dismissed the NUX.
 */
export function isNuxComplete(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

interface UseNuxStateReturn {
  step: NuxStep;
  isLoaded: boolean;
  advanceToStep2: () => void;
  advanceToStep3: () => void;
  completeNux: () => void;
  backToStep1: () => void;
  backToStep2: () => void;
}

// Helper to read from localStorage (safe for SSR)
function getInitialStep(): NuxStep {
  if (typeof window === "undefined") return "1";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as NuxStep | null;
    if (stored === "1" || stored === "2" || stored === "3" || stored === "done") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "1";
}

export function useNuxState(): UseNuxStateReturn {
  // Initialize with localStorage value if available
  const [step, setStep] = useState<NuxStep>(getInitialStep);
  const [isLoaded, setIsLoaded] = useState(() => typeof window !== "undefined");

  // Handle SSR hydration - mark as loaded after mount
  useEffect(() => {
    // Safe: This only runs once on mount for SSR hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(true);
  }, []);

  const advanceToStep2 = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "2");
    } catch {
      // localStorage unavailable
    }
    setStep("2");
  }, []);

  const advanceToStep3 = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "3");
    } catch {
      // localStorage unavailable
    }
    setStep("3");
  }, []);

  const completeNux = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // localStorage unavailable
    }
    setStep("done");
  }, []);

  const backToStep1 = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable
    }
    setStep("1");
  }, []);

  const backToStep2 = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "2");
    } catch {
      // localStorage unavailable
    }
    setStep("2");
  }, []);

  return {
    step,
    isLoaded,
    advanceToStep2,
    advanceToStep3,
    completeNux,
    backToStep1,
    backToStep2,
  };
}
