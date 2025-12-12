"use client";

import { useState, useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { createFlowSnapshot } from "@/lib/autopilot/snapshot";
import { parseFlowChanges } from "@/lib/autopilot/parser";
import type { AutopilotMessage, FlowChanges } from "@/lib/autopilot/types";

interface UseAutopilotChatOptions {
  nodes: Node[];
  edges: Edge[];
  onApplyChanges: (changes: FlowChanges) => void;
}

export function useAutopilotChat({
  nodes,
  edges,
  onApplyChanges,
}: UseAutopilotChatOptions) {
  const [messages, setMessages] = useState<AutopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);

      // Add user message
      const userMessage: AutopilotMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      // Prepare messages for API (without metadata)
      const apiMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: content.trim() },
      ];

      setMessages((prev) => [...prev, userMessage]);

      // Create placeholder for assistant message
      const assistantMessageId = `msg-${Date.now() + 1}`;
      const assistantMessage: AutopilotMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

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

        // Update message with parsed changes
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: fullOutput, pendingChanges: changes ?? undefined }
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
    [messages, nodes, edges, isLoading]
  );

  const applyPendingChanges = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message?.pendingChanges && !message.applied) {
        onApplyChanges(message.pendingChanges);

        // Mark as applied
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, applied: true } : m
          )
        );
      }
    },
    [messages, onApplyChanges]
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
    applyPendingChanges,
    clearHistory,
    cancelRequest,
  };
}
