import type { Node, Edge } from "@xyflow/react";

export type ExecutionStatus = "idle" | "running" | "success" | "error";

export interface NodeExecutionState {
  status: ExecutionStatus;
  output?: string;
  error?: string;
  /** The type of node producing the content (for downstream outputs) */
  sourceType?: string;
}

export type ExecutionState = Record<string, NodeExecutionState>;

export interface ExecuteNodeRequest {
  node: Node;
  input: string;
  context: Record<string, unknown>;
}

export interface ExecuteNodeResponse {
  output: string;
  error?: string;
}

export interface FlowExecutionContext {
  nodes: Node[];
  edges: Edge[];
  executionState: ExecutionState;
  setExecutionState: (state: ExecutionState) => void;
  userInput: string;
}
