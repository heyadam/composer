"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Node, Edge } from "@xyflow/react";
import { executeFlow } from "@/lib/execution/engine";
import type { NodeExecutionState, ExecutionStatus } from "@/lib/execution/types";
import type { PreviewEntry, DebugEntry } from "@/components/Flow/ResponsesSidebar/types";
import type { ApiKeys, ProviderId } from "@/lib/api-keys/types";
import type { NodeType } from "@/types/flow";

export interface UseFlowExecutionProps {
  nodes: Node[];
  edges: Edge[];
  apiKeys: ApiKeys;
  hasRequiredKey: (provider: ProviderId) => boolean;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  /** Share token for owner-funded execution */
  shareToken?: string;
  /** Whether to use owner's API keys instead of client's */
  useOwnerKeys?: boolean;
}

export interface UseFlowExecutionReturn {
  isRunning: boolean;
  previewEntries: PreviewEntry[];
  debugEntries: DebugEntry[];
  activeResponseTab: "responses" | "debug";
  setActiveResponseTab: (tab: "responses" | "debug") => void;
  keyError: string | null;
  runFlow: () => Promise<void>;
  cancelFlow: () => void;
  resetExecution: () => void;
}

export function useFlowExecution({
  nodes,
  edges,
  apiKeys,
  hasRequiredKey,
  setNodes,
  shareToken,
  useOwnerKeys,
}: UseFlowExecutionProps): UseFlowExecutionReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [previewEntries, setPreviewEntries] = useState<PreviewEntry[]>([]);
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);
  const [activeResponseTab, setActiveResponseTab] = useState<"responses" | "debug">("responses");
  const [keyError, setKeyError] = useState<string | null>(null);

  const addedPreviewIds = useRef<Set<string>>(new Set());
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const addPreviewEntry = useCallback(
    (entry: Omit<PreviewEntry, "id" | "timestamp">) => {
      setPreviewEntries((prev) => {
        // Atomic deduplication within state update to prevent race conditions
        if (prev.some((e) => e.nodeId === entry.nodeId)) {
          return prev;
        }
        return [
          ...prev,
          {
            ...entry,
            id: `${entry.nodeId}-${Date.now()}`,
            timestamp: Date.now(),
          },
        ];
      });
    },
    []
  );

  const updatePreviewEntry = useCallback(
    (nodeId: string, updates: Partial<PreviewEntry>) => {
      setPreviewEntries((prev) =>
        prev.map((entry) =>
          entry.nodeId === nodeId ? { ...entry, ...updates } : entry
        )
      );
    },
    []
  );

  const updateNodeExecutionState = useCallback(
    (nodeId: string, state: NodeExecutionState) => {
      // Update node state
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  executionStatus: state.status,
                  executionOutput: state.output,
                  executionError: state.error,
                  executionReasoning: state.reasoning,
                  // Persist auto-generated code for ai-logic nodes
                  ...(state.generatedCode && { generatedCode: state.generatedCode }),
                  ...(state.codeExplanation && { codeExplanation: state.codeExplanation }),
                },
              }
            : node
        )
      );

      // Handle debug entries for prompt/image nodes
      if (state.debugInfo) {
        const targetNode = nodesRef.current.find((n) => n.id === nodeId);
        const nodeLabel = (targetNode?.data as { label?: string })?.label || "Unknown";
        const nodeType = targetNode?.type as NodeType || "text-generation";

        setDebugEntries((prev) => {
          const existingIndex = prev.findIndex((e) => e.nodeId === nodeId);
          const existingEntry = existingIndex >= 0 ? prev[existingIndex] : undefined;

          // Preserve previous response if current state doesn't have output
          // This handles the case where streaming updates have output but final state doesn't
          const responseData = state.output
            ? {
                output: state.output,
                isStreaming: state.status === "running",
                streamChunksReceived: state.debugInfo!.streamChunksReceived,
              }
            : existingEntry?.response;

          const debugEntry: DebugEntry = {
            id: `debug-${nodeId}-${state.debugInfo!.startTime}`,
            nodeId,
            nodeLabel,
            nodeType,
            startTime: state.debugInfo!.startTime,
            endTime: state.debugInfo!.endTime,
            durationMs: state.debugInfo!.endTime
              ? state.debugInfo!.endTime - state.debugInfo!.startTime
              : undefined,
            request: state.debugInfo!.request,
            response: responseData,
            status: state.status,
            error: state.error,
            rawRequestBody: state.debugInfo!.rawRequestBody,
            rawResponseBody: state.debugInfo!.rawResponseBody,
          };

          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = debugEntry;
            return updated;
          }
          return [...prev, debugEntry];
        });
      }

      // Handle preview for output/response nodes
      const targetNode = nodesRef.current.find((n) => n.id === nodeId);
      if (targetNode?.type === "preview-output") {
        const nodeLabel = (targetNode.data as { label?: string }).label || "Preview Output";

        if (state.status === "running") {
          // Add to preview immediately when running (dedupe by nodeId)
          if (!addedPreviewIds.current.has(nodeId)) {
            addedPreviewIds.current.add(nodeId);
            addPreviewEntry({
              nodeId,
              nodeLabel,
              nodeType: "preview-output",
              status: "running",
              sourceType: state.sourceType as "text-generation" | "image-generation" | undefined,
            });
          }
          // Update preview with streaming output while running
          if (state.output) {
            updatePreviewEntry(nodeId, {
              status: "running",
              output: state.output,
            });
          } else if (state.sourceType) {
            // Update source type if provided (for loading state)
            updatePreviewEntry(nodeId, {
              status: "running",
              sourceType: state.sourceType as "text-generation" | "image-generation" | undefined,
            });
          }
        } else {
          // Update existing entry when complete
          updatePreviewEntry(nodeId, {
            status: state.status,
            output: state.output,
            error: state.error,
          });
        }
      }
    },
    [setNodes, addPreviewEntry, updatePreviewEntry]
  );

  const resetExecution = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          executionStatus: undefined,
          executionOutput: undefined,
          executionError: undefined,
        },
      }))
    );
    setPreviewEntries([]);
    setDebugEntries([]);
    addedPreviewIds.current.clear();
  }, [setNodes]);

  const runFlow = useCallback(async () => {
    if (isRunning) return;

    // Owner-funded mode: skip local key validation when BOTH useOwnerKeys and shareToken are present
    const isOwnerFunded = useOwnerKeys && shareToken;

    if (!isOwnerFunded) {
      // Check which providers are needed based on nodes
      const providersUsed = new Set<ProviderId>();
      nodes.forEach((node) => {
        if (node.type === "text-generation" || node.type === "image-generation") {
          const provider = (node.data as { provider?: string }).provider || "openai";
          providersUsed.add(provider as ProviderId);
        }
      });

      // Validate required keys
      const missingProviders: string[] = [];
      for (const provider of providersUsed) {
        if (!hasRequiredKey(provider)) {
          missingProviders.push(provider);
        }
      }

      if (missingProviders.length > 0) {
        setKeyError(`Missing API keys: ${missingProviders.join(", ")}. Open Settings to configure.`);
        return;
      }
    }

    setKeyError(null);
    resetExecution();
    setIsRunning(true);

    // Create new AbortController for this execution
    abortControllerRef.current = new AbortController();

    // Generate unique runId for rate limit deduplication in owner-funded mode
    const runId = isOwnerFunded ? uuidv4() : undefined;

    try {
      await executeFlow(
        nodes,
        edges,
        updateNodeExecutionState,
        apiKeys,
        abortControllerRef.current.signal,
        {
          shareToken: isOwnerFunded ? shareToken : undefined,
          runId,
        }
      );
    } catch (error) {
      if (error instanceof Error && error.message === "Execution cancelled") {
        console.log("Flow execution cancelled by user");
      } else {
        console.error("Flow execution error:", error);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, [nodes, edges, isRunning, updateNodeExecutionState, resetExecution, hasRequiredKey, apiKeys, setKeyError, setIsRunning, useOwnerKeys, shareToken]);

  const cancelFlow = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    isRunning,
    previewEntries,
    debugEntries,
    activeResponseTab,
    setActiveResponseTab,
    keyError,
    runFlow,
    cancelFlow,
    resetExecution,
  };
}
