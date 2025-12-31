import type { Node, Edge } from "@xyflow/react";

/**
 * Bounding box representation for a node
 */
interface NodeBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  isNew: boolean;
  parentId?: string;
}

/**
 * Displacement vector for a node
 */
interface Displacement {
  dx: number;
  dy: number;
}

/**
 * Map of node IDs to their displacement vectors
 */
export interface DisplacementMap {
  [nodeId: string]: Displacement;
}

/**
 * Configuration for overlap resolution
 */
export interface OverlapConfig {
  /** Minimum gap between nodes after resolution (default: 50) */
  gap?: number;
  /** Maximum iterations to prevent infinite loops (default: 100) */
  maxIterations?: number;
  /** Default node width when measured is unavailable (default: 280) */
  defaultNodeWidth?: number;
  /** Default node height when measured is unavailable (default: 200) */
  defaultNodeHeight?: number;
  /** Maximum displacement to prevent excessive gaps (default: 400) */
  maxDisplacement?: number;
}

const DEFAULT_CONFIG: Required<OverlapConfig> = {
  gap: 50,
  maxIterations: 100,
  defaultNodeWidth: 280,
  defaultNodeHeight: 200,
  maxDisplacement: 400,
};

/**
 * Node type specific dimension estimates for nodes without measured dimensions.
 * All nodes have a fixed width of 280px (as per autopilot system prompt guidelines).
 * Heights vary by node type based on typical form content.
 */
const NODE_TYPE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "text-input": { width: 280, height: 180 },
  "image-input": { width: 280, height: 300 },
  "audio-input": { width: 280, height: 200 },
  "text-generation": { width: 280, height: 400 },
  "image-generation": { width: 280, height: 350 },
  "ai-logic": { width: 280, height: 300 },
  "string-combine": { width: 280, height: 250 },
  "react-component": { width: 280, height: 350 },
  "audio-transcription": { width: 280, height: 200 },
  "realtime-conversation": { width: 280, height: 350 },
  "preview-output": { width: 280, height: 280 },
  comment: { width: 300, height: 200 },
};

/**
 * Get node dimensions, preferring measured values with type-specific fallbacks
 */
function getNodeDimensions(
  node: Node,
  config: Required<OverlapConfig>
): { width: number; height: number } {
  // Comment nodes may have explicit style dimensions
  if (node.type === "comment") {
    return {
      width:
        (node.style?.width as number) ??
        node.measured?.width ??
        NODE_TYPE_DIMENSIONS.comment?.width ??
        config.defaultNodeWidth,
      height:
        (node.style?.height as number) ??
        node.measured?.height ??
        NODE_TYPE_DIMENSIONS.comment?.height ??
        config.defaultNodeHeight,
    };
  }

  // Use type-specific dimensions as fallback when measured isn't available
  const typeDimensions = node.type
    ? NODE_TYPE_DIMENSIONS[node.type]
    : undefined;

  return {
    width:
      node.measured?.width ?? typeDimensions?.width ?? config.defaultNodeWidth,
    height:
      node.measured?.height ??
      typeDimensions?.height ??
      config.defaultNodeHeight,
  };
}

/**
 * Build bounding box for a node, accounting for current displacement
 */
function buildNodeBounds(
  node: Node,
  isNew: boolean,
  displacement: Displacement,
  config: Required<OverlapConfig>
): NodeBounds {
  const { width, height } = getNodeDimensions(node, config);
  const x = node.position.x + displacement.dx;
  const y = node.position.y + displacement.dy;

  return {
    id: node.id,
    x,
    y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    isNew,
    parentId: node.parentId,
  };
}

/**
 * Check if two bounding boxes overlap (with gap consideration)
 */
function boundsOverlap(a: NodeBounds, b: NodeBounds, gap: number): boolean {
  // No overlap if separated horizontally or vertically
  return !(
    a.right + gap <= b.x ||
    b.right + gap <= a.x ||
    a.bottom + gap <= b.y ||
    b.bottom + gap <= a.y
  );
}

/**
 * Calculate the overlap amounts between two bounding boxes
 */
