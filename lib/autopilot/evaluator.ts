import type { FlowSnapshot, FlowChanges, EvaluationResult, AddNodeAction, AddEdgeAction, RemoveNodeAction } from "./types";
import {
  VALID_TEXT_MODELS,
  VALID_IMAGE_MODELS,
  VALID_NODE_TYPES,
  VALID_DATA_TYPES,
  ValidNodeType,
  ValidDataType,
} from "./config";

export interface EvaluatorOptions {
  userRequest: string;
  flowSnapshot: FlowSnapshot;
  changes: FlowChanges;
}

/**
 * Valid input handles per node type.
 * Maps node type -> { handleName: acceptedDataTypes[] }
 */
const NODE_INPUT_HANDLES: Record<string, Record<string, string[]>> = {
  "text-generation": {
    prompt: ["string"],
    system: ["string"],
    image: ["image"], // Vision/multimodal input
  },
  "image-generation": {
    prompt: ["string"],
    image: ["image"], // Base image for image-to-image transformation
  },
  "react-component": {
    prompt: ["string"],
    system: ["string"],
  },
  "ai-logic": {
    transform: ["string"],
    input1: ["string"],
    input2: ["string"],
  },
  "preview-output": {
    // Separate handles for each data type
    string: ["string"],
    image: ["image"],
    audio: ["audio"],
  },
  "comment": {
    // No inputs
  },
  "realtime-conversation": {
    instructions: ["string"],
    "audio-in": ["audio"],
  },
  "audio-transcription": {
    audio: ["audio"],
    language: ["string"],
  },
};

/**
 * Node types that produce each data type as output (primary output).
 */
const OUTPUT_DATA_TYPES: Record<string, string> = {
  "text-input": "string",
  "image-input": "image",
  "audio-input": "audio",
  "text-generation": "string",
  "image-generation": "image",
  "ai-logic": "string",
  "react-component": "response",
  "realtime-conversation": "string", // Primary output is transcript (string)
  "audio-transcription": "string",   // Transcribed text output
};

/**
 * Nodes with "done" pulse output (fires when execution completes).
 */
const NODES_WITH_DONE_OUTPUT = new Set([
  "text-generation",
  "image-generation",
  "ai-logic",
  "react-component",
  "audio-transcription",
  "audio-input",
  "realtime-conversation",
]);

/**
 * Get the output data type for a node, considering sourceHandle.
 */
function getOutputDataType(nodeType: string, sourceHandle?: string | null): string | null {
  // Handle "done" pulse output
  if (sourceHandle === "done" && NODES_WITH_DONE_OUTPUT.has(nodeType)) {
    return "pulse";
  }
  // Primary output
  return OUTPUT_DATA_TYPES[nodeType] || null;
}

/**
 * Programmatically validate model IDs in the changes.
 */
function validateModelIds(changes: FlowChanges): string[] {
  const issues: string[] = [];

  for (const action of changes.actions) {
    if (action.type === "addNode") {
      const node = (action as AddNodeAction).node;
      const nodeType = node.type;
      const data = node.data as { provider?: string; model?: string; label?: string };

      if (!data.provider || !data.model) continue;

      const provider = data.provider.toLowerCase();
      const model = data.model;
      const label = data.label || node.id;

      if (nodeType === "text-generation" || nodeType === "react-component") {
        const validModels = VALID_TEXT_MODELS[provider];
        if (validModels && !validModels.includes(model)) {
          issues.push(`Node "${label}": Invalid model "${model}" for ${provider}. Valid: ${validModels.join(", ")}`);
        }
      } else if (nodeType === "image-generation") {
        const validModels = VALID_IMAGE_MODELS[provider];
        if (validModels && !validModels.includes(model)) {
          issues.push(`Node "${label}": Invalid model "${model}" for ${provider}. Valid: ${validModels.join(", ")}`);
        }
      }
    }
  }

  return issues;
}

/**
 * Validate that edge connections are valid.
 */
