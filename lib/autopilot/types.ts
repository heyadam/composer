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

export type FlowAction = AddNodeAction | AddEdgeAction;

export interface FlowChanges {
  actions: FlowAction[];
  explanation: string;
}

// Chat message types
export interface AutopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  pendingChanges?: FlowChanges;
  applied?: boolean;
}

// API request/response types
export interface AutopilotRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  flowSnapshot: FlowSnapshot;
}
