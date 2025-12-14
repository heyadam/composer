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
  imageInput?: string; // Inline uploaded image for editing (runtime only, not persisted)
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

export interface ImageInputNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  // Note: uploadedImage is stored in runtime state only (not persisted to JSON)
  // Users must re-upload images when reloading the flow
  uploadedImage?: string; // Stringified ImageData JSON, runtime only
}

export interface MagicNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  transformPrompt?: string;    // User's natural language transformation description
  generatedCode?: string;      // Cached generated JavaScript code
  codeExpanded?: boolean;      // Whether code view is expanded
  isGenerating?: boolean;      // Loading state for generation
  generationError?: string;    // Error from code generation
}

// Union type for all node data
export type AgentNodeData =
  | InputNodeData
  | OutputNodeData
  | PromptNodeData
  | ImageNodeData
  | ImageInputNodeData
  | MagicNodeData;

// Custom node types
export type NodeType = "input" | "output" | "prompt" | "image" | "image-input" | "magic";

// Typed nodes
export type InputNode = Node<InputNodeData, "input">;
export type OutputNode = Node<OutputNodeData, "output">;
export type PromptNode = Node<PromptNodeData, "prompt">;
export type ImageNode = Node<ImageNodeData, "image">;
export type ImageInputNode = Node<ImageInputNodeData, "image-input">;
export type MagicNode = Node<MagicNodeData, "magic">;

export type AgentNode =
  | InputNode
  | OutputNode
  | PromptNode
  | ImageNode
  | ImageInputNode
  | MagicNode;

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
    label: "Text Input",
    description: "Text entry point",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  {
    type: "image-input",
    label: "Image Input",
    description: "Upload an image",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  {
    type: "magic",
    label: "Transform",
    description: "Custom code transformation",
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    type: "prompt",
    label: "Text Generation",
    description: "Generate text with AI",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  },
  {
    type: "image",
    label: "Image Generation",
    description: "Generate images with AI",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  },
  {
    type: "output",
    label: "Output",
    description: "Flow output",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
];

// Port schemas for each node type
export const NODE_PORT_SCHEMAS: Record<NodeType, NodePortSchema> = {
  input: {
    inputs: [],
    outputs: [{ id: "output", label: "string", dataType: "string" }],
  },
  "image-input": {
    inputs: [],
    outputs: [{ id: "output", label: "image", dataType: "image" }],
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
    inputs: [
      { id: "image", label: "image", dataType: "image", required: false },
      { id: "prompt", label: "prompt", dataType: "string", required: false },
    ],
    outputs: [{ id: "output", label: "image", dataType: "image" }],
  },
  magic: {
    inputs: [
      { id: "transform", label: "transform", dataType: "string", required: false },
      { id: "input1", label: "input1", dataType: "string", required: false },
      { id: "input2", label: "input2", dataType: "string", required: false },
    ],
    outputs: [{ id: "output", label: "output", dataType: "string" }],
  },
};
