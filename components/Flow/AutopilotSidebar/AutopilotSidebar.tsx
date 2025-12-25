"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { AutopilotHeader } from "./AutopilotHeader";
import { AutopilotChat } from "./AutopilotChat";
import { useAutopilotChat } from "@/lib/hooks/useAutopilotChat";
import { useResizableSidebar } from "@/lib/hooks/useResizableSidebar";
import { getTransition } from "@/lib/motion/presets";
import type { AutopilotSidebarProps } from "./types";

const SIDEBAR_CONFIG = {
  minWidth: 320,
  maxWidth: 600,
  defaultWidth: 380,
  storageKey: "autopilot-sidebar-width",
  side: "left" as const,
};

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
  clearHistoryTrigger,
  onWidthChange,
}: AutopilotSidebarProps) {
  const { width, isResizing, sidebarRef, startResizing } = useResizableSidebar(SIDEBAR_CONFIG);

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

  // Clear history when trigger changes (used when creating new flow)
  const prevTriggerRef = useRef(clearHistoryTrigger);
  useEffect(() => {
    if (clearHistoryTrigger !== undefined && clearHistoryTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = clearHistoryTrigger;
      clearHistory();
    }
  }, [clearHistoryTrigger, clearHistory]);

  // Copy transcript to clipboard
  const handleCopyTranscript = useCallback(() => {
    const transcript = messages
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        let text = `${role}:\n${msg.content}`;
        if (msg.thinking) {
          text += `\n\n[Thinking]\n${msg.thinking}`;
        }
        return text;
      })
      .join("\n\n---\n\n");

    navigator.clipboard.writeText(transcript);
  }, [messages]);

  const w = isOpen ? width : 0;

  // Report width and resize state changes to parent for layout adjustments
  useEffect(() => {
    onWidthChange?.(width, isResizing);
  }, [width, isResizing, onWidthChange]);

  return (
    <motion.div
      className="absolute left-0 top-0 h-full overflow-hidden flex justify-end z-20"
      style={{ willChange: isResizing ? "width" : "auto" }}
      initial={false}
      animate={{ width: w, minWidth: w }}
      transition={getTransition(isResizing)}
    >
      <div
        ref={sidebarRef}
        className="flex flex-col h-full border-r bg-background relative overflow-hidden"
        style={{ width, minWidth: width }}
      >
        <AutopilotHeader
          onClear={clearHistory}
          onClose={onToggle}
          onCopy={handleCopyTranscript}
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
    </motion.div>
  );
}
