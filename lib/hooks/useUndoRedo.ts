import { useCallback, useRef, useState, useEffect } from "react";
import type { Node, Edge } from "@xyflow/react";

interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface UseUndoRedoOptions {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
  maxHistory?: number;
}

interface UseUndoRedoReturn {
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

/**
 * Clone a node, filtering out non-serializable React Flow internal properties.
 * Properties like `measured`, `internals`, and DOM references can't be cloned.
 */
function cloneNode(node: Node): Node {
  return {
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: structuredClone(node.data),
    ...(node.parentId !== undefined && { parentId: node.parentId }),
    ...(node.extent !== undefined && { extent: node.extent }),
    ...(node.expandParent !== undefined && { expandParent: node.expandParent }),
    ...(node.draggable !== undefined && { draggable: node.draggable }),
    ...(node.selectable !== undefined && { selectable: node.selectable }),
    ...(node.connectable !== undefined && { connectable: node.connectable }),
    ...(node.deletable !== undefined && { deletable: node.deletable }),
    ...(node.dragHandle !== undefined && { dragHandle: node.dragHandle }),
    ...(node.width !== undefined && { width: node.width }),
    ...(node.height !== undefined && { height: node.height }),
    ...(node.zIndex !== undefined && { zIndex: node.zIndex }),
    ...(node.ariaLabel !== undefined && { ariaLabel: node.ariaLabel }),
    ...(node.focusable !== undefined && { focusable: node.focusable }),
    ...(node.style !== undefined && { style: structuredClone(node.style) }),
    ...(node.className !== undefined && { className: node.className }),
    ...(node.selected !== undefined && { selected: node.selected }),
    ...(node.hidden !== undefined && { hidden: node.hidden }),
    // Note: `measured` and `internals` are intentionally omitted as they're
    // non-serializable React Flow internal state
  } as Node;
}

/**
 * Clone an edge, filtering out non-serializable properties.
 */
function cloneEdge(edge: Edge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.sourceHandle !== undefined && { sourceHandle: edge.sourceHandle }),
    ...(edge.targetHandle !== undefined && { targetHandle: edge.targetHandle }),
    ...(edge.type !== undefined && { type: edge.type }),
    ...(edge.animated !== undefined && { animated: edge.animated }),
    ...(edge.hidden !== undefined && { hidden: edge.hidden }),
    ...(edge.deletable !== undefined && { deletable: edge.deletable }),
    ...(edge.selectable !== undefined && { selectable: edge.selectable }),
    ...(edge.data !== undefined && { data: structuredClone(edge.data) }),
    ...(edge.style !== undefined && { style: structuredClone(edge.style) }),
    ...(edge.className !== undefined && { className: edge.className }),
    ...(edge.label !== undefined && { label: edge.label }),
    ...(edge.labelStyle !== undefined && { labelStyle: structuredClone(edge.labelStyle) }),
    ...(edge.labelShowBg !== undefined && { labelShowBg: edge.labelShowBg }),
    ...(edge.labelBgStyle !== undefined && { labelBgStyle: structuredClone(edge.labelBgStyle) }),
    ...(edge.labelBgPadding !== undefined && { labelBgPadding: edge.labelBgPadding }),
    ...(edge.labelBgBorderRadius !== undefined && { labelBgBorderRadius: edge.labelBgBorderRadius }),
    ...(edge.markerStart !== undefined && { markerStart: edge.markerStart }),
    ...(edge.markerEnd !== undefined && { markerEnd: edge.markerEnd }),
    ...(edge.zIndex !== undefined && { zIndex: edge.zIndex }),
    ...(edge.ariaLabel !== undefined && { ariaLabel: edge.ariaLabel }),
    ...(edge.interactionWidth !== undefined && { interactionWidth: edge.interactionWidth }),
    ...(edge.focusable !== undefined && { focusable: edge.focusable }),
    ...(edge.selected !== undefined && { selected: edge.selected }),
  } as Edge;
}

/**
 * Create a deep clone of the flow state, safe for serialization.
 */
function cloneFlowState(nodes: Node[], edges: Edge[]): HistorySnapshot {
  return {
    nodes: nodes.map(cloneNode),
    edges: edges.map(cloneEdge),
  };
}

/**
 * Hook to manage undo/redo for flow state.
 *
 * Uses a snapshot-based approach - call takeSnapshot() before any
 * state-changing operation to enable undoing it.
 *
 * Keyboard shortcuts:
 * - Cmd+Z (Mac) / Ctrl+Z (Windows): Undo
 * - Shift+Cmd+Z (Mac) / Ctrl+Y (Windows): Redo
 */
export function useUndoRedo({
  nodes,
  edges,
  setNodes,
  setEdges,
  reactFlowWrapper,
  maxHistory = 50,
}: UseUndoRedoOptions): UseUndoRedoReturn {
  // Use refs for history to avoid triggering re-renders
  const historyRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);

  // Track current state in refs to avoid race conditions
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);

  // Keep refs in sync with props
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Track if we're currently applying an undo/redo to prevent nested snapshots
  const isApplyingRef = useRef(false);

  // State for canUndo/canRedo (triggers re-renders when changed)
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Update canUndo/canRedo state when history changes
  const updateState = useCallback(() => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  /**
   * Take a snapshot of the current state.
   * Call this BEFORE making changes to enable undoing them.
   */
  const takeSnapshot = useCallback(() => {
    // Don't snapshot while applying undo/redo
    if (isApplyingRef.current) return;

    const snapshot = cloneFlowState(nodesRef.current, edgesRef.current);

    historyRef.current.push(snapshot);

    // Clear redo stack - new action invalidates redo history
    futureRef.current = [];

    // Limit history size
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    }

    updateState();
  }, [maxHistory, updateState]);

  /**
   * Undo the last action by restoring the previous snapshot.
   */
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;

    isApplyingRef.current = true;

    // Save current state to redo stack using refs for atomic read
    const currentSnapshot = cloneFlowState(nodesRef.current, edgesRef.current);
    futureRef.current.push(currentSnapshot);

    // Pop and apply the previous state
    const previousSnapshot = historyRef.current.pop()!;
    setNodes(previousSnapshot.nodes);
    setEdges(previousSnapshot.edges);

    isApplyingRef.current = false;
    updateState();
  }, [setNodes, setEdges, updateState]);

  /**
   * Redo the last undone action.
   */
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    isApplyingRef.current = true;

    // Save current state to history stack using refs for atomic read
    const currentSnapshot = cloneFlowState(nodesRef.current, edgesRef.current);
    historyRef.current.push(currentSnapshot);

    // Limit history size
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    }

    // Pop and apply the future state
    const futureSnapshot = futureRef.current.pop()!;
    setNodes(futureSnapshot.nodes);
    setEdges(futureSnapshot.edges);

    isApplyingRef.current = false;
    updateState();
  }, [setNodes, setEdges, updateState, maxHistory]);

  /**
   * Clear all history (call when loading a new flow).
   */
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    futureRef.current = [];
    updateState();
  }, [updateState]);

  // Keyboard shortcuts
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

      // Only handle when focus is within the React Flow canvas
      if (!reactFlowWrapper.current?.contains(target)) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows)
      if (modifier && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      // Redo: Shift+Cmd+Z (Mac) or Ctrl+Y (Windows) or Ctrl+Shift+Z
      else if (
        (modifier && event.shiftKey && event.key === "z") ||
        (modifier && event.key === "y")
      ) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, reactFlowWrapper]);

  return {
    takeSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
