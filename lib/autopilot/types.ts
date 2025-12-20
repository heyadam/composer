import type { NodeType, AgentNodeData } from "@/types/flow";

// Autopilot mode
export type AutopilotMode = "execute" | "plan";

// Plan structure (what Claude outputs in plan mode)
export interface FlowPlan {
  summary: string;
  steps: PlanStep[];
  estimatedChanges: {
    nodesToAdd: number;
    edgesToAdd: number;
    edgesToRemove: number;
  };
}

export interface PlanStep {
  description: string;
  nodeType?: NodeType;
}

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
  // Labels are populated at parse time for display purposes
  sourceLabel?: string;
  targetLabel?: string;
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

// Evaluation result from LLM validator
export interface EvaluationResult {
  valid: boolean;
  issues: string[];
  suggestions: string[];
}

// Evaluation state for UI display
export type EvaluationState = "pending" | "evaluating" | "passed" | "failed" | "retrying";

export interface AutopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  thinking?: string;
  pendingChanges?: FlowChanges;
  pendingPlan?: FlowPlan;
  planApproved?: boolean;
  applied?: boolean;
  appliedInfo?: AppliedChangesInfo;
  evaluationResult?: EvaluationResult;
  evaluationState?: EvaluationState;
  wasRetried?: boolean;
}

export type AutopilotModel = "opus-4-5-low" | "opus-4-5-medium" | "opus-4-5-high";

// API request/response types
export interface AutopilotRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  flowSnapshot: FlowSnapshot;
  model?: AutopilotModel;
  mode?: AutopilotMode;
  approvedPlan?: FlowPlan;
  thinkingEnabled?: boolean;
}
