import type { Node, Edge } from "@xyflow/react";
import type { ExecutionStatus } from "@/lib/execution/types";

// Base execution data added to all nodes
interface ExecutionData {
  executionStatus?: ExecutionStatus;
  executionOutput?: string;
  executionError?: string;
}

// Node data types for each custom node
export interface InputNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
}

export interface OutputNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
}

export interface PromptNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  prompt: string;
  model?: string;
}

export interface ToolNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  toolName: string;
  description?: string;
}

export interface ConditionNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  condition: string;
}

// Union type for all node data
export type AgentNodeData =
  | InputNodeData
  | OutputNodeData
  | PromptNodeData
  | ToolNodeData
  | ConditionNodeData;

// Custom node types
export type NodeType = "input" | "output" | "prompt" | "tool" | "condition";

// Typed nodes
export type InputNode = Node<InputNodeData, "input">;
export type OutputNode = Node<OutputNodeData, "output">;
export type PromptNode = Node<PromptNodeData, "prompt">;
export type ToolNode = Node<ToolNodeData, "tool">;
export type ConditionNode = Node<ConditionNodeData, "condition">;

export type AgentNode =
  | InputNode
  | OutputNode
  | PromptNode
  | ToolNode
  | ConditionNode;

// Edge type
export type AgentEdge = Edge;

// Node definitions for the sidebar
export interface NodeDefinition {
  type: NodeType;
  label: string;
  description: string;
  color: string;
}

export const nodeDefinitions: NodeDefinition[] = [
  {
    type: "input",
    label: "Input",
    description: "Entry point for the flow",
    color: "bg-green-500/10 text-green-700 dark:text-green-300",
  },
  {
    type: "prompt",
    label: "Prompt",
    description: "LLM prompt or instruction",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    type: "tool",
    label: "Tool",
    description: "External tool or function call",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  {
    type: "condition",
    label: "Condition",
    description: "Branching logic (if/else)",
    color: "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300",
  },
  {
    type: "output",
    label: "Output",
    description: "Exit point for the flow",
    color: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
];