function validateEdges(
  changes: FlowChanges,
  flowSnapshot: FlowSnapshot
): string[] {
  const issues: string[] = [];

  // Build a map of all node IDs (existing + new)
  const existingNodeIds = new Set(flowSnapshot.nodes.map((n) => n.id));
  const newNodes = new Map<string, { type: string; label: string }>();

  // Track removed nodes
  const removedNodeIds = new Set<string>();
  for (const action of changes.actions) {
    if (action.type === "removeNode") {
      removedNodeIds.add(action.nodeId);
    }
  }

  for (const action of changes.actions) {
    if (action.type === "addNode") {
      const node = (action as AddNodeAction).node;
      const data = node.data as { label?: string };
      newNodes.set(node.id, { type: node.type, label: data.label || node.id });
    }
  }

  // Get node type helper
  const getNodeType = (nodeId: string): string | null => {
    if (removedNodeIds.has(nodeId)) return null;
    const newNode = newNodes.get(nodeId);
    if (newNode) return newNode.type;
    const existing = flowSnapshot.nodes.find((n) => n.id === nodeId);
    return existing?.type || null;
  };

  const getNodeLabel = (nodeId: string): string => {
    const newNode = newNodes.get(nodeId);
    if (newNode) return newNode.label;
    const existing = flowSnapshot.nodes.find((n) => n.id === nodeId);
    return (existing?.data as { label?: string })?.label || nodeId;
  };

  // Validate each addEdge action
  for (const action of changes.actions) {
    if (action.type !== "addEdge") continue;

    const edge = (action as AddEdgeAction).edge;
    const sourceId = edge.source;
    const targetId = edge.target;
    const targetHandle = edge.targetHandle;
    const dataType = edge.data?.dataType;

    // Check source exists
    if (!existingNodeIds.has(sourceId) && !newNodes.has(sourceId)) {
      issues.push(`Edge "${edge.id}": Source node "${sourceId}" does not exist`);
      continue;
    }
    if (removedNodeIds.has(sourceId)) {
      issues.push(`Edge "${edge.id}": Source node "${sourceId}" is being removed`);
      continue;
    }

    // Check target exists
    if (!existingNodeIds.has(targetId) && !newNodes.has(targetId)) {
      issues.push(`Edge "${edge.id}": Target node "${targetId}" does not exist`);
      continue;
    }
    if (removedNodeIds.has(targetId)) {
      issues.push(`Edge "${edge.id}": Target node "${targetId}" is being removed`);
      continue;
    }

    const targetType = getNodeType(targetId);
    if (!targetType) continue;

    // Check target handle validity
    const validHandles = NODE_INPUT_HANDLES[targetType];
    if (validHandles && targetHandle) {
      const handleConfig = validHandles[targetHandle];
      if (!handleConfig) {
        const validHandleNames = Object.keys(validHandles).filter(h => h !== "_default");
        issues.push(
          `Edge to "${getNodeLabel(targetId)}": Invalid handle "${targetHandle}". Valid handles: ${validHandleNames.join(", ")}`
        );
        continue;
      }

      // Check data type compatibility
      if (dataType && !handleConfig.includes(dataType)) {
        issues.push(
          `Edge to "${getNodeLabel(targetId)}": Handle "${targetHandle}" accepts ${handleConfig.join("/")} but got "${dataType}"`
        );
      }
    }

    // Check dataType is valid
    if (dataType && !VALID_DATA_TYPES.includes(dataType as ValidDataType)) {
      issues.push(
        `Edge "${edge.id}": Invalid dataType "${dataType}". Valid types: ${VALID_DATA_TYPES.join(", ")}`
      );
      continue;
    }

    // Special check: image data can only go to "image" handles on supported nodes or preview-output
    const supportsImageHandle = ["text-generation", "image-generation"];
    if (dataType === "image" && targetType !== "preview-output") {
      if (targetHandle !== "image") {
        issues.push(
          `Edge to "${getNodeLabel(targetId)}": Image data must connect to "image" handle, not "${targetHandle || "default"}"`
        );
      } else if (!supportsImageHandle.includes(targetType)) {
        issues.push(
          `Edge to "${getNodeLabel(targetId)}": Node type "${targetType}" does not accept image input`
        );
      }
    }

    // Special check: audio data can only go to specific audio handles
    if (dataType === "audio") {
      // Validate source is an audio-producing node
      const sourceType = getNodeType(sourceId);
      const audioSourceTypes = ["audio-input", "realtime-conversation"];
      if (sourceType && !audioSourceTypes.includes(sourceType)) {
        issues.push(
          `Edge from "${getNodeLabel(sourceId)}": Node type "${sourceType}" does not produce audio output`
        );
      }

      if (targetType === "preview-output" && targetHandle !== "audio") {
        issues.push(
          `Edge to "${getNodeLabel(targetId)}": Audio data must connect to "audio" handle, not "${targetHandle || "default"}"`
        );
      } else if (targetType === "realtime-conversation" && targetHandle !== "audio-in") {
        issues.push(
          `Edge to "${getNodeLabel(targetId)}": Audio data must connect to "audio-in" handle, not "${targetHandle || "default"}"`
        );
      } else if (targetType === "audio-transcription" && targetHandle !== "audio") {
        issues.push(
          `Edge to "${getNodeLabel(targetId)}": Audio data must connect to "audio" handle, not "${targetHandle || "default"}"`
        );
      } else if (targetType !== "preview-output" && targetType !== "realtime-conversation" && targetType !== "audio-transcription") {
        issues.push(
          `Edge to "${getNodeLabel(targetId)}": Node type "${targetType}" does not accept audio input`
        );
      }
    }
  }

  return issues;
}

