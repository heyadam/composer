import { useState, useCallback, useEffect, useRef } from "react";

export interface ResizableSidebarConfig {
  /** Minimum width in pixels */
  minWidth: number;
  /** Maximum width in pixels */
  maxWidth: number;
  /** Default width in pixels */
  defaultWidth: number;
  /** localStorage key for persisting width */
  storageKey: string;
  /** Which side the resize handle is on (determines drag direction) */
  side: "left" | "right";
}

export interface ResizableSidebarState {
  /** Current width in pixels */
  width: number;
  /** Whether the sidebar is currently being resized */
  isResizing: boolean;
  /** Ref to attach to the sidebar container (used for position calculations) */
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  /** Handler for resize handle mousedown */
  startResizing: (e: React.MouseEvent) => void;
}

/**
 * SSR-safe function to get initial width from localStorage
 */
function getInitialWidth(config: ResizableSidebarConfig): number {
  if (typeof window === "undefined") return config.defaultWidth;
  const saved = localStorage.getItem(config.storageKey);
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed >= config.minWidth && parsed <= config.maxWidth) {
      return parsed;
    }
  }
  return config.defaultWidth;
}

/**
 * Hook for resizable sidebar behavior.
 * Handles drag-to-resize, localStorage persistence, and RAF-throttled updates.
 *
 * @example
 * const { width, isResizing, sidebarRef, startResizing } = useResizableSidebar({
 *   minWidth: 240,
 *   maxWidth: 800,
 *   defaultWidth: 340,
 *   storageKey: "my-sidebar-width",
 *   side: "right", // resize handle on left edge, sidebar on right
 * });
 */
export function useResizableSidebar(config: ResizableSidebarConfig): ResizableSidebarState {
  const { minWidth, maxWidth, storageKey, side } = config;

  const [width, setWidth] = useState(() => getInitialWidth(config));
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Save width to localStorage when it changes (but not during active drag)
  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem(storageKey, width.toString());
    }
  }, [width, isResizing, storageKey]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;

      // Throttle updates to animation frame rate
      if (rafRef.current) return;

      const clientX = e.clientX;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const rect = sidebarRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Calculate new width based on sidebar position
        const newWidth = side === "left"
          ? clientX - rect.left  // Left sidebar: drag right edge
          : rect.right - clientX; // Right sidebar: drag left edge

        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setWidth(newWidth);
        }
      });
    },
    [isResizing, side, minWidth, maxWidth]
  );

  // Global mouse event listeners during resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, resize, stopResizing]);

  return {
    width,
    isResizing,
    sidebarRef,
    startResizing,
  };
}
