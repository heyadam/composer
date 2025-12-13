import type { Node, Edge } from "@xyflow/react";
import type { FlowSnapshot } from "./types";
import type { NodeType, AgentNodeData } from "@/types/flow";

/**
 * Create a serializable snapshot of the current flow state
 * for sending to Claude as context.
 */
export function createFlowSnapshot(
  nodes: Node[],
  edges: Edge[]
): FlowSnapshot {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type as NodeType,
      position: node.position,
      data: node.data as AgentNodeData,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge.data as { dataType: string } | undefined,
    })),
  };
}