/**
 * Validate node types and required fields.
 */
function validateNodes(changes: FlowChanges): string[] {
  const issues: string[] = [];

  for (const action of changes.actions) {
    if (action.type !== "addNode") continue;

    const node = (action as AddNodeAction).node;
    const data = node.data as { label?: string };
    const label = data.label || node.id;

    // Check valid node type
    if (!VALID_NODE_TYPES.includes(node.type as ValidNodeType)) {
      issues.push(`Node "${label}": Invalid type "${node.type}". Valid types: ${VALID_NODE_TYPES.join(", ")}`);
    }

    // Check required label field
    if (!data.label) {
      issues.push(`Node "${node.id}": Missing required "label" field`);
    }
  }

  return issues;
}

/**
 * Check for orphaned nodes (nodes not connected to the flow).
 * Exception: Allow single node if user request seems to be asking for just one node.
 */
function validateOrphanedNodes(
  changes: FlowChanges,
  flowSnapshot: FlowSnapshot,
  userRequest: string
): string[] {
  const issues: string[] = [];

  // Get all new node IDs
  const newNodeIds = new Set<string>();
  for (const action of changes.actions) {
    if (action.type === "addNode") {
      newNodeIds.add((action as AddNodeAction).node.id);
    }
  }

  if (newNodeIds.size === 0) return issues;

  // If only adding 1 node and request doesn't mention connections, allow orphan
  if (newNodeIds.size === 1) {
    const lowerRequest = userRequest.toLowerCase();
    const connectionWords = ["connect", "chain", "pipe", "flow", "after", "before", "between", "to the", "from the", "then"];
    const hasConnectionIntent = connectionWords.some(word => lowerRequest.includes(word));

    if (!hasConnectionIntent) {
      // User just asked for a node without specifying connections - allow it
      return issues;
    }
  }

  // Get all edge connections (existing + new - removed)
  const connectedNodes = new Set<string>();

  // Existing edges
  const removedEdgeIds = new Set(
    changes.actions
      .filter((a) => a.type === "removeEdge")
      .map((a) => a.edgeId)
  );

  for (const edge of flowSnapshot.edges) {
    if (!removedEdgeIds.has(edge.id)) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }
  }

  // New edges
  for (const action of changes.actions) {
    if (action.type === "addEdge") {
      const edge = (action as AddEdgeAction).edge;
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }
  }

  // Check each new node is connected
  for (const nodeId of newNodeIds) {
    if (!connectedNodes.has(nodeId)) {
      const nodeAction = changes.actions.find(
        (a) => a.type === "addNode" && (a as AddNodeAction).node.id === nodeId
      ) as AddNodeAction;
      const label = (nodeAction?.node.data as { label?: string })?.label || nodeId;
      issues.push(`Node "${label}" is not connected to the flow`);
    }
  }

  return issues;
}

/**
 * Validate removeNode actions reference existing nodes.
 */
