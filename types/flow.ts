import type { Node, Edge } from "@xyflow/react";
import type { ExecutionStatus } from "@/lib/execution/types";

// Port data types (for coloring and validation)
export type PortDataType = "string" | "image" | "response";

// Single port definition
export interface PortDefinition {
  id: string;           // Unique handle ID (e.g., "prompt", "system")
  label: string;        // Display label
  dataType: PortDataType;
  required?: boolean;   // Defaults to true
}

// Node port schema
export interface NodePortSchema {
  inputs: PortDefinition[];
  outputs: PortDefinition[];
}

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
  userPrompt?: string;    // User message (when not connected)
  systemPrompt?: string;  // System instructions (when not connected)
  provider?: string;
  model?: string;
  // OpenAI-specific options
  verbosity?: "low" | "medium" | "high";
  thinking?: boolean;
}

export interface ImageNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  prompt?: string; // Optional additional instructions
  provider?: string;
  model?: string;
  // OpenAI-specific options
  outputFormat?: "webp" | "png" | "jpeg";
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "auto" | "low" | "medium" | "high";
  partialImages?: 0 | 1 | 2 | 3;
  // Google-specific options
  aspectRatio?: string;
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
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  {
    type: "prompt",
    label: "Text",
    description: "LLM text generation",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  },
  {
    type: "image",
    label: "Image",
    description: "Generate images with AI",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  },
  {
    type: "output",
    label: "Response",
    description: "Exit point for the flow",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
];

// Port schemas for each node type
export const NODE_PORT_SCHEMAS: Record<NodeType, NodePortSchema> = {
  input: {
    inputs: [],
    outputs: [{ id: "output", label: "string", dataType: "string" }],
  },
  output: {
    inputs: [{ id: "input", label: "response", dataType: "response" }],
    outputs: [],
  },
  prompt: {
    inputs: [
      { id: "prompt", label: "prompt", dataType: "string", required: true },
      { id: "system", label: "system", dataType: "string", required: false },
    ],
    outputs: [{ id: "output", label: "string", dataType: "string" }],
  },
  image: {
    inputs: [{ id: "prompt", label: "prompt", dataType: "string" }],
    outputs: [{ id: "output", label: "image", dataType: "image" }],
  },
};
