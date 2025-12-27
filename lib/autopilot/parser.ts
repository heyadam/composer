import type { FlowChanges, FlowAction, FlowPlan } from "./types";

// Discriminated union for parse results
export type ParseResult =
  | { type: "changes"; data: FlowChanges }
  | { type: "plan"; data: FlowPlan }
  | { type: "none" };

/**
 * Parse either a plan or flow changes from Claude's response.
 */
export function parseResponse(response: string): ParseResult {
  const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
  const matches = [...response.matchAll(jsonBlockRegex)];

  for (const match of matches) {
    const jsonStr = match[1].trim();
    try {
      const parsed = JSON.parse(jsonStr);

      // Check if it's a plan (wrapped in { type: "plan", plan: {...} })
      if (parsed.type === "plan" && isValidFlowPlan(parsed.plan)) {
        return { type: "plan", data: parsed.plan };
      }

      // Check if it's flow changes
      if (isValidFlowChanges(parsed)) {
        return { type: "changes", data: parsed };
      }
    } catch {
      continue;
    }
  }

  // Try parsing entire response as JSON
  try {
    const parsed = JSON.parse(response.trim());
    if (parsed.type === "plan" && isValidFlowPlan(parsed.plan)) {
      return { type: "plan", data: parsed.plan };
    }
    if (isValidFlowChanges(parsed)) {
      return { type: "changes", data: parsed };
    }
  } catch {
    // Not valid JSON
  }

  return { type: "none" };
}

/**
 * Type guard to validate FlowPlan structure
 */
export function isValidFlowPlan(obj: unknown): obj is FlowPlan {
  if (!obj || typeof obj !== "object") return false;

  const candidate = obj as Record<string, unknown>;

  if (typeof candidate.summary !== "string") return false;
  if (!Array.isArray(candidate.steps)) return false;
  if (!candidate.estimatedChanges || typeof candidate.estimatedChanges !== "object") return false;

  const changes = candidate.estimatedChanges as Record<string, unknown>;
  if (typeof changes.nodesToAdd !== "number") return false;
  if (typeof changes.edgesToAdd !== "number") return false;
  if (typeof changes.edgesToRemove !== "number") return false;

  // Validate steps
  for (const step of candidate.steps) {
    if (!step || typeof step !== "object") return false;
    const s = step as Record<string, unknown>;
    if (typeof s.description !== "string") return false;
  }

  return true;
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

  if (candidate.type === "removeNode") {
    return isValidRemoveNodeAction(candidate);
  }

  return false;
}

function isValidAddNodeAction(action: Record<string, unknown>): boolean {
  const node = action.node as Record<string, unknown> | undefined;
  if (!node) return false;

  // Basic structure validation only - evaluator handles business rules
  if (typeof node.id !== "string") return false;
  if (typeof node.type !== "string") return false;
  // Don't validate node type here - let evaluator catch invalid types

  // Position validation
  if (typeof node.position !== "object" || node.position === null) return false;
  const position = node.position as Record<string, unknown>;
  if (typeof position.x !== "number" || typeof position.y !== "number")
    return false;

  // Data validation - just check it exists
  if (typeof node.data !== "object" || node.data === null) return false;

  return true;
}

function isValidAddEdgeAction(action: Record<string, unknown>): boolean {
  const edge = action.edge as Record<string, unknown> | undefined;
  if (!edge) return false;

  // Basic structure validation only - evaluator handles business rules
  // Don't validate dataType here - let evaluator catch invalid types
  return (
    typeof edge.id === "string" &&
    typeof edge.source === "string" &&
    typeof edge.target === "string"
  );
}

function isValidRemoveEdgeAction(action: Record<string, unknown>): boolean {
  return typeof action.edgeId === "string";
}

function isValidRemoveNodeAction(action: Record<string, unknown>): boolean {
  return typeof action.nodeId === "string";
}
