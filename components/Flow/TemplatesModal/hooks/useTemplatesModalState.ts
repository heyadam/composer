"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "avy-show-templates-modal";

/**
 * Check if templates modal should be shown (safe to call during render).
 * Returns true if the user has NOT checked "Don't show again".
 */
export function shouldShowTemplatesModal(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

interface UseTemplatesModalStateReturn {
  shouldShow: boolean;
  isLoaded: boolean;
  dismissPermanently: () => void;
}

// Helper to read from localStorage (safe for SSR)
function getInitialShouldShow(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function useTemplatesModalState(): UseTemplatesModalStateReturn {
  const [shouldShow, setShouldShow] = useState(getInitialShouldShow);
  const [isLoaded, setIsLoaded] = useState(() => typeof window !== "undefined");

  // Handle SSR hydration - mark as loaded after mount
  useEffect(() => {
    // Safe: This only runs once on mount for SSR hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(true);
  }, []);

  const dismissPermanently = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "false");
    } catch {
      // localStorage unavailable
    }
    setShouldShow(false);
  }, []);

  return {
    shouldShow,
    isLoaded,
    dismissPermanently,
  };
}
