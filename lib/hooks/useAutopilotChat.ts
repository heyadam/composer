"use client";

import { useState, useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { createFlowSnapshot } from "@/lib/autopilot/snapshot";
import { parseResponse } from "@/lib/autopilot/parser";
import { buildRetryContext } from "@/lib/autopilot/evaluator";
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
  RemoveNodeAction,
  AddNodeAction,
} from "@/lib/autopilot/types";

/**
 * Enrich flow changes with labels for display.
 * Populates sourceLabel/targetLabel on removeEdge actions and nodeLabel on removeNode actions.
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
      if (action.type === "removeNode") {
        return {
          ...action,
          nodeLabel: getNodeLabel(action.nodeId),
        } as RemoveNodeAction;
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

// Maximum number of auto-retry attempts before showing errors to user
const MAX_RETRY_ATTEMPTS = 2;

interface SendMessageOptions {
  executePlan?: FlowPlan;
  retryContext?: {
    failedChanges: FlowChanges;
    evalResult: EvaluationResult;
    attemptCount: number;
  };
  skipEvaluation?: boolean;
  skipUserMessage?: boolean;
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
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<AutopilotMessage[]>([]);
  const { keys: apiKeys } = useApiKeys();

  // Keep messagesRef in sync with messages state
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (
      content: string,
      model: AutopilotModel = "sonnet-4-5",
      options?: SendMessageOptions
    ) => {
      // Skip if no content, or if already loading (unless this is a retry)
      // Retries bypass the isLoading check because they're triggered internally
      // after setIsLoading(false), but the closure may have stale state
      if (!content.trim()) return;
      if (isLoading && !options?.retryContext) return;

      setError(null);
      setIsLoading(true);

      // Create placeholder for assistant message with unique ID
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: AutopilotMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      // Add user message unless this is a retry (skipUserMessage)
      // For retries, the original request is already in the message history,
      // and the retry context is appended to the system prompt
      if (options?.skipUserMessage) {
        // Retry: only add assistant message placeholder
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Normal: add both user and assistant messages
        const userMessage: AutopilotMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: content.trim(),
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMessage, assistantMessage]);
      }

      // Prepare messages for API using ref to get current state (avoids stale closure)
      // For retries, remind Claude of the original request AND ask to fix validation errors
      // This ensures Claude doesn't lose sight of what the user actually wanted
      const apiMessages = [
        ...messagesRef.current.map((m) => ({ role: m.role, content: m.content })),
        {
          role: "user" as const,
          content: options?.skipUserMessage
            ? `My original request was: "${content.trim()}"\n\nYour previous response had validation errors. Please fix those errors while still accomplishing my original request.`
            : content.trim(),
        },
      ];

      try {
        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();

        // Create flow snapshot
        const flowSnapshot = createFlowSnapshot(nodes, edges);

        // Determine if thinking should be enabled (always for plan mode, optional for execute)
        const currentMode = options?.executePlan ? "execute" : mode;
        const shouldEnableThinking = currentMode === "plan" || thinkingEnabled;

        // Test mode: Only inject bad JSON on first request, not retries
        const isTestRequest = testModeEnabled && !options?.retryContext;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (isTestRequest) {
          headers["x-autopilot-test-mode"] = "bad-json";
        }

        const response = await fetch("/api/autopilot", {
          method: "POST",
          headers,
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
              // Evaluation failed - check if we should retry
              const currentAttempt = options?.retryContext?.attemptCount ?? 1;
              const canRetry = currentAttempt < MAX_RETRY_ATTEMPTS;

              if (canRetry) {
                // Build the retry instructions to show user
                const retryInstructions = buildRetryContext(pendingChanges, evalResult);

                // Auto-retry with error feedback
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          evaluationState: "retrying" as EvaluationState,
                          evaluationResult: evalResult,
                          retryInstructions,
                          applied: false,
                        }
                      : m
                  )
                );

                // Add a system message indicating auto-fix is happening
                const retryMessageId = crypto.randomUUID();
                setMessages((prev) => [
                  ...prev,
                  {
                    id: retryMessageId,
                    role: "assistant" as const,
                    content: "Let's auto fix those flags...",
                    timestamp: Date.now(),
                  },
                ]);

                // Trigger retry after a brief delay to show "retrying" state
                setIsLoading(false);
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Retry with the original user request and error context
                await sendMessage(content, model, {
                  retryContext: {
                    failedChanges: pendingChanges,
                    evalResult,
                    attemptCount: currentAttempt + 1,
                  },
                  skipEvaluation: false,
                  skipUserMessage: true,
                });
                return; // Exit early, retry will handle the rest
              } else {
                // Max retries reached - show errors, don't apply
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
    [nodes, edges, isLoading, onApplyChanges, apiKeys, mode, thinkingEnabled, testModeEnabled]
  );

  const approvePlan = useCallback(
    async (messageId: string, model: AutopilotModel = "sonnet-4-5") => {
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

  const retryFix = useCallback(
    async (messageId: string, model: AutopilotModel = "sonnet-4-5") => {
      const message = messagesRef.current.find((m) => m.id === messageId);
      if (!message?.pendingChanges || !message.evaluationResult) return;

      // Find the original user request by looking backwards from this message
      const messageIndex = messagesRef.current.findIndex((m) => m.id === messageId);
      let originalRequest = "";
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messagesRef.current[i].role === "user") {
          originalRequest = messagesRef.current[i].content;
          break;
        }
      }

      if (!originalRequest) return;

      // Trigger another retry (manual retry resets attempt count)
      await sendMessage(originalRequest, model, {
        retryContext: {
          failedChanges: message.pendingChanges,
          evalResult: message.evaluationResult,
          attemptCount: 1,
        },
        skipEvaluation: false,
        skipUserMessage: true,
      });
    },
    [sendMessage]
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
    testModeEnabled,
    setTestModeEnabled,
    sendMessage,
    approvePlan,
    undoChanges,
    applyAnyway,
    retryFix,
    clearHistory,
    cancelRequest,
  };
}
