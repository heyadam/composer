import { useCallback } from "react";
import type { Node, NodeChange } from "@xyflow/react";

type SetNodes = React.Dispatch<React.SetStateAction<Node[]>>;
type OnNodesChange = (changes: NodeChange<Node>[]) => void;

export interface UseNodeParentingOptions {
  nodes: Node[];
  setNodes: SetNodes;
  onNodesChange: OnNodesChange;
  triggerGeneration: (commentId: string) => void;
  clearHighlightOnDrag: (changes: NodeChange<Node>[]) => void;
  /** Called before drag/resize ends - use for undo snapshots */
  onBeforeChange?: () => void;
}

export interface UseNodeParentingReturn {
  handleNodesChange: OnNodesChange;
  getAbsolutePosition: (node: Node, allNodes: Node[]) => { x: number; y: number };
  isInsideComment: (point: { x: number; y: number }, comment: Node, allNodes: Node[]) => boolean;
}

/**
 * Get absolute position of a node (accounting for parent chain)
 */
export function getAbsolutePosition(
  node: Node,
  allNodes: Node[]
): { x: number; y: number } {
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
}

/**
 * Check if a point is inside a comment's bounds
 * Uses a fixed offset from top-left to avoid issues with unmeasured nodes
 */
export function isInsideComment(
  point: { x: number; y: number },
  comment: Node,
  allNodes: Node[]
): boolean {
  const commentPos = getAbsolutePosition(comment, allNodes);
  // Check multiple sources for dimensions (style, direct props, measured)
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
}

/**
 * Find the smallest comment that contains a given position
 */
export function findSmallestContainingComment(
  pos: { x: number; y: number },
  comments: Node[],
  allNodes: Node[]
): Node | null {
  let targetComment: Node | null = null;
  let smallestArea = Infinity;

  for (const comment of comments) {
    if (isInsideComment(pos, comment, allNodes)) {
      const w =
        (comment.width as number) ||
        (comment.measured?.width as number) ||
        (comment.style?.width as number) ||
        300;
      const h =
        (comment.height as number) ||
        (comment.measured?.height as number) ||
        (comment.style?.height as number) ||
        200;
      const area = w * h;
      if (area < smallestArea) {
        smallestArea = area;
        targetComment = comment;
      }
    }
  }

  return targetComment;
}

/**
 * Handle comment deletion - unparent children and remove comments atomically
 */
function handleCommentDeletion(
  changes: NodeChange<Node>[],
  nodes: Node[],
  setNodes: SetNodes,
  onNodesChange: OnNodesChange,
  clearHighlightOnDrag: (changes: NodeChange<Node>[]) => void
): boolean {
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

  if (deletedCommentIds.size === 0) {
    return false; // No comment deletions
  }

  // Filter out the comment deletion changes - we'll handle them manually
  const nonCommentDeletionChanges = changes.filter(
    (change) => !(change.type === "remove" && deletedCommentIds.has(change.id))
  );

  // Apply non-deletion changes first
  if (nonCommentDeletionChanges.length > 0) {
    onNodesChange(nonCommentDeletionChanges);
  }

  // Atomically unparent children and remove comments
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

  // Clear highlight for any nodes being dragged
  clearHighlightOnDrag(nonCommentDeletionChanges);
  return true;
}

/**
 * Handle drag end - auto-parent/unparent nodes into comments
 */
function handleDragEnd(
  changes: NodeChange<Node>[],
  setNodes: SetNodes,
  triggerGeneration: (commentId: string) => void
): void {
  const dragEndIds = new Set<string>();
  for (const change of changes) {
    if (change.type === "position" && change.dragging === false) {
      dragEndIds.add(change.id);
    }
  }

  if (dragEndIds.size === 0) return;

  // Track comments that had children added/removed for AI regeneration
  const affectedCommentIds = new Set<string>();

  setNodes((nds) => {
    let modified = false;
    const result = nds.map((node) => {
      // Check if this node just finished dragging
      if (!dragEndIds.has(node.id)) return node;

      // Don't auto-parent comment nodes
      if (node.type === "comment") return node;

      // Get node's absolute position
      const absPos = getAbsolutePosition(node, nds);

      // Find all comments (excluding the node's current parent)
      const comments = nds.filter(
        (n) => n.type === "comment" && n.id !== node.parentId
      );

      // Find the smallest comment that contains this node
      const targetComment = findSmallestContainingComment(absPos, comments, nds);

      // Also check if still inside current parent
      if (node.parentId) {
        const currentParent = nds.find((n) => n.id === node.parentId);
        if (currentParent && isInsideComment(absPos, currentParent, nds)) {
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
        if (currentParent && !isInsideComment(absPos, currentParent, nds)) {
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

/**
 * Handle comment resize - capture/release child nodes
 */
function handleCommentResize(
  changes: NodeChange<Node>[],
  nodes: Node[],
  setNodes: SetNodes,
  triggerGeneration: (commentId: string) => void
): void {
  const resizedCommentIds = new Set<string>();
  for (const change of changes) {
    if (change.type === "dimensions" && change.resizing === false) {
      const node = nodes.find((n) => n.id === change.id);
      if (node?.type === "comment") {
        resizedCommentIds.add(change.id);
      }
    }
  }

  if (resizedCommentIds.size === 0) return;

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

/**
 * Hook to manage node parenting behavior within comments
 *
 * Handles:
 * - Comment deletion with cascading unparenting
 * - Auto-parenting nodes when dragged into comments
 * - Auto-unparenting nodes when dragged out of comments
 * - Capturing/releasing nodes when comments are resized
 */
export function useNodeParenting({
  nodes,
  setNodes,
  onNodesChange,
  triggerGeneration,
  clearHighlightOnDrag,
  onBeforeChange,
}: UseNodeParentingOptions): UseNodeParentingReturn {
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      // Check if this is a drag end or resize end (state-changing operations)
      const hasDragEnd = changes.some(
        (c) => c.type === "position" && c.dragging === false
      );
      const hasResizeEnd = changes.some(
        (c) => c.type === "dimensions" && c.resizing === false
      );
      const hasRemoval = changes.some((c) => c.type === "remove");

      // Take snapshot before any state-changing operation
      if ((hasDragEnd || hasResizeEnd || hasRemoval) && onBeforeChange) {
        onBeforeChange();
      }

      // Handle comment deletion (unparent children)
      const wasCommentDeletion = handleCommentDeletion(
        changes,
        nodes,
        setNodes,
        onNodesChange,
        clearHighlightOnDrag
      );

      if (wasCommentDeletion) return;

      // Apply changes first
      onNodesChange(changes);

      // Handle drag end auto-parenting
      handleDragEnd(changes, setNodes, triggerGeneration);

      // Handle comment resize child capture
      handleCommentResize(changes, nodes, setNodes, triggerGeneration);

      // Clear highlight for any nodes being dragged
      clearHighlightOnDrag(changes);
    },
    [nodes, setNodes, onNodesChange, triggerGeneration, clearHighlightOnDrag, onBeforeChange]
  );

  // Expose helpers for potential reuse
  const getAbsolutePositionCb = useCallback(
    (node: Node, allNodes: Node[]) => getAbsolutePosition(node, allNodes),
    []
  );

  const isInsideCommentCb = useCallback(
    (point: { x: number; y: number }, comment: Node, allNodes: Node[]) =>
      isInsideComment(point, comment, allNodes),
    []
  );

  return {
    handleNodesChange,
    getAbsolutePosition: getAbsolutePositionCb,
    isInsideComment: isInsideCommentCb,
  };
}
