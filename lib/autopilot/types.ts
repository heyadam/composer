import type { NodeType, AgentNodeData } from "@/types/flow";

// Flow snapshot sent to Claude as context
export interface FlowSnapshot {
  nodes: Array<{
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    data: AgentNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    data?: { dataType: string };
  }>;
}

// Actions Claude can return
export interface AddNodeAction {
  type: "addNode";
  node: {
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    data: AgentNodeData;
  };
}

export interface AddEdgeAction {
  type: "addEdge";
  edge: {
    id: string;
    source: string;
    target: string;
    data: { dataType: "string" | "image" | "response" };
  };
}

export interface RemoveEdgeAction {
  type: "removeEdge";
  edgeId: string;
}

export type FlowAction = AddNodeAction | AddEdgeAction | RemoveEdgeAction;

export interface FlowChanges {
  actions: FlowAction[];
  explanation: string;
}

// Chat message types
export interface AppliedChangesInfo {
  nodeIds: string[];
  edgeIds: string[];
}

export interface AutopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  pendingChanges?: FlowChanges;
  applied?: boolean;
  appliedInfo?: AppliedChangesInfo;
}

export type AutopilotModel = "claude-opus-4-5" | "claude-sonnet-4-5";

// API request/response types
export interface AutopilotRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  flowSnapshot: FlowSnapshot;
  model?: AutopilotModel;
}