function calculateOverlap(
  a: NodeBounds,
  b: NodeBounds
): { overlapX: number; overlapY: number } {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);

  return {
    overlapX: Math.max(0, overlapX),
    overlapY: Math.max(0, overlapY),
  };
}

/**
 * Determine push direction based on overlap ratios
 * Returns 'right' or 'down'
 */
function determinePushDirection(
  newBounds: NodeBounds,
  existingBounds: NodeBounds
): "right" | "down" {
  const { overlapX, overlapY } = calculateOverlap(newBounds, existingBounds);

  const horizontalRatio = overlapX / existingBounds.width;
  const verticalRatio = overlapY / existingBounds.height;

  // Push down when nodes are mostly vertically aligned
  // (high horizontal overlap, low vertical overlap)
  if (horizontalRatio > 0.8 && verticalRatio < 0.5) {
    return "down";
  }

  return "right";
}

/**
 * Clamp a displacement value to prevent excessive gaps
 */
function clampDisplacement(value: number, max: number): number {
  return Math.min(Math.max(value, -max), max);
}

/**
 * Apply displacement to a node and its children (if it's a comment parent).
 * Clamps displacement to maxDisplacement to prevent excessive gaps.
 * Returns array of all affected node IDs (for tracking in displacedIds).
 */
function applyDisplacementWithChildren(
  nodeId: string,
  dx: number,
  dy: number,
  displacements: DisplacementMap,
  nodes: Node[],
  maxDisplacement: number
): string[] {
  const affectedIds: string[] = [nodeId];

  // Clamp displacement values
  const clampedDx = clampDisplacement(dx, maxDisplacement);
  const clampedDy = clampDisplacement(dy, maxDisplacement);

  // Apply to the node itself
  if (!displacements[nodeId]) {
    displacements[nodeId] = { dx: 0, dy: 0 };
  }
  displacements[nodeId].dx += clampedDx;
  displacements[nodeId].dy += clampedDy;

  // Find and move children (nodes whose parentId matches)
  const children = nodes.filter((n) => n.parentId === nodeId);
  for (const child of children) {
    if (!displacements[child.id]) {
      displacements[child.id] = { dx: 0, dy: 0 };
    }
    displacements[child.id].dx += clampedDx;
    displacements[child.id].dy += clampedDy;
    affectedIds.push(child.id);
  }

  return affectedIds;
}

/**
 * Build a set of source node IDs for each new node based on edges.
 * A source is a node that feeds INTO the new node.
 */
function buildSourcesMap(
  newNodeIds: Set<string>,
  edges: Edge[]
): Map<string, Set<string>> {
  const sourcesMap = new Map<string, Set<string>>();

  for (const newId of newNodeIds) {
    sourcesMap.set(newId, new Set());
  }

  for (const edge of edges) {
    // If this edge targets a new node, the source is upstream of that new node
    if (newNodeIds.has(edge.target) && !newNodeIds.has(edge.source)) {
      sourcesMap.get(edge.target)!.add(edge.source);
    }
  }

  return sourcesMap;
}

/**
 * Build a set of target node IDs for each new node based on edges.
 * A target is an EXISTING node that receives FROM the new node.
 * These targets should be pushed right to maintain left-to-right flow.
 */
function buildTargetsMap(
  newNodeIds: Set<string>,
  edges: Edge[]
): Map<string, Set<string>> {
  const targetsMap = new Map<string, Set<string>>();

  for (const newId of newNodeIds) {
    targetsMap.set(newId, new Set());
  }

  for (const edge of edges) {
    // If this edge comes FROM a new node and goes TO an existing node
    if (newNodeIds.has(edge.source) && !newNodeIds.has(edge.target)) {
      targetsMap.get(edge.source)!.add(edge.target);
    }
  }

  return targetsMap;
}

/**
 * Detect overlaps between new nodes and existing nodes.
 * Excludes overlaps where the existing node is a SOURCE of the new node
 * (i.e., the existing node feeds into the new node and should stay to its left).
 */
