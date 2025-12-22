"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import { executeFlow } from "@/lib/execution/engine";
import type { NodeExecutionState } from "@/lib/execution/types";
import { welcomePreviewEdges, welcomePreviewNodes } from "@/lib/welcome-preview-flow";

// Map node labels to user-friendly progress messages
const NODE_PROGRESS_LABELS: Record<string, string> = {
  "Story Writer": "Generating story...",
  "Image Prompt Generator": "Creating image prompt...",
  "Story Illustration": "Creating image from story...",
};

// Module-level state to persist across React Strict Mode remounts.
// This is intentional - refs reset on remount, but we need to prevent
// double execution when Strict Mode unmounts and remounts the component.
// Reset on module load to handle HMR during development.
let demoHasStarted = false;

// Reset flag when module is loaded (handles HMR)
if (typeof window !== "undefined") {
  // @ts-expect-error - intentional global for HMR reset
  if (window.__DEMO_EXECUTION_LOADED__) {
    demoHasStarted = false;
  }
  // @ts-expect-error - intentional global for HMR reset
  window.__DEMO_EXECUTION_LOADED__ = true;
}
let demoSetNodes: React.Dispatch<React.SetStateAction<Node[]>> | null = null;
let demoSetIsRunning: React.Dispatch<React.SetStateAction<boolean>> | null = null;
let demoSetProgressLabel: React.Dispatch<React.SetStateAction<string>> | null = null;

interface DemoOutputs {
  prompt: string | undefined;
  story: string | undefined;
  image: string | undefined;
}

interface UseDemoExecutionReturn {
  nodes: Node[];
  edges: Edge[];
  isRunning: boolean;
  progressLabel: string;
  outputs: DemoOutputs;
  retry: () => void;
}

/**
 * Hook to manage demo flow execution state.
 * Handles automatic execution on mount and retry functionality.
 * Uses refs to prevent double execution in React Strict Mode.
 */
export function useDemoExecution(): UseDemoExecutionReturn {
  const [nodes, setNodes] = useState<Node[]>(() =>
    welcomePreviewNodes.map((n) => ({ ...n, data: { ...n.data } }))
  );
  const [edges] = useState<Edge[]>(() =>
    welcomePreviewEdges.map((e) => ({ ...e }))
  );
  const [isRunning, setIsRunning] = useState(true);
  const [progressLabel, setProgressLabel] = useState("Starting demo...");

  // Ref-based guard as backup for module-level flag
  const hasStartedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep module-level refs to latest setters (survives strict mode remounts)
  useEffect(() => {
    demoSetNodes = setNodes;
    demoSetIsRunning = setIsRunning;
    demoSetProgressLabel = setProgressLabel;
  }, [setNodes, setIsRunning, setProgressLabel]);

  // Initial execution on mount
  useEffect(() => {
    // Only run once across all mounts (survives React Strict Mode)
    if (demoHasStarted || hasStartedRef.current) return;
    demoHasStarted = true;
    hasStartedRef.current = true;

    abortControllerRef.current = new AbortController();

    // Callback to update node state - uses module ref for latest setNodes
    const updateNodeState = (nodeId: string, state: NodeExecutionState) => {
      // Update progress label when a node starts running
      if (state.status === "running") {
        demoSetNodes?.((prev) => {
          const node = prev.find((n) => n.id === nodeId);
          const nodeLabel = node?.data?.label as string | undefined;
          if (nodeLabel && NODE_PROGRESS_LABELS[nodeLabel]) {
            demoSetProgressLabel?.(NODE_PROGRESS_LABELS[nodeLabel]);
          }
          return prev;
        });
      }

      demoSetNodes?.((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  executionStatus: state.status,
                  executionOutput: state.output,
                  executionError: state.error,
                  executionReasoning: state.reasoning,
                },
              }
            : node
        )
      );
    };

    // Delay start by 2 seconds to let user observe the flow first
    setTimeout(() => {
      executeFlow(nodes, edges, updateNodeState, undefined, abortControllerRef.current?.signal)
        .then(() => {
          demoSetIsRunning?.(false);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            console.error("[NUX Demo] Execution error:", err);
          }
          demoSetIsRunning?.(false);
        });
    }, 2000);

    // Don't clear timeout on unmount - let demo run to completion
    // Module-level setters will be updated to point to the new component
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Retry demo flow
  const retry = useCallback(() => {
    // Reset nodes to initial state
    setNodes(welcomePreviewNodes.map((n) => ({ ...n, data: { ...n.data } })));
    setProgressLabel("Starting demo...");
    setIsRunning(true);

    // Reset guards to allow re-execution
    demoHasStarted = false;
    hasStartedRef.current = false;

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Callback to update node state
    const updateNodeState = (nodeId: string, state: NodeExecutionState) => {
      if (state.status === "running") {
        demoSetNodes?.((prev) => {
          const node = prev.find((n) => n.id === nodeId);
          const nodeLabel = node?.data?.label as string | undefined;
          if (nodeLabel && NODE_PROGRESS_LABELS[nodeLabel]) {
            demoSetProgressLabel?.(NODE_PROGRESS_LABELS[nodeLabel]);
          }
          return prev;
        });
      }

      demoSetNodes?.((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  executionStatus: state.status,
                  executionOutput: state.output,
                  executionError: state.error,
                  executionReasoning: state.reasoning,
                },
              }
            : node
        )
      );
    };

    // Delay and execute
    setTimeout(() => {
      const freshNodes = welcomePreviewNodes.map((n) => ({ ...n, data: { ...n.data } }));
      const freshEdges = welcomePreviewEdges.map((e) => ({ ...e }));
      executeFlow(freshNodes, freshEdges, updateNodeState, undefined, abortControllerRef.current?.signal)
        .then(() => {
          demoSetIsRunning?.(false);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            console.error("[NUX Demo] Retry error:", err);
          }
          demoSetIsRunning?.(false);
        });
    }, 2000);
  }, []);

  // Extract outputs from nodes
  const outputs: DemoOutputs = {
    prompt: nodes.find((n) => n.type === "text-input")?.data?.inputValue as string | undefined,
    story: nodes.find((n) => n.data?.label === "Story Writer")?.data?.executionOutput as string | undefined,
    image: nodes.find((n) => n.type === "image-generation")?.data?.executionOutput as string | undefined,
  };

  return {
    nodes,
    edges,
    isRunning,
    progressLabel,
    outputs,
    retry,
  };
}
