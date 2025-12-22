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
  suggestions,
  suggestionsLoading,
  onRefreshSuggestions,
  onMessageSent,
  pendingMessage,
  onPendingMessageConsumed,
}: AutopilotSidebarProps) {
  const [width, setWidth] = useState(getInitialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const {
    messages,
    isLoading,
    error,
    mode,
    setMode,
    thinkingEnabled,
    setThinkingEnabled,
    testModeEnabled,
    setTestModeEnabled,
    sendMessage,
    approvePlan,
    undoChanges,
    applyAnyway,
    retryFix,
    clearHistory,
  } = useAutopilotChat({ nodes, edges, onApplyChanges, onUndoChanges });

  // Wrap sendMessage to notify parent when a message is sent
  const handleSendMessage = useCallback(
    (...args: Parameters<typeof sendMessage>) => {
      onMessageSent?.();
      return sendMessage(...args);
    },
    [sendMessage, onMessageSent]
  );

  // Handle pending message from templates modal
  useEffect(() => {
    if (pendingMessage) {
      setMode(pendingMessage.mode);
      setThinkingEnabled(pendingMessage.thinkingEnabled);
      sendMessage(pendingMessage.prompt, pendingMessage.model);
      onPendingMessageConsumed?.();
    }
  }, [pendingMessage, setMode, setThinkingEnabled, sendMessage, onPendingMessageConsumed]);

  // Save width to localStorage when it changes (but not during active drag)
  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem(STORAGE_KEY, width.toString());
    }
  }, [width, isResizing]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;

      // Throttle updates to animation frame rate for smooth resizing
      if (rafRef.current) return;

      const clientX = e.clientX;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const sidebarRect = sidebarRef.current?.getBoundingClientRect();
        if (!sidebarRect) return;

        const newWidth = clientX - sidebarRect.left;
        if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
          setWidth(newWidth);
        }
      });
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

  return (
    <div
      className={`h-full overflow-hidden ${isResizing ? "" : "transition-[width,min-width] duration-300 ease-out"}`}
      style={{
        width: isOpen ? width : 0,
        minWidth: isOpen ? width : 0,
        willChange: isResizing ? "width" : "auto",
      }}
    >
      <div
        ref={sidebarRef}
        className="flex flex-col h-full border-r bg-background relative overflow-hidden"
        style={{ width, minWidth: width }}
      >
        <AutopilotHeader
          onClear={clearHistory}
          onClose={onToggle}
          hasMessages={messages.length > 0}
          testModeEnabled={testModeEnabled}
          onTestModeChange={setTestModeEnabled}
        />
        <AutopilotChat
          messages={messages}
          isLoading={isLoading}
          error={error}
          mode={mode}
          onModeChange={setMode}
          thinkingEnabled={thinkingEnabled}
          onThinkingChange={setThinkingEnabled}
          onSendMessage={handleSendMessage}
          onApprovePlan={approvePlan}
          onUndoChanges={undoChanges}
          onApplyAnyway={applyAnyway}
          onRetryFix={retryFix}
          nodes={nodes}
          edges={edges}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          onRefreshSuggestions={onRefreshSuggestions}
        />
        {/* Resize handle - on the right edge for left sidebar */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-500/50 active:bg-purple-500/70 transition-colors z-10"
          onMouseDown={startResizing}
        />
      </div>
    </div>
  );
}
