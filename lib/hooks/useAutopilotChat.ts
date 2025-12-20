"use client";

import { useState, useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { createFlowSnapshot } from "@/lib/autopilot/snapshot";
import { parseResponse } from "@/lib/autopilot/parser";
import { useApiKeys } from "@/lib/api-keys";
import type {
  AutopilotMessage,
  FlowChanges,
  AppliedChangesInfo,
  AutopilotModel,
  AutopilotMode,
  FlowPlan,
  EvaluationResult,
  EvaluationState,
  RemoveEdgeAction,
  AddNodeAction,
} from "@/lib/autopilot/types";

/**
 * Enrich flow changes with labels for display.
 * Populates sourceLabel/targetLabel on removeEdge actions from current flow state.
 */
function enrichFlowChanges(
  changes: FlowChanges,
  nodes: Node[],
  edges: Edge[]
): FlowChanges {
  const addedNodes = changes.actions.filter(
    (a): a is AddNodeAction => a.type === "addNode"
  );

  const getNodeLabel = (nodeId: string): string => {
    // Check nodes being added in this action set
    const pendingNode = addedNodes.find((a) => a.node.id === nodeId);
    if (pendingNode) {
      const data = pendingNode.node.data as { label?: string };
      return data.label || pendingNode.node.type;
    }
    // Check existing nodes
    const existingNode = nodes.find((n) => n.id === nodeId);
    if (existingNode) {
      const data = existingNode.data as { label?: string };
      return data.label || (existingNode.type as string) || nodeId;
    }
    return nodeId;
  };

  return {
    ...changes,
    actions: changes.actions.map((action) => {
      if (action.type === "removeEdge") {
        const edge = edges.find((e) => e.id === action.edgeId);
        if (edge) {
          return {
            ...action,
            sourceLabel: getNodeLabel(edge.source),
            targetLabel: getNodeLabel(edge.target),
          } as RemoveEdgeAction;
        }
      }
      return action;
    }),
  };
}

interface UseAutopilotChatOptions {
  nodes: Node[];
  edges: Edge[];
  onApplyChanges: (changes: FlowChanges) => AppliedChangesInfo;
  onUndoChanges: (applied: AppliedChangesInfo) => void;
}

interface SendMessageOptions {
  executePlan?: FlowPlan;
  retryContext?: {
    failedChanges: FlowChanges;
    evalResult: EvaluationResult;
  };
  skipEvaluation?: boolean;
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
  const [mode, setMode] = useState<AutopilotMode>("execute");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<AutopilotMessage[]>([]);
  const { keys: apiKeys } = useApiKeys();

  // Keep messagesRef in sync with messages state
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (
      content: string,
      model: AutopilotModel = "opus-4-5-medium",
      options?: SendMessageOptions
    ) => {
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

        // Determine if thinking should be enabled (always for plan mode, optional for execute)
        const currentMode = options?.executePlan ? "execute" : mode;
        const shouldEnableThinking = currentMode === "plan" || thinkingEnabled;

        const response = await fetch("/api/autopilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            flowSnapshot,
            model,
            apiKeys,
            mode: currentMode,
            approvedPlan: options?.executePlan,
            retryContext: options?.retryContext,
            thinkingEnabled: shouldEnableThinking,
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
        let fullThinking = "";
        const isNdjson = response.headers.get("Content-Type")?.includes("ndjson");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);

          if (isNdjson) {
            // Parse NDJSON chunks for thinking-enabled responses
            const lines = chunk.split("\n").filter((line) => line.trim());
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.type === "thinking") {
                  fullThinking += parsed.content;
                } else if (parsed.type === "text") {
                  fullOutput += parsed.content;
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
            // Update message with both thinking and content
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: fullOutput, thinking: fullThinking || undefined }
                  : m
              )
            );
          } else {
            // Regular text stream
            fullOutput += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId ? { ...m, content: fullOutput } : m
              )
            );
          }
        }

        // Parse response - could be plan, changes, or neither
        const parseResult = parseResponse(fullOutput);

        let appliedInfo: AppliedChangesInfo | undefined;
        let pendingPlan: FlowPlan | undefined;
        let pendingChanges: FlowChanges | undefined;

        if (parseResult.type === "changes") {
          // Enrich with labels before edges are removed
          pendingChanges = enrichFlowChanges(parseResult.data, nodes, edges);

          // Update message with pending changes and start evaluation
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: fullOutput,
                    pendingChanges,
                    evaluationState: options?.skipEvaluation ? undefined : "evaluating" as EvaluationState,
                    wasRetried: !!options?.retryContext,
                  }
                : m
            )
          );

          // Run evaluation unless skipped
          if (!options?.skipEvaluation) {
            const userRequest = content.trim();
            const evalResponse = await fetch("/api/autopilot/evaluate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userRequest,
                flowSnapshot,
                changes: pendingChanges,
                apiKeys,
              }),
            });

            const evalResult: EvaluationResult = await evalResponse.json();

            if (evalResult.valid) {
              // Evaluation passed - auto-apply
              appliedInfo = onApplyChanges(pendingChanges);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        evaluationState: "passed" as EvaluationState,
                        evaluationResult: evalResult,
                        applied: true,
                        appliedInfo,
                      }
                    : m
                )
              );
            } else {
              // Evaluation failed
              if (!options?.retryContext) {
                // First failure - auto-retry with error feedback
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          evaluationState: "retrying" as EvaluationState,
                          evaluationResult: evalResult,
                          applied: false,
                        }
                      : m
                  )
                );

                // Trigger retry after a brief delay to show "retrying" state
                setIsLoading(false);
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Retry with the original user request and error context
                await sendMessage(content, model, {
                  retryContext: {
                    failedChanges: pendingChanges,
                    evalResult,
                  },
                  skipEvaluation: false,
                });
                return; // Exit early, retry will handle the rest
              } else {
                // Already retried - show errors, don't apply
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          evaluationState: "failed" as EvaluationState,
                          evaluationResult: evalResult,
                          applied: false,
                          wasRetried: true,
                        }
                      : m
                  )
                );
              }
            }
          } else {
            // Skip evaluation - just apply
            appliedInfo = onApplyChanges(pendingChanges);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      applied: true,
                      appliedInfo,
                    }
                  : m
              )
            );
          }
        } else if (parseResult.type === "plan") {
          // Plan - store for approval (don't auto-apply or evaluate)
          pendingPlan = parseResult.data;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: fullOutput,
                    pendingPlan,
                  }
                : m
            )
          );
        } else {
          // No changes or plan - just update content
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: fullOutput }
                : m
            )
          );
        }
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
    [nodes, edges, isLoading, onApplyChanges, apiKeys, mode, thinkingEnabled]
  );

  const approvePlan = useCallback(
    async (messageId: string, model: AutopilotModel = "opus-4-5-medium") => {
      const message = messagesRef.current.find((m) => m.id === messageId);
      if (!message?.pendingPlan) return;

      // Mark plan as approved
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, planApproved: true } : m
        )
      );

      // Send execute request with approved plan
      await sendMessage("Execute the approved plan.", model, {
        executePlan: message.pendingPlan,
      });

      // Switch back to execute mode after plan is executed
      setMode("execute");
    },
    [sendMessage]
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

  const applyAnyway = useCallback(
    (messageId: string) => {
      const message = messagesRef.current.find((m) => m.id === messageId);
      if (message?.pendingChanges && !message.applied) {
        // Apply despite validation failures
        const appliedInfo = onApplyChanges(message.pendingChanges);

        // Update message as applied
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, applied: true, appliedInfo } : m
          )
        );
      }
    },
    [onApplyChanges]
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
    mode,
    setMode,
    thinkingEnabled,
    setThinkingEnabled,
    sendMessage,
    approvePlan,
    undoChanges,
    applyAnyway,
    clearHistory,
    cancelRequest,
  };
}
