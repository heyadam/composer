import { useMemo } from "react";
import { useEdges } from "@xyflow/react";

/**
 * Hook for checking edge connections to a node's handles.
 *
 * Centralizes the common pattern of checking which handles are connected,
 * replacing repeated `edges.some()` calls throughout node components.
 *
 * @param nodeId - The ID of the node to check connections for
 * @returns Object with helper functions to check input/output connections
 *
 * @example
 * const { isInputConnected, isOutputConnected } = useEdgeConnections(id);
 *
 * // Check if "prompt" handle is connected (or default handle if fallbackToDefault=true)
 * const promptConnected = isInputConnected("prompt", true);
 *
 * // Check if "done" handle is connected (exact match only)
 * const doneConnected = isOutputConnected("done");
 */
export function useEdgeConnections(nodeId: string) {
  const edges = useEdges();

  // Memoize the connection lookup to avoid recalculating on every render
  const connections = useMemo(() => {
    const inputHandles = new Set<string | null>();
    const outputHandles = new Set<string | null>();

    for (const edge of edges) {
      if (edge.target === nodeId) {
        // Use null to represent undefined/missing handle (default connection)
        inputHandles.add(edge.targetHandle ?? null);
      }
      if (edge.source === nodeId) {
        outputHandles.add(edge.sourceHandle ?? null);
      }
    }

    return { inputHandles, outputHandles };
  }, [edges, nodeId]);

  /**
   * Check if an input handle is connected.
   *
   * @param handleId - The handle ID to check
   * @param fallbackToDefault - If true, also returns true when the default handle (no ID) is connected.
   *                            Use this for handles that serve as the primary input.
   */
  const isInputConnected = (
    handleId: string,
    fallbackToDefault = false
  ): boolean => {
    if (connections.inputHandles.has(handleId)) {
      return true;
    }
    // If fallbackToDefault is true, also check for connections without a handle ID
    // This handles the case where edges connect to the "default" handle (undefined/null)
    if (fallbackToDefault && connections.inputHandles.has(null)) {
      return true;
    }
    return false;
  };

  /**
   * Check if an output handle is connected.
   *
   * @param handleId - The handle ID to check
   * @param fallbackToDefault - If true, also returns true when the default handle (no ID) is connected.
   *                            Use this for handles that serve as the primary output.
   */
  const isOutputConnected = (
    handleId: string,
    fallbackToDefault = false
  ): boolean => {
    if (connections.outputHandles.has(handleId)) {
      return true;
    }
    if (fallbackToDefault && connections.outputHandles.has(null)) {
      return true;
    }
    return false;
  };

  return {
    isInputConnected,
    isOutputConnected,
    /** Direct access to connected input handle IDs (includes null for default) */
    inputHandles: connections.inputHandles,
    /** Direct access to connected output handle IDs (includes null for default) */
    outputHandles: connections.outputHandles,
  };
}
