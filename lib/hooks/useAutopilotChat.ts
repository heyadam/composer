"use client";

import { useState, useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { createFlowSnapshot } from "@/lib/autopilot/snapshot";
import { parseFlowChanges } from "@/lib/autopilot/parser";
import { useApiKeys } from "@/lib/api-keys";
import type { AutopilotMessage, FlowChanges, AppliedChangesInfo, AutopilotModel } from "@/lib/autopilot/types";

interface UseAutopilotChatOptions {
  nodes: Node[];
  edges: Edge[];
  onApplyChanges: (changes: FlowChanges) => AppliedChangesInfo;
  onUndoChanges: (applied: AppliedChangesInfo) => void;
}

export function useAutopilotChat({
  nodes,
  edges,
  onApplyChanges,
  onUndoChanges,
}: UseAutopilotChatOptions) {
  const [messages, setMessages] = useState<AutopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<AutopilotMessage[]>([]);
  const { keys: apiKeys } = useApiKeys();

  // Keep messagesRef in sync with messages state
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (content: string, model: AutopilotModel = "claude-sonnet-4-5") => {
      if (!content.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);

      // Add user message with unique ID
      const userMessageId = crypto.randomUUID();
      const userMessage: AutopilotMessage = {
        id: userMessageId,
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      // Create placeholder for assistant message with unique ID
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: AutopilotMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      // Prepare messages for API using ref to get current state (avoids stale closure)
      const apiMessages = [
        ...messagesRef.current.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: content.trim() },
      ];

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      try {
        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();

        // Create flow snapshot
        const flowSnapshot = createFlowSnapshot(nodes, edges);

        const response = await fetch("/api/autopilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            flowSnapshot,
            model,
            apiKeys,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get response");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullOutput = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          fullOutput += chunk;

          // Update message content
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: fullOutput } : m
            )
          );
        }

        // Parse flow changes from completed response
        const changes = parseFlowChanges(fullOutput);

        // Auto-apply changes if any
        let appliedInfo: AppliedChangesInfo | undefined;
        if (changes) {
          appliedInfo = onApplyChanges(changes);
        }

        // Update message with parsed changes and applied info
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: fullOutput,
                  pendingChanges: changes ?? undefined,
                  applied: !!changes,
                  appliedInfo,
                }
              : m
          )
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled, remove the assistant message
          setMessages((prev) =>
            prev.filter((m) => m.id !== assistantMessageId)
          );
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "An error occurred";
          setError(errorMessage);

          // Update assistant message with error
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: `Error: ${errorMessage}` }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [nodes, edges, isLoading, onApplyChanges, apiKeys]
  );

  const undoChanges = useCallback(
    (messageId: string) => {
      const message = messagesRef.current.find((m) => m.id === messageId);
      if (message?.applied && message.appliedInfo) {
        onUndoChanges(message.appliedInfo);

        // Mark as not applied
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, applied: false, appliedInfo: undefined } : m
          )
        );
      }
    },
    [onUndoChanges]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    undoChanges,
    clearHistory,
    cancelRequest,
  };
}
