import { useEffect, useLayoutEffect, useRef } from "react";

interface UseFlowCleanupOptions {
  /** Current flow ID (null if no flow loaded) */
  flowId: string | null;
  /** Current flow name */
  flowName: string | undefined;
  /** All nodes in the flow (comment nodes are excluded from count) */
  nodes: Array<{ type?: string }>;
  /** Whether the current user is the owner of the flow */
  isOwner: boolean;
}

/**
 * Hook that handles flow cleanup on page unload.
 *
 * - If flow is empty (no non-comment nodes) and named "Untitled": deletes the flow
 * - If flow has non-comment nodes and named "Untitled": renames to "Draft - {live_id}"
 * - Otherwise: no-op (flow was explicitly named/saved)
 *
 * Uses sendBeacon for reliable delivery during page unload.
 */
export function useFlowCleanup({
  flowId,
  flowName,
  nodes,
  isOwner,
}: UseFlowCleanupOptions): void {
  // Use refs to access latest values in event handler without re-registering
  const flowIdRef = useRef(flowId);
  const flowNameRef = useRef(flowName);
  const nodesRef = useRef(nodes);
  const isOwnerRef = useRef(isOwner);

  // Keep refs in sync immediately after render (before paint)
  // useLayoutEffect guarantees refs are updated before pagehide could fire
  useLayoutEffect(() => {
    flowIdRef.current = flowId;
    flowNameRef.current = flowName;
    nodesRef.current = nodes;
    isOwnerRef.current = isOwner;
  }, [flowId, flowName, nodes, isOwner]);

  useEffect(() => {
    const handlePageHide = () => {
      const currentFlowId = flowIdRef.current;
      const currentFlowName = flowNameRef.current;
      const currentNodes = nodesRef.current;
      const currentIsOwner = isOwnerRef.current;

      // Skip if no flow, not owner, or flow already has a name
      if (!currentFlowId || !currentIsOwner) {
        return;
      }

      // Only process "Untitled" flows
      if (currentFlowName !== "Untitled") {
        return;
      }

      // Count non-comment nodes (comment nodes are annotations, not workflow nodes).
      // Nodes with undefined/missing types are intentionally counted as content
      // to prevent accidental deletion of flows with corrupted metadata.
      const nodeCount = currentNodes.filter((n) => n.type !== "comment").length;

      // Send cleanup request via sendBeacon (fire-and-forget)
      const url = `/api/flows/${currentFlowId}/cleanup`;
      const body = JSON.stringify({ nodeCount });

      try {
        navigator.sendBeacon(url, body);
      } catch (error) {
        // sendBeacon failed - nothing we can do, flow will remain as-is
        console.error("Failed to send cleanup beacon:", error);
      }
    };

    // Use pagehide instead of beforeunload - more reliable for sendBeacon
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []); // Empty deps - event handler uses refs for latest values
}