function detectOverlaps(
  bounds: Map<string, NodeBounds>,
  newNodeIds: Set<string>,
  gap: number,
  sourcesMap: Map<string, Set<string>>
): Array<{ newId: string; existingId: string }> {
  const overlaps: Array<{ newId: string; existingId: string }> = [];

  for (const [newId, newBounds] of bounds) {
    if (!newNodeIds.has(newId)) continue;

    const sourcesOfNewNode = sourcesMap.get(newId) || new Set();

    for (const [existingId, existingBounds] of bounds) {
      if (newNodeIds.has(existingId)) continue; // Skip new-to-new overlaps
      if (newId === existingId) continue;

      // Skip if the existing node is a SOURCE of the new node
      // (it should stay to the left, not be pushed right)
      if (sourcesOfNewNode.has(existingId)) {
        continue;
      }

      if (boundsOverlap(newBounds, existingBounds, gap)) {
        overlaps.push({ newId, existingId });
      }
    }
  }

  return overlaps;
}

/**
 * Detect cascading overlaps between existing nodes that have been displaced.
 * When node A is pushed and now overlaps with node B, we need to push B too.
 *
 * @param bounds - Current bounds of all nodes
 * @param displacedIds - Set of existing node IDs that have been displaced
 * @param newNodeIds - Set of new node IDs (to exclude from being pushed)
 * @param gap - Minimum gap between nodes
 * @returns Array of overlap pairs where pusherId should push targetId
 */
function detectCascadingOverlaps(
  bounds: Map<string, NodeBounds>,
  displacedIds: Set<string>,
  newNodeIds: Set<string>,
  gap: number
): Array<{ pusherId: string; targetId: string }> {
  const overlaps: Array<{ pusherId: string; targetId: string }> = [];

  for (const pusherId of displacedIds) {
    const pusherBounds = bounds.get(pusherId);
    if (!pusherBounds) continue;

    for (const [targetId, targetBounds] of bounds) {
      // Don't push new nodes
      if (newNodeIds.has(targetId)) continue;
      // Don't push ourselves
      if (targetId === pusherId) continue;
      // Only push nodes that haven't been displaced yet (to avoid loops)
      if (displacedIds.has(targetId)) continue;

      // Only push nodes to our right (downstream in the flow)
      // This prevents pushing nodes back to the left
      if (targetBounds.x < pusherBounds.x) continue;

      if (boundsOverlap(pusherBounds, targetBounds, gap)) {
        overlaps.push({ pusherId, targetId });
      }
    }
  }

  return overlaps;
}

/**
 * Resolve node overlaps after autopilot adds new nodes.
 *
 * This function detects overlaps between newly added nodes and existing nodes,
 * then calculates displacement vectors to push existing nodes out of the way.
 * It uses edge information to avoid pushing upstream (source) nodes to the right.
 *
 * @param nodes - All nodes in the flow (including newly added ones)
 * @param newNodeIds - Set of IDs for nodes that were just added
 * @param edges - Edges in the flow (used to determine upstream/downstream relationships)
 * @param config - Configuration options
 * @returns Map of node IDs to displacement vectors
 */
