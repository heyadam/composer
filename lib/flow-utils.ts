/**
 * Shared flow utilities
 */

import type { Node } from "@xyflow/react";

/**
 * Update ID counter based on existing nodes to avoid ID collisions
 *
 * Scans existing nodes for the highest node_N ID and sets the counter
 * to one higher to ensure new nodes get unique IDs.
 */
export function updateIdCounter(
  nodes: Node[],
  setIdCounter: (id: number) => void
): void {
  const maxId = nodes.reduce((max, node) => {
    const match = node.id.match(/node_(\d+)/);
    if (match) {
      return Math.max(max, parseInt(match[1], 10));
    }
    return max;
  }, -1);
  setIdCounter(maxId + 1);
}
