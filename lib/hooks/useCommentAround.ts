import { useCallback, useMemo } from "react";
import type { Node } from "@xyflow/react";
import type { CommentColor } from "@/types/flow";

interface UseCommentAroundOptions {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  triggerGeneration: (commentId: string) => void;
  getId: () => string;
  onBeforeChange?: () => void;
}

interface UseCommentAroundResult {
  hasSelection: boolean;
  handleCommentAround: () => void;
}

/**
 * Hook for wrapping selected nodes in a comment box.
 * Creates a comment node sized to contain all selected nodes,
 * then parents the selected nodes to the comment.
 */
export function useCommentAround({
  nodes,
  setNodes,
  triggerGeneration,
  getId,
  onBeforeChange,
}: UseCommentAroundOptions): UseCommentAroundResult {
  // Get currently selected nodes (excluding comments when wrapping)
  const getSelectedNodes = useCallback(() => {
    return nodes.filter((n) => n.selected && n.type !== "comment");
  }, [nodes]);

  // Check if any non-comment nodes are selected
  const hasSelection = useMemo(() => {
    return nodes.some((n) => n.selected && n.type !== "comment");
  }, [nodes]);

  // Handler to create comment around selected nodes
  const handleCommentAround = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length === 0) return;

    // Snapshot for undo support
    onBeforeChange?.();

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
  }, [getSelectedNodes, setNodes, triggerGeneration, getId, onBeforeChange]);

  return {
    hasSelection,
    handleCommentAround,
  };
}
