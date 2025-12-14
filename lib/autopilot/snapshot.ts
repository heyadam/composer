import type { Node, Edge } from "@xyflow/react";
import type { FlowSnapshot } from "./types";
import type { NodeType, AgentNodeData } from "@/types/flow";

// Fields to exclude from node data (runtime state, not part of flow definition)
const EXCLUDED_DATA_FIELDS = [
  "executionStatus",
  "executionOutput",
  "executionError",
  "isGenerating",       // MagicNode runtime state
  "generationError",    // MagicNode runtime state
  "uploadedImage",      // ImageInputNode runtime state
] as const;

/**
 * Strip runtime execution fields from node data.
 * Claude only needs the flow structure, not execution results.
 */
function cleanNodeData(data: AgentNodeData): Partial<AgentNodeData> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!EXCLUDED_DATA_FIELDS.includes(key as typeof EXCLUDED_DATA_FIELDS[number])) {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<AgentNodeData>;
}

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
      data: cleanNodeData(node.data as AgentNodeData) as AgentNodeData,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge.data as { dataType: string } | undefined,
    })),
  };
}
