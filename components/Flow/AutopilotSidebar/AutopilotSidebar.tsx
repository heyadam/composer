"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AutopilotHeader } from "./AutopilotHeader";
import { AutopilotChat } from "./AutopilotChat";
import { useAutopilotChat } from "@/lib/hooks/useAutopilotChat";
import type { AutopilotSidebarProps } from "./types";

const MIN_WIDTH = 320;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 380;
const STORAGE_KEY = "autopilot-sidebar-width";

// Get initial width from localStorage
function getInitialWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      return parsed;
    }
  }
  return DEFAULT_WIDTH;
}

export function AutopilotSidebar({
  nodes,
  edges,
  onApplyChanges,
  onUndoChanges,
  isOpen,
  onToggle,
}: AutopilotSidebarProps) {
  const [width, setWidth] = useState(getInitialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    undoChanges,
    clearHistory,
  } = useAutopilotChat({ nodes, edges, onApplyChanges, onUndoChanges });

  // Save width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, width.toString());
  }, [width]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;

      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const newWidth = e.clientX - sidebarRect.left;

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    },
    [isResizing]
  );

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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={sidebarRef}
      className="flex flex-col h-full border-r bg-background relative overflow-hidden"
      style={{ width }}
    >
      <AutopilotHeader
        onClear={clearHistory}
        onClose={onToggle}
        hasMessages={messages.length > 0}
      />
      <AutopilotChat
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={sendMessage}
        onUndoChanges={undoChanges}
      />
      {/* Resize handle - on the right edge for left sidebar */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500/50 active:bg-purple-500/70 transition-colors z-10"
        onMouseDown={startResizing}
      />
    </div>
  );
}
