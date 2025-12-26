import type { Node, Edge } from "@xyflow/react";
import type { SavedFlow, FlowValidationResult, FlowMetadata } from "./types";
import { FLOW_SCHEMA_VERSION } from "./types";

const VALID_NODE_TYPES = [
  "text-input",
  "image-input",
  "audio-input",
  "text-generation",
  "image-generation",
  "ai-logic",
  "preview-output",
  "react-component",
  "comment",
  "realtime-conversation",
];

/**
 * Validates that an object has the basic structure of a SavedFlow
 */
export function isValidFlowStructure(data: unknown): data is SavedFlow {
  if (!data || typeof data !== "object") return false;

  const flow = data as Record<string, unknown>;

  return (
    "metadata" in flow &&
    "nodes" in flow &&
    "edges" in flow &&
    Array.isArray(flow.nodes) &&
    Array.isArray(flow.edges)
  );
}

/**
 * Validates metadata structure
 */
function validateMetadata(metadata: unknown): string[] {
  const errors: string[] = [];

  if (!metadata || typeof metadata !== "object") {
    errors.push("Missing or invalid metadata");
    return errors;
  }

  const meta = metadata as Record<string, unknown>;

  if (typeof meta.name !== "string" || !meta.name.trim()) {
    errors.push("Metadata must have a non-empty name");
  }

  if (typeof meta.schemaVersion !== "number") {
    errors.push("Metadata must have a schemaVersion number");
  }

  return errors;
}

/**
 * Validates a single node
 */
function validateNode(node: unknown, index: number): string[] {
  const errors: string[] = [];

  if (!node || typeof node !== "object") {
    errors.push(`Node at index ${index} is invalid`);
    return errors;
  }

  const n = node as Record<string, unknown>;

  if (typeof n.id !== "string" || !n.id) {
    errors.push(`Node at index ${index} must have a string id`);
  }

  if (typeof n.type !== "string" || !VALID_NODE_TYPES.includes(n.type)) {
    errors.push(`Node at index ${index} has invalid type: ${n.type}`);
  }

  if (!n.position || typeof n.position !== "object") {
    errors.push(`Node at index ${index} must have a position object`);
  } else {
    const pos = n.position as Record<string, unknown>;
    if (typeof pos.x !== "number" || typeof pos.y !== "number") {
      errors.push(`Node at index ${index} position must have numeric x and y`);
    }
  }

  if (!n.data || typeof n.data !== "object") {
    errors.push(`Node at index ${index} must have a data object`);
  }

  return errors;
}

/**
 * Validates a single edge
 */
function validateEdge(edge: unknown, index: number, nodeIds: Set<string>): string[] {
  const errors: string[] = [];

  if (!edge || typeof edge !== "object") {
    errors.push(`Edge at index ${index} is invalid`);
    return errors;
  }

  const e = edge as Record<string, unknown>;

  if (typeof e.id !== "string" || !e.id) {
    errors.push(`Edge at index ${index} must have a string id`);
  }

  if (typeof e.source !== "string" || !e.source) {
    errors.push(`Edge at index ${index} must have a source`);
  } else if (!nodeIds.has(e.source)) {
    errors.push(`Edge at index ${index} references non-existent source node: ${e.source}`);
  }

  if (typeof e.target !== "string" || !e.target) {
    errors.push(`Edge at index ${index} must have a target`);
  } else if (!nodeIds.has(e.target)) {
    errors.push(`Edge at index ${index} references non-existent target node: ${e.target}`);
  }

  return errors;
}

/**
 * Validates a complete saved flow
 */
export function validateFlow(data: unknown): FlowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isValidFlowStructure(data)) {
    return {
      valid: false,
      errors: ["Invalid flow structure: must have metadata, nodes, and edges"],
      warnings: [],
    };
  }

  // Validate metadata
  errors.push(...validateMetadata(data.metadata));

  // Check schema version
  if (data.metadata.schemaVersion > FLOW_SCHEMA_VERSION) {
    warnings.push(
      `Flow was created with schema version ${data.metadata.schemaVersion}, ` +
      `but current version is ${FLOW_SCHEMA_VERSION}. Some features may not work correctly.`
    );
  }

  // Validate nodes
  const nodeIds = new Set<string>();
  for (let i = 0; i < data.nodes.length; i++) {
    const nodeErrors = validateNode(data.nodes[i], i);
    errors.push(...nodeErrors);

    const node = data.nodes[i] as Node;
    if (node.id) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node id: ${node.id}`);
      }
      nodeIds.add(node.id);
    }
  }

  // Validate edges
  const edgeIds = new Set<string>();
  for (let i = 0; i < data.edges.length; i++) {
    const edgeErrors = validateEdge(data.edges[i], i, nodeIds);
    errors.push(...edgeErrors);

    const edge = data.edges[i] as Edge;
    if (edge.id) {
      if (edgeIds.has(edge.id)) {
        errors.push(`Duplicate edge id: ${edge.id}`);
      }
      edgeIds.add(edge.id);
    }
  }

  // Check for input node
  const hasInput = data.nodes.some((n) => (n as Node).type === "text-input");
  if (!hasInput) {
    warnings.push("Flow has no input node - it may not be executable");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitizes loaded nodes by removing execution state and runtime-only data
 */
export function sanitizeNodes(nodes: Node[]): Node[] {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      executionStatus: undefined,
      executionOutput: undefined,
      executionError: undefined,
      uploadedImage: undefined,  // ImageInputNode runtime state
      imageInput: undefined,     // PromptNode vision input runtime state
      isRecording: undefined,    // AudioInputNode runtime state
      awaitingInput: undefined,  // AudioInputNode runtime state
    },
    // Remove autopilot highlighting
    className: undefined,
  }));
}

/**
 * Ensures edges have the correct type for this app
 */
export function sanitizeEdges(edges: Edge[]): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    type: "colored",
    data: edge.data || { dataType: "string" },
  }));
}

/**
 * Creates default metadata for a new flow
 */
export function createDefaultMetadata(name: string = "Untitled Flow"): FlowMetadata {
  const now = new Date().toISOString();
  return {
    name,
    schemaVersion: FLOW_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  };
}
