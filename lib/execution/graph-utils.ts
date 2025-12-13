/**
 * Graph utility functions for flow execution
 *
 * Reusable functions for traversing and querying the flow graph.
 * Used by the execution engine and potentially other graph-aware components.
 */

import type { Node, Edge } from "@xyflow/react";

/**
 * Find the starting node (input node) in the graph
 */
export function findStartNode(nodes: Node[]): Node | undefined {
  return nodes.find((n) => n.type === "input");
}

/**
 * Find ALL input nodes in the graph (for multi-input flows)
 */
export function findAllInputNodes(nodes: Node[]): Node[] {
  return nodes.filter((n) => n.type === "input");
}

/**
 * Get all outgoing edges from a node
 */
export function getOutgoingEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter((e) => e.source === nodeId);
}

/**
 * Get all incoming edges to a node
 */
export function getIncomingEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter((e) => e.target === nodeId);
}

/**
 * Get the target node from an edge
 */
export function getTargetNode(edge: Edge, nodes: Node[]): Node | undefined {
  return nodes.find((n) => n.id === edge.target);
}

/**
 * Get the source node from an edge
 */
export function getSourceNode(edge: Edge, nodes: Node[]): Node | undefined {
  return nodes.find((n) => n.id === edge.source);
}

/**
 * Find a node by ID
 */
export function findNodeById(nodeId: string, nodes: Node[]): Node | undefined {
  return nodes.find((n) => n.id === nodeId);
}

/**
 * Find all nodes of a specific type
 */
export function findNodesByType(type: string, nodes: Node[]): Node[] {
  return nodes.filter((n) => n.type === type);
}

/**
 * Find all output nodes in the graph
 */
export function findOutputNodes(nodes: Node[]): Node[] {
  return findNodesByType("output", nodes);
}

/**
 * Find all downstream output nodes from a given starting node
 * Uses BFS to traverse the graph and collect all output nodes reachable from the start
 * Stops at image nodes (they handle their own downstream outputs)
 */
export function findDownstreamOutputNodes(
  startNodeId: string,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const outputNodes: Node[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const outgoing = getOutgoingEdges(currentId, edges);
    for (const edge of outgoing) {
      const target = getTargetNode(edge, nodes);
      if (target) {
        if (target.type === "output") {
          outputNodes.push(target);
        } else if (target.type === "image") {
          // Don't traverse through image nodes - they handle their own downstream outputs
          // This prevents text from leaking through to outputs behind image nodes
        } else {
          traverse(target.id);
        }
      }
    }
  }

  traverse(startNodeId);
  return outputNodes;
}

/**
 * Find all upstream nodes from a given node
 * Returns nodes in order from closest to furthest upstream
 */
export function findUpstreamNodes(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const upstreamNodes: Node[] = [];
  const visited = new Set<string>();

  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const incoming = getIncomingEdges(currentId, edges);
    for (const edge of incoming) {
      const source = getSourceNode(edge, nodes);
      if (source) {
        upstreamNodes.push(source);
        traverse(source.id);
      }
    }
  }

  traverse(nodeId);
  return upstreamNodes;
}

/**
 * Check if there is a path between two nodes
 */
export function hasPath(
  fromNodeId: string,
  toNodeId: string,
  nodes: Node[],
  edges: Edge[]
): boolean {
  const visited = new Set<string>();

  function traverse(currentId: string): boolean {
    if (currentId === toNodeId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    const outgoing = getOutgoingEdges(currentId, edges);
    for (const edge of outgoing) {
      const target = getTargetNode(edge, nodes);
      if (target && traverse(target.id)) {
        return true;
      }
    }
    return false;
  }

  return traverse(fromNodeId);
}

/**
 * Get direct children of a node (nodes directly connected by outgoing edges)
 */
export function getChildNodes(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const outgoing = getOutgoingEdges(nodeId, edges);
  return outgoing
    .map((edge) => getTargetNode(edge, nodes))
    .filter((node): node is Node => node !== undefined);
}

/**
 * Get direct parents of a node (nodes directly connected by incoming edges)
 */
export function getParentNodes(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const incoming = getIncomingEdges(nodeId, edges);
  return incoming
    .map((edge) => getSourceNode(edge, nodes))
    .filter((node): node is Node => node !== undefined);
}

/**
 * Collect all inputs for a node, grouped by target handle ID.
 * Returns a map of handleId -> value from executed upstream nodes.
 * For backward compatibility, edges without targetHandle default to "prompt".
 */
export function collectNodeInputs(
  nodeId: string,
  edges: Edge[],
  executedOutputs: Record<string, string>
): Record<string, string> {
  const incoming = getIncomingEdges(nodeId, edges);
  const inputs: Record<string, string> = {};

  for (const edge of incoming) {
    // Default to "prompt" for backward compatibility with existing edges
    const handleId = edge.targetHandle || "prompt";
    const sourceOutput = executedOutputs[edge.source];
    if (sourceOutput !== undefined) {
      inputs[handleId] = sourceOutput;
    }
  }

  return inputs;
}
