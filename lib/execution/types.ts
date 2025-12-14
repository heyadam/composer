import type { Node, Edge } from "@xyflow/react";

export type ExecutionStatus = "idle" | "running" | "success" | "error";

export interface DebugInfo {
  startTime: number;
  endTime?: number;
  request: {
    type: "prompt" | "image";
    provider: string;
    model: string;
    userPrompt?: string;
    systemPrompt?: string;
    verbosity?: string;
    thinking?: boolean;
    // Image-specific
    imagePrompt?: string;
    hasSourceImage?: boolean;
    size?: string;
    quality?: string;
    aspectRatio?: string;
    outputFormat?: string;
    partialImages?: number;
  };
  streamChunksReceived?: number;
  rawRequestBody?: string;
  rawResponseBody?: string;
}

export interface NodeExecutionState {
  status: ExecutionStatus;
  output?: string;
  error?: string;
  /** The type of node producing the content (for downstream outputs) */
  sourceType?: string;
  /** Debug information for API calls */
  debugInfo?: DebugInfo;
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
