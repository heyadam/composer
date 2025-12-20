"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  SelectionMode,
  type OnConnect,
  type ReactFlowInstance,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges/ColoredEdge";
import { ConnectionContext } from "./ConnectionContext";
import { NodeToolbar } from "./NodeToolbar";
import { AutopilotSidebar } from "./AutopilotSidebar";
import { ActionBar } from "./ActionBar";
import { AvyLogo } from "./AvyLogo";
import { SaveFlowDialog } from "./SaveFlowDialog";
import { FlowContextMenu } from "./FlowContextMenu";
import { CommentEditContext } from "./CommentEditContext";
import { initialNodes, initialEdges, defaultFlow } from "@/lib/example-flow";
import { useCommentSuggestions } from "@/lib/hooks/useCommentSuggestions";
import { useClipboard } from "@/lib/hooks/useClipboard";
import type { NodeType, CommentColor } from "@/types/flow";
import { executeFlow } from "@/lib/execution/engine";
import type { NodeExecutionState } from "@/lib/execution/types";
import type { FlowChanges, AddNodeAction, AddEdgeAction, RemoveEdgeAction, AppliedChangesInfo } from "@/lib/autopilot/types";
import { ResponsesSidebar, type PreviewEntry, type DebugEntry } from "./ResponsesSidebar";
import { useApiKeys, type ProviderId } from "@/lib/api-keys";
import {
  createSavedFlow,
  downloadFlow,
  openFlowFilePicker,
  type FlowMetadata,
} from "@/lib/flow-storage";
import { useBackgroundSettings } from "@/lib/hooks/useBackgroundSettings";

let id = 0;
const getId = () => `node_${id++}`;

// Update ID counter based on existing nodes to avoid collisions
const updateIdCounter = (nodes: Node[]) => {
  const maxId = nodes.reduce((max, node) => {
    const match = node.id.match(/node_(\d+)/);
    if (match) {
      return Math.max(max, parseInt(match[1], 10));
    }
    return max;
  }, -1);
  id = maxId + 1;
};

// Initialize counter based on initial nodes
updateIdCounter(initialNodes);

const defaultNodeData: Record<NodeType, Record<string, unknown>> = {
  "text-input": { label: "Input Text", inputValue: "" },
  "image-input": { label: "Input Image" },
  "preview-output": { label: "Preview Output" },
  "text-generation": { label: "AI Text", prompt: "", provider: "google", model: "gemini-3-flash-preview", googleThinkingConfig: { thinkingLevel: "low" }, googleSafetyPreset: "default" },
  "image-generation": { label: "AI Image", prompt: "", outputFormat: "webp", size: "1024x1024", quality: "low", partialImages: 3 },
  "ai-logic": { label: "AI Logic", transformPrompt: "", codeExpanded: false },
  "comment": { label: "Comment", description: "", color: "gray" },
  "react-component": { label: "React Component", userPrompt: "", provider: "anthropic", model: "claude-sonnet-4-5", stylePreset: "simple" },
};

