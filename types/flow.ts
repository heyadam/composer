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
  codeExplanation?: string;    // Plain English explanation of what the code does
  codeExpanded?: boolean;      // Whether code view is expanded
  isGenerating?: boolean;      // Loading state for generation
  generationError?: string;    // Error from code generation
}

// React component style presets
export type ReactStylePreset = "simple" | "none" | "robust";

export interface ReactNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  userPrompt?: string;    // Component description (when not connected)
  systemPrompt?: string;  // Additional instructions (when not connected)
  provider?: string;
  model?: string;
  stylePreset?: ReactStylePreset;  // UI style preset
}

// Comment node colors
export type CommentColor = "gray" | "blue" | "green" | "yellow" | "purple" | "pink" | "orange";

export interface CommentNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  color: CommentColor;
  isGenerating?: boolean;  // AI is generating title/description
  userEdited?: boolean;    // User has manually edited, skip auto-generation
}

// Union type for all node data
export type AgentNodeData =
  | InputNodeData
  | OutputNodeData
  | PromptNodeData
  | ImageNodeData
  | ImageInputNodeData
  | MagicNodeData
  | CommentNodeData
  | ReactNodeData;

// Custom node types
export type NodeType = "text-input" | "preview-output" | "text-generation" | "image-generation" | "image-input" | "ai-logic" | "comment" | "react-component";

// Typed nodes
export type InputNode = Node<InputNodeData, "text-input">;
export type OutputNode = Node<OutputNodeData, "preview-output">;
export type PromptNode = Node<PromptNodeData, "text-generation">;
export type ImageNode = Node<ImageNodeData, "image-generation">;
export type ImageInputNode = Node<ImageInputNodeData, "image-input">;
export type MagicNode = Node<MagicNodeData, "ai-logic">;
export type CommentNode = Node<CommentNodeData, "comment">;
export type ReactNode = Node<ReactNodeData, "react-component">;

export type AgentNode =
  | InputNode
  | OutputNode
  | PromptNode
  | ImageNode
  | ImageInputNode
  | MagicNode
  | CommentNode
  | ReactNode;

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
    type: "text-input",
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
    type: "ai-logic",
    label: "AI Logic",
    description: "Custom code transformation",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  {
    type: "text-generation",
    label: "Text Generation",
    description: "Generate text with AI",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  },
  {
    type: "image-generation",
    label: "Image Generation",
    description: "Generate images with AI",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  },
  {
    type: "preview-output",
    label: "Preview Output",
    description: "Flow output",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    type: "react-component",
    label: "React Component",
    description: "Generate React UI components",
    color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
];

// Port schemas for each node type
export const NODE_PORT_SCHEMAS: Record<NodeType, NodePortSchema> = {
  "text-input": {
    inputs: [],
    outputs: [{ id: "output", label: "string", dataType: "string" }],
  },
  "image-input": {
    inputs: [],
    outputs: [{ id: "output", label: "image", dataType: "image" }],
  },
  "preview-output": {
    inputs: [{ id: "input", label: "response", dataType: "response" }],
    outputs: [],
  },
  "text-generation": {
    inputs: [
      { id: "prompt", label: "prompt", dataType: "string", required: true },
      { id: "system", label: "system", dataType: "string", required: false },
    ],
    outputs: [{ id: "output", label: "string", dataType: "string" }],
  },
  "image-generation": {
    inputs: [
      { id: "image", label: "image", dataType: "image", required: false },
      { id: "prompt", label: "prompt", dataType: "string", required: false },
    ],
    outputs: [{ id: "output", label: "image", dataType: "image" }],
  },
  "ai-logic": {
    inputs: [
      { id: "transform", label: "transform", dataType: "string", required: false },
      { id: "input1", label: "input1", dataType: "string", required: false },
      { id: "input2", label: "input2", dataType: "string", required: false },
    ],
    outputs: [{ id: "output", label: "output", dataType: "string" }],
  },
  "comment": {
    inputs: [],
    outputs: [],
  },
  "react-component": {
    inputs: [
      { id: "prompt", label: "prompt", dataType: "string", required: true },
      { id: "system", label: "system", dataType: "string", required: false },
    ],
    outputs: [{ id: "output", label: "react", dataType: "response" }],
  },
};
