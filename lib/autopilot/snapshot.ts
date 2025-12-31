import type { Node, Edge } from "@xyflow/react";
import type { FlowSnapshot } from "./types";
import type { NodeType, AgentNodeData } from "@/types/flow";

// Fields to exclude from node data (runtime state, not part of flow definition)
// Autopilot only needs flow structure - not execution results or binary data
const EXCLUDED_DATA_FIELDS = [
  // Execution state (all nodes)
  "executionStatus",
  "executionOutput",
  "executionError",
  "fromCache",

  // MagicNode runtime state
  "isGenerating",
  "generationError",
  "code",              // Generated JS code (can be large)
  "evalResult",        // Evaluation result

  // Image data (various nodes)
  "uploadedImage",     // Base64 image data (ImageInputNode)
  "imageInput",        // Vision input image (PromptNode, ImageNode)
  "imageOutput",       // Generated image output (OutputNode)

  // PromptNode runtime state
  "executionReasoning", // Thinking output (can be large)

  // AudioInputNode runtime state (base64 audio is HUGE)
  "audioBuffer",       // Base64-encoded audio data
  "audioMimeType",
  "recordingDuration",
  "isRecording",
  "awaitingInput",

  // RealtimeNode runtime state
  "transcript",        // Conversation transcript (can be large)
  "sessionStatus",
  "audioOutStreamId",

  // ReactComponentNode runtime state
  "generatedCode",     // Generated React code
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
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      data: edge.data as { dataType: string } | undefined,
    })),
  };
}