export function AgentFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Flow metadata state
  const [flowMetadata, setFlowMetadata] = useState<FlowMetadata | undefined>(
    defaultFlow.metadata as FlowMetadata
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [previewEntries, setPreviewEntries] = useState<PreviewEntry[]>([]);
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);
  const [activeResponseTab, setActiveResponseTab] = useState<"responses" | "debug">("responses");
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

  // Sidebar and palette states
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [autopilotHighlightedIds, setAutopilotHighlightedIds] = useState<Set<string>>(new Set());
  const [nodesPaletteOpen, setNodesPaletteOpen] = useState(false);
  const [responsesOpen, setResponsesOpen] = useState(true);

  // API keys context
  const { keys: apiKeys, hasRequiredKey } = useApiKeys();
  const [keyError, setKeyError] = useState<string | null>(null);

  // Background settings
  const { settings: bgSettings } = useBackgroundSettings();

  // Comment AI suggestion hook
  const { triggerGeneration, markUserEdited } = useCommentSuggestions({
    nodes,
    setNodes,
  });

  // Clipboard for copy/paste
  useClipboard({
    nodes,
    edges,
    setNodes,
    setEdges,
    reactFlowInstance,
    reactFlowWrapper,
    getId,
  });

  // Connection drag state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);

  // Panning state for logo animation
  const [isPanning, setIsPanning] = useState(false);

  // Apply changes from autopilot
  const applyAutopilotChanges = useCallback(
    (changes: FlowChanges): AppliedChangesInfo => {
      const nodeIds: string[] = [];
      const edgeIds: string[] = [];

      for (const action of changes.actions) {
        if (action.type === "addNode") {
          const nodeAction = action as AddNodeAction;
          nodeIds.push(nodeAction.node.id);
          setNodes((nds) =>
            nds.concat({
              id: nodeAction.node.id,
              type: nodeAction.node.type,
              position: nodeAction.node.position,
              data: nodeAction.node.data,
              className: "autopilot-added",
            })
          );
        } else if (action.type === "addEdge") {
          const edgeAction = action as AddEdgeAction;
          edgeIds.push(edgeAction.edge.id);
          setEdges((eds) =>
            addEdge(
              {
                id: edgeAction.edge.id,
                source: edgeAction.edge.source,
                target: edgeAction.edge.target,
                type: "colored",
                data: edgeAction.edge.data,
              },
              eds
            )
          );
        } else if (action.type === "removeEdge") {
          const removeAction = action as RemoveEdgeAction;
          setEdges((eds) => eds.filter((e) => e.id !== removeAction.edgeId));
        }
      }

      // Track highlighted nodes
      setAutopilotHighlightedIds((prev) => new Set([...prev, ...nodeIds]));

      return { nodeIds, edgeIds };
    },
    [setNodes, setEdges]
  );

  // Undo changes from autopilot
  const undoAutopilotChanges = useCallback(
    (applied: AppliedChangesInfo) => {
      setNodes((nds) => nds.filter((n) => !applied.nodeIds.includes(n.id)));
      setEdges((eds) => eds.filter((e) => !applied.edgeIds.includes(e.id)));
      // Remove from highlighted set
      setAutopilotHighlightedIds((prev) => {
        const next = new Set(prev);
        applied.nodeIds.forEach((id) => next.delete(id));
        return next;
      });
    },
    [setNodes, setEdges]
  );

  // Helper to get absolute position of a node (accounting for parent chain)
  const getAbsolutePosition = useCallback(
    (node: Node, allNodes: Node[]): { x: number; y: number } => {
      let x = node.position.x;
      let y = node.position.y;
      let currentNode = node;

      while (currentNode.parentId) {
        const parent = allNodes.find((n) => n.id === currentNode.parentId);
        if (!parent) break;
        x += parent.position.x;
        y += parent.position.y;
        currentNode = parent;
      }

      return { x, y };
    },
    []
  );

  // Helper to check if a node is inside a comment's bounds
  // Uses a fixed offset from top-left to avoid issues with unmeasured nodes
  const isInsideComment = useCallback(
    (
      point: { x: number; y: number },
      comment: Node,
      allNodes: Node[]
    ): boolean => {
      const commentPos = getAbsolutePosition(comment, allNodes);
      // Check multiple sources for dimensions (style, direct props, measured)
      // After resize, React Flow may update width/height directly on the node
      const commentWidth =
        (comment.width as number) ||
        (comment.measured?.width as number) ||
        (comment.style?.width as number) ||
        300;
      const commentHeight =
        (comment.height as number) ||
        (comment.measured?.height as number) ||
        (comment.style?.height as number) ||
        200;

      // Check if a point near the node's top-left is inside comment bounds
      // Using 40px offset to account for node header area
      const checkX = point.x + 40;
      const checkY = point.y + 40;

      return (
        checkX >= commentPos.x &&
        checkX <= commentPos.x + commentWidth &&
        checkY >= commentPos.y &&
        checkY <= commentPos.y + commentHeight
      );
    },
    [getAbsolutePosition]
  );

  // Wrap onNodesChange to clear autopilot highlight when nodes are dragged
  // and handle comment deletion (unparent children) and drag-based parenting
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      // Check if any comments are being deleted
      const deletedCommentIds = new Set<string>();
      for (const change of changes) {
        if (change.type === "remove") {
          const node = nodes.find((n) => n.id === change.id);
          if (node?.type === "comment") {
            deletedCommentIds.add(change.id);
          }
        }
      }

      // If comments are being deleted, handle unparenting and deletion atomically
      if (deletedCommentIds.size > 0) {
        // Filter out the comment deletion changes - we'll handle them manually
        const nonCommentDeletionChanges = changes.filter(
          (change) => !(change.type === "remove" && deletedCommentIds.has(change.id))
        );

        // Apply non-deletion changes first
        if (nonCommentDeletionChanges.length > 0) {
          onNodesChange(nonCommentDeletionChanges);
        }

        // Now atomically unparent children and remove comments
        setNodes((nds) => {
          // Build a map of comment positions before removal
          const commentPositions = new Map<string, { x: number; y: number }>();
          for (const id of deletedCommentIds) {
            const comment = nds.find((n) => n.id === id);
            if (comment) {
              commentPositions.set(id, comment.position);
            }
          }

          return nds
            .map((node) => {
              // Unparent children of deleted comments
              if (node.parentId && deletedCommentIds.has(node.parentId)) {
                const parentPos = commentPositions.get(node.parentId) || { x: 0, y: 0 };
                return {
                  ...node,
                  parentId: undefined,
                                    // Convert relative position back to absolute
                  position: {
                    x: node.position.x + parentPos.x,
                    y: node.position.y + parentPos.y,
                  },
                };
              }
              return node;
            })
            // Remove the deleted comments
            .filter((node) => !deletedCommentIds.has(node.id));
        });

        // Clear highlight for any nodes being dragged (from non-deletion changes)
        for (const change of nonCommentDeletionChanges) {
          if (change.type === "position" && change.dragging && autopilotHighlightedIds.has(change.id)) {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === change.id ? { ...n, className: undefined } : n
              )
            );
            setAutopilotHighlightedIds((prev) => {
              const next = new Set(prev);
              next.delete(change.id);
              return next;
            });
          }
        }
        return;
      }

      // Apply changes first
      onNodesChange(changes);

      // Check for drag end to handle auto-parenting/unparenting
      const dragEndIds = new Set<string>();
      for (const change of changes) {
        if (change.type === "position" && change.dragging === false) {
          dragEndIds.add(change.id);
        }
      }

      if (dragEndIds.size > 0) {
        // Track comments that had children added/removed for AI regeneration
        const affectedCommentIds = new Set<string>();

        setNodes((nds) => {
          let modified = false;
          const result = nds.map((node) => {
            // Check if this node just finished dragging
            if (!dragEndIds.has(node.id)) return node;

            // Don't auto-parent comment nodes (they can only be manually nested via Comment Around)
            if (node.type === "comment") return node;

            // Get node's absolute position
            const absPos = getAbsolutePosition(node, nds);

            // Find all comments (excluding the node's current parent)
            const comments = nds.filter(
              (n) => n.type === "comment" && n.id !== node.parentId
            );

            // Find the smallest comment that contains this node (for nested comments)
            let targetComment: Node | null = null;
            let smallestArea = Infinity;

            for (const comment of comments) {
              if (isInsideComment(absPos, comment, nds)) {
                const w = (comment.width as number) || (comment.measured?.width as number) || (comment.style?.width as number) || 300;
                const h = (comment.height as number) || (comment.measured?.height as number) || (comment.style?.height as number) || 200;
                const area = w * h;
                if (area < smallestArea) {
                  smallestArea = area;
                  targetComment = comment;
                }
              }
            }

            // Also check if still inside current parent
            if (node.parentId) {
              const currentParent = nds.find((n) => n.id === node.parentId);
              if (
                currentParent &&
                isInsideComment(absPos, currentParent, nds)
              ) {
                // Still inside current parent, no change needed unless a smaller nested comment
                if (!targetComment) return node;
              }
            }

            // If we found a target comment to parent to
            if (targetComment) {
              // Already parented to this comment?
              if (node.parentId === targetComment.id) return node;

              modified = true;
              // Track old parent (losing a child) and new parent (gaining a child)
              if (node.parentId) affectedCommentIds.add(node.parentId);
              affectedCommentIds.add(targetComment.id);

              const targetPos = getAbsolutePosition(targetComment, nds);
              return {
                ...node,
                parentId: targetComment.id,
                                position: {
                  x: absPos.x - targetPos.x,
                  y: absPos.y - targetPos.y,
                },
              };
            }

            // Not inside any comment - unparent if currently parented
            if (node.parentId) {
              const currentParent = nds.find((n) => n.id === node.parentId);
              if (
                currentParent &&
                !isInsideComment(absPos, currentParent, nds)
              ) {
                modified = true;
                // Track old parent (losing a child)
                affectedCommentIds.add(node.parentId);
                return {
                  ...node,
                  parentId: undefined,
                                    position: absPos,
                };
              }
            }

            return node;
          });

          return modified ? result : nds;
        });

        // Trigger AI regeneration for affected comments
        affectedCommentIds.forEach((commentId) => triggerGeneration(commentId));
      }

      // Check for comment resize to capture nodes that are now inside
      // Detect resize by looking for dimensions changes on comment nodes
      const resizedCommentIds = new Set<string>();
      for (const change of changes) {
        if (change.type === "dimensions" && change.resizing === false) {
          // Check if this is a comment node
          const node = nodes.find((n) => n.id === change.id);
          if (node?.type === "comment") {
            resizedCommentIds.add(change.id);
          }
        }
      }

      if (resizedCommentIds.size > 0) {
        // Track comments that had children added/removed for AI regeneration
        const affectedCommentIds = new Set<string>();

        setNodes((nds) => {
          let modified = false;
          const result = nds.map((node) => {
            // Skip comment nodes - they don't get auto-parented
            if (node.type === "comment") return node;

            // Get node's absolute position
            const absPos = getAbsolutePosition(node, nds);

            // If node is a child of a resized comment, check if it's still inside
            if (node.parentId && resizedCommentIds.has(node.parentId)) {
              const parentComment = nds.find((n) => n.id === node.parentId);
              if (parentComment && !isInsideComment(absPos, parentComment, nds)) {
                // Node is now outside - unparent it
                modified = true;
                // Track the comment losing a child
                affectedCommentIds.add(node.parentId);
                return {
                  ...node,
                  parentId: undefined,
                                    position: absPos,
                };
              }
            }

            // Skip nodes that already have a parent (for capture logic)
            if (node.parentId) return node;

            // Check if this node is now inside any of the resized comments
            for (const commentId of resizedCommentIds) {
              const comment = nds.find((n) => n.id === commentId);
              if (comment && isInsideComment(absPos, comment, nds)) {
                modified = true;
                // Track the comment gaining a child
                affectedCommentIds.add(commentId);
                const commentPos = getAbsolutePosition(comment, nds);
                return {
                  ...node,
                  parentId: commentId,
                                    position: {
                    x: absPos.x - commentPos.x,
                    y: absPos.y - commentPos.y,
                  },
                };
              }
            }

            return node;
          });

          return modified ? result : nds;
        });

        // Trigger AI regeneration for affected comments
        affectedCommentIds.forEach((commentId) => triggerGeneration(commentId));
      }

      // Clear highlight for any nodes being dragged
      for (const change of changes) {
        if (change.type === "position" && change.dragging && autopilotHighlightedIds.has(change.id)) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === change.id ? { ...n, className: undefined } : n
            )
          );
          setAutopilotHighlightedIds((prev) => {
            const next = new Set(prev);
            next.delete(change.id);
            return next;
          });
        }
      }
    },
    [onNodesChange, autopilotHighlightedIds, setNodes, nodes, getAbsolutePosition, isInsideComment, triggerGeneration]
  );

  // Helper to clear all autopilot highlights
  const clearAutopilotHighlights = useCallback(() => {
    if (autopilotHighlightedIds.size === 0) return;

    setNodes((nds) =>
      nds.map((n) =>
        autopilotHighlightedIds.has(n.id) ? { ...n, className: undefined } : n
      )
    );
    setAutopilotHighlightedIds(new Set());
  }, [autopilotHighlightedIds, setNodes]);

  // Clear highlights when clicking on canvas
  const handlePaneClick = useCallback(() => {
    clearAutopilotHighlights();
  }, [clearAutopilotHighlights]);

  // Clear highlights when clicking on any node
  const handleNodeClick = useCallback(() => {
    clearAutopilotHighlights();
  }, [clearAutopilotHighlights]);

  const addPreviewEntry = useCallback(
    (entry: Omit<PreviewEntry, "id" | "timestamp">) => {
      setPreviewEntries((prev) => [
        ...prev,
        {
          ...entry,
          id: `${entry.nodeId}-${Date.now()}`,
          timestamp: Date.now(),
        },
      ]);
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

  // Determine edge data type based on source node
  const getEdgeDataType = useCallback((sourceNodeId: string): string => {
    const sourceNode = nodesRef.current.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return "default";

    switch (sourceNode.type) {
      case "image-generation":
      case "image-input":
        return "image";
      case "text-input":
      case "text-generation":
        return "string";
      case "react-component":
        return "response";
      default:
        return "default";
    }
  }, []);

  // Allow all connections - replacement is handled in onConnect
  const isValidConnection = useCallback(() => true, []);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const dataType = params.source ? getEdgeDataType(params.source) : "default";

      setEdges((eds) => {
        // Remove any existing edge to this target handle (replacement behavior)
        const filtered = eds.filter((edge) => {
          if (edge.target !== params.target) return true;
          // If existing edge has no targetHandle, it connects to the default input
          // and should be replaced by any new connection to the same node
          if (!edge.targetHandle) return false;
          // Otherwise, only filter out if handles match exactly
          return edge.targetHandle !== params.targetHandle;
        });

        // Add the new edge
        return addEdge(
          {
            ...params,
            type: "colored",
            data: {
              dataType,
              sourceHandle: params.sourceHandle,
              targetHandle: params.targetHandle,
            },
          },
          filtered
        );
      });
    },
    [setEdges, getEdgeDataType]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  const onConnectStart = useCallback((_: unknown, params: { nodeId: string | null }) => {
    setIsConnecting(true);
    setConnectingFromNodeId(params.nodeId);
  }, []);

  const onConnectEnd = useCallback(() => {
    setIsConnecting(false);
    setConnectingFromNodeId(null);
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow") as NodeType;

      if (!type || !reactFlowInstance.current || !reactFlowWrapper.current) {
        return;
      }

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { ...defaultNodeData[type] },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

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
  }, []);

  // Add a node at the center of the viewport (for toolbar click-to-add)
  const handleAddNodeAtCenter = useCallback(
    (nodeType: NodeType) => {
      const position = getViewportCenter();
      const newNode = {
        id: getId(),
        type: nodeType,
        position: {
          x: position.x - 100, // Center horizontally (assuming ~200px node width)
          y: position.y - 50, // Center vertically (assuming ~100px node height)
        },
        data: { ...defaultNodeData[nodeType] },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [getViewportCenter, setNodes]
  );

  // Get currently selected nodes (excluding comments when wrapping)
  const getSelectedNodes = useCallback(() => {
    return nodes.filter((n) => n.selected && n.type !== "comment");
  }, [nodes]);

  // Check if any nodes are selected
  const hasSelection = nodes.some((n) => n.selected && n.type !== "comment");

  // Handler to create comment around selected nodes
  const handleCommentAround = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length === 0) return;

    // Calculate bounding box of selected nodes
    const padding = 40;
    const headerHeight = 60; // Space for the comment header

    const bounds = selectedNodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.position.x),
        minY: Math.min(acc.minY, node.position.y),
        maxX: Math.max(acc.maxX, node.position.x + (node.measured?.width || 280)),
        maxY: Math.max(acc.maxY, node.position.y + (node.measured?.height || 200)),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    const commentId = getId();
    const commentPosition = {
      x: bounds.minX - padding,
      y: bounds.minY - padding - headerHeight,
    };

    // Create comment node with default values
    const commentNode: Node = {
      id: commentId,
      type: "comment",
      position: commentPosition,
      style: {
        width: bounds.maxX - bounds.minX + padding * 2,
        height: bounds.maxY - bounds.minY + padding * 2 + headerHeight,
        zIndex: -1, // Render behind other nodes
      },
      data: {
        label: "Comment",
        description: "",
        color: "gray" as CommentColor,
      },
    };

    // Update selected nodes to be children of comment
    setNodes((nds) => [
      commentNode,
      ...nds.map((node) =>
        selectedNodes.some((sn) => sn.id === node.id)
          ? {
              ...node,
              parentId: commentId,
              // Convert absolute position to relative within parent
              position: {
                x: node.position.x - commentPosition.x,
                y: node.position.y - commentPosition.y,
              },
            }
          : node
      ),
    ]);

    // Trigger AI generation for the new comment's title/description
    triggerGeneration(commentId);
  }, [getSelectedNodes, setNodes, triggerGeneration]);

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
    setFinalOutput(null);
    setPreviewEntries([]);
    setDebugEntries([]);
    addedPreviewIds.current.clear();
  }, [setNodes]);

  const runFlow = useCallback(async () => {
    if (isRunning) return;

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

    setKeyError(null);
    resetExecution();
    setIsRunning(true);

    // Create new AbortController for this execution
    abortControllerRef.current = new AbortController();

    try {
      const output = await executeFlow(
        nodes,
        edges,
        updateNodeExecutionState,
        apiKeys,
        abortControllerRef.current.signal
      );
      setFinalOutput(output);
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
  }, [nodes, edges, isRunning, updateNodeExecutionState, resetExecution, hasRequiredKey, apiKeys]);

  const cancelFlow = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Flow file operations
  const handleNewFlow = useCallback(() => {
    // Start with a blank canvas
    const now = new Date().toISOString();
    setNodes([]);
    setEdges([]);
    setFlowMetadata({
      name: "Untitled Flow",
      description: "",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    resetExecution();
    setAutopilotHighlightedIds(new Set());
    updateIdCounter([]);
  }, [setNodes, setEdges, resetExecution]);

  const handleSaveFlow = useCallback((name: string) => {
    const flow = createSavedFlow(nodes, edges, name, flowMetadata);
    setFlowMetadata(flow.metadata);
    downloadFlow(flow);
  }, [nodes, edges, flowMetadata]);

  const handleOpenFlow = useCallback(async () => {
    const result = await openFlowFilePicker();
    if (result.success && result.flow) {
      setNodes(result.flow.nodes);
      setEdges(result.flow.edges);
      setFlowMetadata(result.flow.metadata);
      resetExecution();
      setAutopilotHighlightedIds(new Set());

      // Update node ID counter to avoid collisions
      updateIdCounter(result.flow.nodes);

      // Fit view to show loaded flow (with small delay for state to settle)
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2 });
      }, 50);

      // Show warnings if any
      if (result.validation?.warnings.length) {
        console.warn("Flow loaded with warnings:", result.validation.warnings);
      }
    } else if (result.error && result.error !== "File selection cancelled") {
      console.error("Failed to open flow:", result.error);
      alert(`Failed to open flow: ${result.error}`);
    }
  }, [setNodes, setEdges, resetExecution]);

  return (
    <div className="flex h-screen w-full">
      {/* Autopilot Sidebar (left) */}
      <AutopilotSidebar
        nodes={nodes}
        edges={edges}
        onApplyChanges={applyAutopilotChanges}
        onUndoChanges={undoAutopilotChanges}
        isOpen={autopilotOpen}
        onToggle={() => setAutopilotOpen(!autopilotOpen)}
      />
      <div ref={reactFlowWrapper} className="flex-1 h-full bg-muted/10 relative">
        <NodeToolbar
          isOpen={nodesPaletteOpen}
          onClose={() => setNodesPaletteOpen(false)}
          onAddNode={handleAddNodeAtCenter}
        />
        <CommentEditContext.Provider value={{ markUserEdited }}>
          <ConnectionContext.Provider value={{ isConnecting, connectingFromNodeId }}>
            <FlowContextMenu
              hasSelection={hasSelection}
              onCommentAround={handleCommentAround}
            >
              <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              isValidConnection={isValidConnection}
              onInit={onInit}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: "colored" }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              deleteKeyCode={["Backspace", "Delete"]}
              proOptions={{ hideAttribution: true }}
              // Pan by default, hold space to enable selection box
              panOnDrag
              selectionOnDrag={false}
              selectionKeyCode="Space"
              selectionMode={SelectionMode.Partial}
              onMoveStart={() => setIsPanning(true)}
              onMoveEnd={() => setIsPanning(false)}
              onPaneClick={handlePaneClick}
              onNodeClick={handleNodeClick}
            >
              <Background
                variant={bgSettings.variant}
                color={bgSettings.color}
                gap={bgSettings.gap}
                size={bgSettings.size}
                style={{ backgroundColor: bgSettings.bgColor }}
              />
              <Controls />
            </ReactFlow>
            </FlowContextMenu>
          </ConnectionContext.Provider>
        </CommentEditContext.Provider>
        {/* Top center branding */}
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-4 pb-8 bg-gradient-to-b from-black/90 to-transparent">
          <AvyLogo isPanning={isPanning} />
        </div>
        <ActionBar
          onToggleNodes={() => setNodesPaletteOpen(!nodesPaletteOpen)}
          onToggleAutopilot={() => setAutopilotOpen(!autopilotOpen)}
          onToggleResponses={() => setResponsesOpen(!responsesOpen)}
          onCommentAround={handleCommentAround}
          onRun={runFlow}
          onCancel={cancelFlow}
          onReset={resetExecution}
          onNewFlow={handleNewFlow}
          onSaveFlow={() => setSaveDialogOpen(true)}
          onOpenFlow={handleOpenFlow}
          nodesPaletteOpen={nodesPaletteOpen}
          autopilotOpen={autopilotOpen}
          responsesOpen={responsesOpen}
          isRunning={isRunning}
          hasSelection={hasSelection}
        />
      </div>
      <ResponsesSidebar
        entries={previewEntries}
        debugEntries={debugEntries}
        activeTab={activeResponseTab}
        onTabChange={setActiveResponseTab}
        keyError={keyError}
        isOpen={responsesOpen}
      />
      <SaveFlowDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveFlow}
        defaultName={flowMetadata?.name || "My Flow"}
      />
    </div>
  );
}
