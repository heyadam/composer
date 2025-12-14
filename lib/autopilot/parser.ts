import type { FlowChanges, FlowAction } from "./types";

/**
 * Parse flow changes from Claude's response.
 * Extracts JSON code blocks and validates the structure.
 */
export function parseFlowChanges(response: string): FlowChanges | null {
  // Extract JSON from code blocks (```json ... ``` or ``` ... ```)
  const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
  const matches = [...response.matchAll(jsonBlockRegex)];

  for (const match of matches) {
    const jsonStr = match[1].trim();
    try {
      const parsed = JSON.parse(jsonStr);

      // Validate structure
      if (isValidFlowChanges(parsed)) {
        return parsed;
      }
    } catch {
      // Continue to next match if JSON parsing fails
      continue;
    }
  }

  // Try parsing the entire response as JSON (in case no code blocks)
  try {
    const parsed = JSON.parse(response.trim());
    if (isValidFlowChanges(parsed)) {
      return parsed;
    }
  } catch {
    // Not valid JSON
  }

  return null;
}

/**
 * Type guard to validate FlowChanges structure
 */
function isValidFlowChanges(obj: unknown): obj is FlowChanges {
  if (!obj || typeof obj !== "object") return false;

  const candidate = obj as Record<string, unknown>;

  if (!Array.isArray(candidate.actions)) return false;
  if (typeof candidate.explanation !== "string") return false;

  // Validate each action
  for (const action of candidate.actions) {
    if (!isValidFlowAction(action)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate individual flow action
 */
function isValidFlowAction(action: unknown): action is FlowAction {
  if (!action || typeof action !== "object") return false;

  const candidate = action as Record<string, unknown>;

  if (candidate.type === "addNode") {
    return isValidAddNodeAction(candidate);
  }

  if (candidate.type === "addEdge") {
    return isValidAddEdgeAction(candidate);
  }

  if (candidate.type === "removeEdge") {
    return isValidRemoveEdgeAction(candidate);
  }

  return false;
}

function isValidAddNodeAction(action: Record<string, unknown>): boolean {
  const node = action.node as Record<string, unknown> | undefined;
  if (!node) return false;

  return (
    typeof node.id === "string" &&
    typeof node.type === "string" &&
    ["input", "output", "prompt", "image"].includes(node.type) &&
    typeof node.position === "object" &&
    node.position !== null &&
    typeof (node.position as Record<string, unknown>).x === "number" &&
    typeof (node.position as Record<string, unknown>).y === "number" &&
    typeof node.data === "object" &&
    node.data !== null
  );
}

const VALID_DATA_TYPES = ["string", "image", "response"] as const;

function isValidAddEdgeAction(action: Record<string, unknown>): boolean {
  const edge = action.edge as Record<string, unknown> | undefined;
  if (!edge) return false;

  const data = edge.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return false;

  const dataType = data.dataType;
  if (typeof dataType !== "string" || !VALID_DATA_TYPES.includes(dataType as typeof VALID_DATA_TYPES[number])) {
    return false;
  }

  return (
    typeof edge.id === "string" &&
    typeof edge.source === "string" &&
    typeof edge.target === "string"
  );
}

function isValidRemoveEdgeAction(action: Record<string, unknown>): boolean {
  return typeof action.edgeId === "string";
}
