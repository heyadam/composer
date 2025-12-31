"use client";

import { useCallback, useRef, useState } from "react";
import type { Node, Edge, NodeChange } from "@xyflow/react";
import { addEdge } from "@xyflow/react";
import type {
  FlowChanges,
  AddNodeAction,
  AddEdgeAction,
  RemoveEdgeAction,
  RemoveNodeAction,
  AppliedChangesInfo,
  RemovedNodeInfo,
  RemovedEdgeInfo,
} from "@/lib/autopilot/types";
import { resolveNodeOverlaps, applyDisplacements } from "@/lib/layout";

/** CSS class for smooth position animation on displaced nodes */
const ANIMATION_CLASS = "autopilot-displaced";
/** Duration to keep animation class (matches CSS transition duration) */
const ANIMATION_DURATION_MS = 300;

export interface UseAutopilotIntegrationProps {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  edges: Edge[];
}

export interface UseAutopilotIntegrationReturn {
  highlightedIds: Set<string>;
  applyChanges: (changes: FlowChanges) => AppliedChangesInfo;
  undoChanges: (applied: AppliedChangesInfo) => void;
  clearHighlights: () => void;
  clearHighlightOnDrag: (changes: NodeChange[]) => void;
}

export function useAutopilotIntegration({
  setNodes,
  setEdges,
  edges,
}: UseAutopilotIntegrationProps): UseAutopilotIntegrationReturn {
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // Keep a ref to edges for use in the overlap resolver
  const edgesRef = useRef<Edge[]>(edges);
  edgesRef.current = edges;

  // Apply changes from autopilot
  const applyChanges = useCallback(
    (changes: FlowChanges): AppliedChangesInfo => {
      const nodeIds: string[] = [];
      const edgeIds: string[] = [];
      const removedNodes: RemovedNodeInfo[] = [];
      const removedEdges: RemovedEdgeInfo[] = [];

      // Collect actions by type for batched processing
      const addNodeActions: AddNodeAction[] = [];
      const addEdgeActions: AddEdgeAction[] = [];
      const removeEdgeActions: RemoveEdgeAction[] = [];
      const removeNodeActions: RemoveNodeAction[] = [];

      for (const action of changes.actions) {
        switch (action.type) {
          case "addNode":
            addNodeActions.push(action as AddNodeAction);
            break;
          case "addEdge":
            addEdgeActions.push(action as AddEdgeAction);
            break;
          case "removeEdge":
            removeEdgeActions.push(action as RemoveEdgeAction);
            break;
          case "removeNode":
            removeNodeActions.push(action as RemoveNodeAction);
            break;
        }
      }

      // Process removes first (to ensure accurate overlap detection)
      for (const removeAction of removeNodeActions) {
        const nodeId = removeAction.nodeId;

        // Store the node data for undo
        setNodes((nds) => {
          const nodeToRemove = nds.find((n) => n.id === nodeId);
          if (nodeToRemove) {
            removedNodes.push({
              id: nodeToRemove.id,
              type: nodeToRemove.type as string,
              position: nodeToRemove.position,
              data: nodeToRemove.data,
            });
          }
          return nds.filter((n) => n.id !== nodeId);
        });

        // Also remove connected edges and store them for undo
        setEdges((eds) => {
          const edgesToRemove = eds.filter(
            (e) => e.source === nodeId || e.target === nodeId
          );
          edgesToRemove.forEach((e) => {
            removedEdges.push({
              id: e.id,
              source: e.source,
              sourceHandle: e.sourceHandle,
              target: e.target,
              targetHandle: e.targetHandle,
              type: e.type,
              data: e.data as { dataType: string } | undefined,
            });
          });
          return eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
        });
      }

      for (const removeAction of removeEdgeActions) {
        setEdges((eds) => eds.filter((e) => e.id !== removeAction.edgeId));
      }

      // Batch add nodes and resolve overlaps in a single setNodes call
      if (addNodeActions.length > 0) {
        const newNodes: Node[] = addNodeActions.map((nodeAction) => {
          nodeIds.push(nodeAction.node.id);
          return {
            id: nodeAction.node.id,
            type: nodeAction.node.type,
            position: nodeAction.node.position,
            data: nodeAction.node.data,
            className: "autopilot-added",
          };
        });

        // Collect new edges to include in overlap resolution
        // This ensures we know which existing nodes are sources/targets of new nodes
        const newEdges: Edge[] = addEdgeActions.map((edgeAction) => ({
          id: edgeAction.edge.id,
          source: edgeAction.edge.source,
          sourceHandle: edgeAction.edge.sourceHandle,
          target: edgeAction.edge.target,
          targetHandle: edgeAction.edge.targetHandle,
          type: "colored",
          data: edgeAction.edge.data,
        }));

        setNodes((existingNodes) => {
          // Combine existing nodes with new nodes
          const allNodes = [...existingNodes, ...newNodes];
          const newNodeIds = new Set(nodeIds);

          // Combine existing edges with new edges for accurate relationship detection
          const allEdges = [...(edgesRef.current || []), ...newEdges];

          // Resolve overlaps between new nodes and existing nodes
          const displacements = resolveNodeOverlaps(
            allNodes,
            newNodeIds,
            allEdges
          );

          // Apply displacements to shift existing nodes with animation class
          if (Object.keys(displacements).length > 0) {
            // Schedule removal of animation class after transition completes
            setTimeout(() => {
              setNodes((nodes) =>
                nodes.map((n) => {
                  if (n.className?.includes(ANIMATION_CLASS)) {
                    return {
                      ...n,
                      className: n.className
                        .replace(ANIMATION_CLASS, "")
                        .trim() || undefined,
                    };
                  }
                  return n;
                })
              );
            }, ANIMATION_DURATION_MS + 50); // Small buffer for safety

            return applyDisplacements(allNodes, displacements, {
              animationClass: ANIMATION_CLASS,
            });
          }

          return allNodes;
        });
      }

      // Add edges after nodes are added
      for (const edgeAction of addEdgeActions) {
        edgeIds.push(edgeAction.edge.id);
        setEdges((eds) =>
          addEdge(
            {
              id: edgeAction.edge.id,
              source: edgeAction.edge.source,
              sourceHandle: edgeAction.edge.sourceHandle,
              target: edgeAction.edge.target,
              targetHandle: edgeAction.edge.targetHandle,
              type: "colored",
              data: edgeAction.edge.data,
            },
            eds
          )
        );
      }

      // Track highlighted nodes
      setHighlightedIds((prev) => new Set([...prev, ...nodeIds]));

      return { nodeIds, edgeIds, removedNodes, removedEdges };
    },
    [setNodes, setEdges]
  );

  // Undo changes from autopilot
  const undoChanges = useCallback(
    (applied: AppliedChangesInfo) => {
      // Remove added nodes
      setNodes((nds) => nds.filter((n) => !applied.nodeIds.includes(n.id)));
      // Remove added edges
      setEdges((eds) => eds.filter((e) => !applied.edgeIds.includes(e.id)));

      // Restore removed nodes
      if (applied.removedNodes && applied.removedNodes.length > 0) {
        setNodes((nds) =>
          nds.concat(
            applied.removedNodes!.map((node) => ({
              id: node.id,
              type: node.type,
              position: node.position,
              data: node.data,
            }))
          )
        );
      }

      // Restore removed edges
      if (applied.removedEdges && applied.removedEdges.length > 0) {
        setEdges((eds) =>
          eds.concat(
            applied.removedEdges!.map((edge) => ({
              id: edge.id,
              source: edge.source,
              sourceHandle: edge.sourceHandle,
              target: edge.target,
              targetHandle: edge.targetHandle,
              type: edge.type || "colored",
              data: edge.data,
            }))
          )
        );
      }

      // Remove from highlighted set
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        applied.nodeIds.forEach((id) => next.delete(id));
        return next;
      });
    },
    [setNodes, setEdges]
  );

  // Clear all autopilot highlights
  const clearHighlights = useCallback(() => {
    if (highlightedIds.size === 0) return;

    setNodes((nds) =>
      nds.map((n) =>
        highlightedIds.has(n.id) ? { ...n, className: undefined } : n
      )
    );
    setHighlightedIds(new Set());
  }, [highlightedIds, setNodes]);

  // Clear highlight for a specific node being dragged
  // Call this from handleNodesChange when processing position changes
  const clearHighlightOnDrag = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (
          change.type === "position" &&
          change.dragging &&
          highlightedIds.has(change.id)
        ) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === change.id ? { ...n, className: undefined } : n
            )
          );
          setHighlightedIds((prev) => {
            const next = new Set(prev);
            next.delete(change.id);
            return next;
          });
        }
      }
    },
    [highlightedIds, setNodes]
  );

  return {
    highlightedIds,
    applyChanges,
    undoChanges,
    clearHighlights,
    clearHighlightOnDrag,
  };
}