function validateRemoveNodes(
  changes: FlowChanges,
  flowSnapshot: FlowSnapshot
): string[] {
  const issues: string[] = [];
  const existingNodeIds = new Set(flowSnapshot.nodes.map((n) => n.id));

  for (const action of changes.actions) {
    if (action.type !== "removeNode") continue;

    const nodeId = (action as RemoveNodeAction).nodeId;
    if (!existingNodeIds.has(nodeId)) {
      issues.push(`Cannot remove node "${nodeId}" - it doesn't exist in the flow`);
    }
  }

  return issues;
}

/**
 * Check for duplicate IDs.
 */
function validateDuplicateIds(
  changes: FlowChanges,
  flowSnapshot: FlowSnapshot
): string[] {
  const issues: string[] = [];

  const existingNodeIds = new Set(flowSnapshot.nodes.map((n) => n.id));
  const existingEdgeIds = new Set(flowSnapshot.edges.map((e) => e.id));
  const newNodeIds = new Set<string>();
  const newEdgeIds = new Set<string>();

  for (const action of changes.actions) {
    if (action.type === "addNode") {
      const nodeId = (action as AddNodeAction).node.id;
      if (existingNodeIds.has(nodeId)) {
        issues.push(`Duplicate node ID "${nodeId}" - already exists in flow`);
      }
      if (newNodeIds.has(nodeId)) {
        issues.push(`Duplicate node ID "${nodeId}" - added multiple times`);
      }
      newNodeIds.add(nodeId);
    }

    if (action.type === "addEdge") {
      const edgeId = (action as AddEdgeAction).edge.id;
      if (existingEdgeIds.has(edgeId)) {
        issues.push(`Duplicate edge ID "${edgeId}" - already exists in flow`);
      }
      if (newEdgeIds.has(edgeId)) {
        issues.push(`Duplicate edge ID "${edgeId}" - added multiple times`);
      }
      newEdgeIds.add(edgeId);
    }
  }

  return issues;
}

/**
 * Evaluate flow changes using purely programmatic validation.
 * No LLM calls - fast, deterministic, and reliable.
 */
export function evaluateFlowChanges(
  options: EvaluatorOptions
): EvaluationResult {
  const { userRequest, flowSnapshot, changes } = options;

  const allIssues: string[] = [
    ...validateModelIds(changes),
    ...validateNodes(changes),
    ...validateEdges(changes, flowSnapshot),
    ...validateRemoveNodes(changes, flowSnapshot),
    ...validateDuplicateIds(changes, flowSnapshot),
    ...validateOrphanedNodes(changes, flowSnapshot, userRequest),
  ];

  return {
    valid: allIssues.length === 0,
    issues: allIssues,
    suggestions: [], // No suggestions without LLM
  };
}

/**
 * Build a retry prompt that includes the validation errors.
 */
export function buildRetryContext(
  failedChanges: FlowChanges,
  evalResult: EvaluationResult
): string {
  return `
## Fix These Validation Errors

Your previous response had issues:

${evalResult.issues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}

Previous (invalid) response:
\`\`\`json
${JSON.stringify(failedChanges, null, 2)}
\`\`\`

Please fix these specific issues and regenerate the FlowChanges JSON.

### Quick Reference:
- text-generation accepts: \`targetHandle: "prompt"\` (string), \`targetHandle: "system"\` (string), OR \`targetHandle: "image"\` (image for vision)
- image-generation accepts: \`targetHandle: "prompt"\` (string) OR \`targetHandle: "image"\` (image-to-image)
- realtime-conversation accepts: \`targetHandle: "instructions"\` (string) OR \`targetHandle: "audio-in"\` (audio)
- audio-transcription accepts: \`targetHandle: "audio"\` (audio, required) OR \`targetHandle: "language"\` (string, optional)
- preview-output accepts: \`targetHandle: "string"\` (string), \`targetHandle: "image"\` (image), OR \`targetHandle: "audio"\` (audio)
- Image data can connect to \`targetHandle: "image"\` on text-generation, image-generation, or preview-output
- Audio data can connect to \`targetHandle: "audio"\` on audio-transcription, preview-output, OR \`targetHandle: "audio-in"\` on realtime-conversation
- All new nodes must be connected via edges (unless adding a single standalone node)`;
}