export function resolveNodeOverlaps(
  nodes: Node[],
  newNodeIds: Set<string>,
  edges: Edge[],
  config?: OverlapConfig
): DisplacementMap {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const displacements: DisplacementMap = {};

  // Early exit if no nodes or no new nodes
  if (nodes.length === 0 || newNodeIds.size === 0) {
    return displacements;
  }

  // Check if there are any existing nodes to displace
  const hasExistingNodes = nodes.some((n) => !newNodeIds.has(n.id));
  if (!hasExistingNodes) {
    return displacements;
  }

  // Build map of which existing nodes are sources (upstream) of each new node
  // These should NOT be pushed right as they need to stay to the left
  const sourcesMap = buildSourcesMap(newNodeIds, edges);

  // Build map of which existing nodes are targets (downstream) of each new node
  // These SHOULD be pushed right to maintain left-to-right flow
  const targetsMap = buildTargetsMap(newNodeIds, edges);

  // Initialize displacements for all nodes
  for (const node of nodes) {
    displacements[node.id] = { dx: 0, dy: 0 };
  }

  // Build a map of new nodes to their downstream new nodes (for chain propagation)
  const newNodeDownstream = new Map<string, Set<string>>();
  for (const newId of newNodeIds) {
    newNodeDownstream.set(newId, new Set());
  }
  for (const edge of edges) {
    // If both source and target are new nodes, track the relationship
    if (newNodeIds.has(edge.source) && newNodeIds.has(edge.target)) {
      newNodeDownstream.get(edge.source)!.add(edge.target);
    }
  }

  // PHASE 1: Adjust new nodes that overlap with their upstream sources
  // If a new node overlaps with its source, move the NEW node to the right of the source
  // Process in topological order so upstream nodes are adjusted first
  const processedNewNodes = new Set<string>();
  const newNodeQueue = [...newNodeIds].filter((id) => {
    // Start with new nodes that have existing sources (not new sources)
    const sources = sourcesMap.get(id) || new Set();
    return sources.size > 0;
  });

  // Also include new nodes with no sources at all (entry points)
  for (const id of newNodeIds) {
    const hasNewSource = edges.some(
      (e) => e.target === id && newNodeIds.has(e.source)
    );
    const hasExistingSource = (sourcesMap.get(id) || new Set()).size > 0;
    if (!hasNewSource && !hasExistingSource && !newNodeQueue.includes(id)) {
      newNodeQueue.push(id);
    }
  }

  while (newNodeQueue.length > 0) {
    const nodeId = newNodeQueue.shift()!;
    if (processedNewNodes.has(nodeId)) continue;
    processedNewNodes.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const sources = sourcesMap.get(nodeId) || new Set();

    // Find rightmost source node (existing sources only)
    let maxSourceRight = 0;
    for (const sourceId of sources) {
      const sourceNode = nodes.find((n) => n.id === sourceId);
      if (!sourceNode) continue;

      const { width } = getNodeDimensions(sourceNode, cfg);
      const sourceRight =
        sourceNode.position.x + displacements[sourceId].dx + width;
      maxSourceRight = Math.max(maxSourceRight, sourceRight);
    }

    // Also check new node sources (already processed)
    for (const edge of edges) {
      if (edge.target === nodeId && newNodeIds.has(edge.source)) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (!sourceNode) continue;

        const { width } = getNodeDimensions(sourceNode, cfg);
        const sourceRight =
          sourceNode.position.x + displacements[edge.source].dx + width;
        maxSourceRight = Math.max(maxSourceRight, sourceRight);
      }
    }

    // Check if new node overlaps with sources
    if (maxSourceRight > 0) {
      const newNodeX = node.position.x + displacements[nodeId].dx;
      if (newNodeX < maxSourceRight + cfg.gap) {
        // Move new node to the right of all its sources
        const requiredDx = maxSourceRight + cfg.gap - node.position.x;
        displacements[nodeId].dx = requiredDx;
      }
    }

    // Queue downstream new nodes for processing
    const downstream = newNodeDownstream.get(nodeId) || new Set();
    for (const downstreamId of downstream) {
      if (!processedNewNodes.has(downstreamId)) {
        newNodeQueue.push(downstreamId);
      }
    }
  }

  // Track which existing nodes have been displaced (for cascading detection)
  const displacedIds = new Set<string>();

  // PHASE 1.5: Push existing targets of new nodes to the right
  // If a new node feeds INTO an existing node, that target must be to the RIGHT of the new node
  // This ensures proper left-to-right flow direction
  for (const newId of newNodeIds) {
    const targets = targetsMap.get(newId) || new Set();
    if (targets.size === 0) continue;

    const newNode = nodes.find((n) => n.id === newId);
    if (!newNode) continue;

    const { width: newWidth } = getNodeDimensions(newNode, cfg);
    const newNodeRight =
      newNode.position.x + displacements[newId].dx + newWidth;

    for (const targetId of targets) {
      const targetNode = nodes.find((n) => n.id === targetId);
      if (!targetNode) continue;

      const targetX = targetNode.position.x + displacements[targetId].dx;

      // If target is not sufficiently to the right of the new node, push it
      if (targetX < newNodeRight + cfg.gap) {
        const requiredDx = newNodeRight + cfg.gap - targetNode.position.x;
        const affected = applyDisplacementWithChildren(
          targetId,
          requiredDx,
          0,
          displacements,
          nodes,
          cfg.maxDisplacement
        );
        affected.forEach((id) => displacedIds.add(id));
      }
    }
  }

  // Iteratively resolve overlaps
  for (let iteration = 0; iteration < cfg.maxIterations; iteration++) {
    // Build current bounds accounting for accumulated displacements
    const bounds = new Map<string, NodeBounds>();
    for (const node of nodes) {
      const isNew = newNodeIds.has(node.id);
      bounds.set(
        node.id,
        buildNodeBounds(node, isNew, displacements[node.id], cfg)
      );
    }

    // Detect overlaps (excluding upstream sources of new nodes)
    const newToExistingOverlaps = detectOverlaps(
      bounds,
      newNodeIds,
      cfg.gap,
      sourcesMap
    );

    // Also detect cascading overlaps from displaced nodes
    const cascadingOverlaps = detectCascadingOverlaps(
      bounds,
      displacedIds,
      newNodeIds,
      cfg.gap
    );

    // If no overlaps of any kind, we're done
    if (newToExistingOverlaps.length === 0 && cascadingOverlaps.length === 0) {
      break;
    }

    // Process new-to-existing overlaps
    for (const { newId, existingId } of newToExistingOverlaps) {
      const newBounds = bounds.get(newId)!;
      const existingBounds = bounds.get(existingId)!;

      // Determine push direction
      const direction = determinePushDirection(newBounds, existingBounds);

      if (direction === "right") {
        // Only push nodes that are to the right of (or overlapping with) the new node's left edge
        // This prevents pushing a node that's mostly to the left of the new node
        // to an even further right position (which would be wrong direction)
        if (existingBounds.x < newBounds.x - existingBounds.width / 2) {
          // Existing node is mostly to the left of the new node - skip
          continue;
        }

        // Push existing node to the right of the new node + gap
        const requiredDx = newBounds.right + cfg.gap - existingBounds.x;
        if (requiredDx > 0) {
          const affected = applyDisplacementWithChildren(
            existingId,
            requiredDx,
            0,
            displacements,
            nodes,
            cfg.maxDisplacement
          );
          affected.forEach((id) => displacedIds.add(id));
        }
      } else {
        // Push existing node below the new node + gap
        const requiredDy = newBounds.bottom + cfg.gap - existingBounds.y;
        if (requiredDy > 0) {
          const affected = applyDisplacementWithChildren(
            existingId,
            0,
            requiredDy,
            displacements,
            nodes,
            cfg.maxDisplacement
          );
          affected.forEach((id) => displacedIds.add(id));
        }
      }
    }

    // Process cascading overlaps (existing nodes pushing other existing nodes)
    for (const { pusherId, targetId } of cascadingOverlaps) {
      const pusherBounds = bounds.get(pusherId)!;
      const targetBounds = bounds.get(targetId)!;

      // For cascading, we primarily push right to maintain left-to-right flow
      const direction = determinePushDirection(pusherBounds, targetBounds);

      if (direction === "right") {
        const requiredDx = pusherBounds.right + cfg.gap - targetBounds.x;
        if (requiredDx > 0) {
          const affected = applyDisplacementWithChildren(
            targetId,
            requiredDx,
            0,
            displacements,
            nodes,
            cfg.maxDisplacement
          );
          affected.forEach((id) => displacedIds.add(id));
        }
      } else {
        const requiredDy = pusherBounds.bottom + cfg.gap - targetBounds.y;
        if (requiredDy > 0) {
          const affected = applyDisplacementWithChildren(
            targetId,
            0,
            requiredDy,
            displacements,
            nodes,
            cfg.maxDisplacement
          );
          affected.forEach((id) => displacedIds.add(id));
        }
      }
    }
  }

  // Filter out zero displacements
  const result: DisplacementMap = {};
  for (const [id, d] of Object.entries(displacements)) {
    if (d.dx !== 0 || d.dy !== 0) {
      result[id] = d;
    }
  }

  return result;
}

/**
 * Apply displacements to nodes, returning new node array with updated positions
 */
export function applyDisplacements(
  nodes: Node[],
  displacements: DisplacementMap
): Node[] {
  return nodes.map((node) => {
    const d = displacements[node.id];
    if (!d) return node;

    return {
      ...node,
      position: {
        x: node.position.x + d.dx,
        y: node.position.y + d.dy,
      },
    };
  });
}
