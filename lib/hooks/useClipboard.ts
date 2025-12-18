import { useCallback, useEffect, useRef } from "react";
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";

interface ClipboardData {
  nodes: Node[];
  edges: Edge[];
}

interface UseClipboardOptions {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  reactFlowInstance: React.RefObject<ReactFlowInstance | null>;
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
  getId: () => string;
}

export function useClipboard({
  nodes,
  edges,
  setNodes,
  setEdges,
  reactFlowInstance,
  reactFlowWrapper,
  getId,
}: UseClipboardOptions) {
  const clipboardRef = useRef<ClipboardData | null>(null);
  const pasteOffsetRef = useRef(0);

  // Get the center of the current viewport in flow coordinates
  const getViewportCenter = useCallback(() => {
    if (!reactFlowInstance.current || !reactFlowWrapper.current) {
      return { x: 0, y: 0 };
    }
    const { width, height } = reactFlowWrapper.current.getBoundingClientRect();
    return reactFlowInstance.current.screenToFlowPosition({
      x: width / 2,
      y: height / 2,
    });
  }, [reactFlowInstance, reactFlowWrapper]);

  // Copy selected nodes and their connecting edges
  const copySelectedNodes = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

    // Find edges that connect selected nodes to each other
    const connectedEdges = edges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    );

    // Deep copy nodes (strip execution state)
    const copiedNodes = selectedNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        // Strip execution state
        executionStatus: undefined,
        executionOutput: undefined,
        executionError: undefined,
      },
      // Strip selection state
      selected: false,
    }));

    // Deep copy edges
    const copiedEdges = connectedEdges.map((edge) => ({
      ...edge,
      selected: false,
    }));

    clipboardRef.current = {
      nodes: copiedNodes,
      edges: copiedEdges,
    };

    // Reset paste offset when copying new content
    pasteOffsetRef.current = 0;
  }, [nodes, edges]);

  // Paste nodes from clipboard
  const pasteNodes = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.nodes.length === 0) return;

    const { nodes: copiedNodes, edges: copiedEdges } = clipboardRef.current;

    // Increment paste offset for consecutive pastes
    pasteOffsetRef.current += 50;
    const offset = pasteOffsetRef.current;

    // Calculate the center of copied nodes
    const bounds = copiedNodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.position.x),
        minY: Math.min(acc.minY, node.position.y),
        maxX: Math.max(acc.maxX, node.position.x),
        maxY: Math.max(acc.maxY, node.position.y),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    const copiedCenter = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };

    // Get viewport center for positioning
    const viewportCenter = getViewportCenter();

    // Create ID mapping (old ID -> new ID)
    const idMapping = new Map<string, string>();
    copiedNodes.forEach((node) => {
      idMapping.set(node.id, getId());
    });

    // Create new nodes with new IDs and adjusted positions
    const newNodes: Node[] = copiedNodes.map((node) => {
      const newId = idMapping.get(node.id)!;

      // Calculate relative position from copied center
      const relativeX = node.position.x - copiedCenter.x;
      const relativeY = node.position.y - copiedCenter.y;

      // Position relative to viewport center with offset
      const newPosition = {
        x: viewportCenter.x + relativeX + offset,
        y: viewportCenter.y + relativeY + offset,
      };

      // Handle parent relationships - only keep if parent is also being pasted
      let newParentId = node.parentId;
      if (newParentId) {
        const mappedParentId = idMapping.get(newParentId);
        if (mappedParentId) {
          newParentId = mappedParentId;
          // Keep relative position within parent
          return {
            ...node,
            id: newId,
            parentId: newParentId,
            selected: true, // Select pasted nodes
            className: undefined, // Clear autopilot highlight
          };
        } else {
          // Parent not being copied, use absolute position
          newParentId = undefined;
        }
      }

      return {
        ...node,
        id: newId,
        parentId: newParentId,
        position: newPosition,
        selected: true, // Select pasted nodes
        className: undefined, // Clear autopilot highlight
      };
    });

    // Create new edges with updated IDs
    const newEdges: Edge[] = copiedEdges.map((edge, index) => ({
      ...edge,
      id: `edge-${idMapping.get(edge.source)}-${idMapping.get(edge.target)}-${Date.now()}-${index}`,
      source: idMapping.get(edge.source)!,
      target: idMapping.get(edge.target)!,
      selected: false,
    }));

    // Deselect existing nodes and add new ones
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ]);

    // Add new edges
    setEdges((eds) => [...eds, ...newEdges]);
  }, [getViewportCenter, getId, setNodes, setEdges]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key === "c") {
        event.preventDefault();
        copySelectedNodes();
      } else if (modifier && event.key === "v") {
        event.preventDefault();
        pasteNodes();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copySelectedNodes, pasteNodes]);

  return {
    copySelectedNodes,
    pasteNodes,
    hasClipboard: clipboardRef.current !== null,
  };
}
