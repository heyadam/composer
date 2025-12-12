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
  inputValue?: string;
}

export interface OutputNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
}

export interface PromptNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  prompt: string;
  provider?: string;
  model?: string;
  // OpenAI-specific options
  verbosity?: "low" | "medium" | "high";
  thinking?: boolean;
}

export interface ImageNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  prompt?: string; // Optional additional instructions
  outputFormat?: "webp" | "png" | "jpeg";
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "auto" | "low" | "medium" | "high";
  partialImages?: 0 | 1 | 2 | 3;
}

// Union type for all node data
export type AgentNodeData =
  | InputNodeData
  | OutputNodeData
  | PromptNodeData
  | ImageNodeData;

// Custom node types
export type NodeType = "input" | "output" | "prompt" | "image";

// Typed nodes
export type InputNode = Node<InputNodeData, "input">;
export type OutputNode = Node<OutputNodeData, "output">;
export type PromptNode = Node<PromptNodeData, "prompt">;
export type ImageNode = Node<ImageNodeData, "image">;

export type AgentNode =
  | InputNode
  | OutputNode
  | PromptNode
  | ImageNode;

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
    type: "image",
    label: "Image",
    description: "Generate images with AI",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  {
    type: "output",
    label: "Response",
    description: "Exit point for the flow",
    color: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
];
