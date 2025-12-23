"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { isNuxComplete } from "@/components/Flow/WelcomeDialog";
import type { FlowMetadata } from "@/lib/flow-storage/types";

const STORAGE_KEY = "avy-show-templates-modal";

interface UseTemplatesModalOptions {
  isLoaded: boolean;
  isCollaborating: boolean;
  nodes: Node[];
  edges: Edge[];
  flowMetadata: FlowMetadata | undefined;
}

interface UseTemplatesModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  dismissPermanently: () => void;
}

/**
 * Check if templates modal should be shown (safe to call during render).
 * Returns true if the user has NOT checked "Don't show again".
 */
function shouldShowTemplatesModal(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

/**
 * Unified hook for managing the templates modal state.
 * Handles open/close state, auto-open logic, and persistence.
 */
export function useTemplatesModal({
  isLoaded,
  isCollaborating,
  nodes,
  edges,
  flowMetadata,
}: UseTemplatesModalOptions): UseTemplatesModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const hasAutoOpenedRef = useRef(false);

  // Auto-open conditions:
  // 1. API keys loaded
  // 2. NUX complete
  // 3. Not permanently dismissed
  // 4. Not collaborating
  // 5. Flow is empty (no nodes/edges)
  // 6. No cloud flow loaded
  const shouldAutoOpen =
    isLoaded &&
    isNuxComplete() &&
    shouldShowTemplatesModal() &&
    !isCollaborating &&
    nodes.length === 0 &&
    edges.length === 0 &&
    !flowMetadata;

  // Auto-open on mount when conditions are met
  useEffect(() => {
    if (shouldAutoOpen && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      setIsOpen(true);
    }
  }, [shouldAutoOpen]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const dismissPermanently = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "false");
    } catch {
      // localStorage unavailable
    }
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    open,
    close,
    dismissPermanently,
  };
}
