import type { Node, Edge } from "@xyflow/react";
import type { ExecutionStatus } from "@/lib/execution/types";

// Port data types (for coloring and validation)
export type PortDataType = "string" | "image" | "response" | "audio" | "boolean" | "pulse";

// Audio edge data structure for audio streaming between nodes
export interface AudioEdgeData {
  type: "stream" | "buffer";
  // For stream type: reference ID to MediaStream in global registry
  streamId?: string;
  // For buffer type: base64-encoded audio
  buffer?: string;
  mimeType?: string;  // e.g., "audio/pcm", "audio/webm"
  sampleRate?: number; // e.g., 24000 for OpenAI Realtime
}

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
  stringOutput?: string;
  imageOutput?: string;
  audioOutput?: string;
}

// Google safety setting types
export type GoogleHarmCategory =
  | "HARM_CATEGORY_HATE_SPEECH"
  | "HARM_CATEGORY_DANGEROUS_CONTENT"
  | "HARM_CATEGORY_HARASSMENT"
  | "HARM_CATEGORY_SEXUALLY_EXPLICIT";

export type GoogleHarmThreshold =
  | "HARM_BLOCK_THRESHOLD_UNSPECIFIED"
  | "BLOCK_LOW_AND_ABOVE"
  | "BLOCK_MEDIUM_AND_ABOVE"
  | "BLOCK_ONLY_HIGH"
  | "BLOCK_NONE";

export interface GoogleSafetySetting {
  category: GoogleHarmCategory;
  threshold: GoogleHarmThreshold;
}

// Google thinking config types
export interface GoogleThinkingConfig {
  thinkingLevel?: "low" | "high";      // Gemini 3 models
  thinkingBudget?: number;              // Gemini 2.5 models
  includeThoughts?: boolean;
}

export interface PromptNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  userPrompt?: string;    // User message (when not connected)
  systemPrompt?: string;  // System instructions (when not connected)
  imageInput?: string;    // Stringified ImageData JSON (runtime only, not persisted)
  provider?: string;
  model?: string;
  // OpenAI-specific options
  verbosity?: "low" | "medium" | "high";
  thinking?: boolean;
  // Google-specific options
  googleThinkingConfig?: GoogleThinkingConfig;
  googleSafetySettings?: GoogleSafetySetting[];
  googleSafetyPreset?: "default" | "strict" | "relaxed" | "none";
  googleStructuredOutputs?: boolean;
  // Reasoning/thinking output (for models that support it)
  executionReasoning?: string;
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

export interface AudioInputNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  // Runtime state (not persisted)
  isRecording?: boolean;       // Whether currently recording
  recordingDuration?: number;  // Elapsed recording time in seconds
  awaitingInput?: boolean;     // Execution engine is waiting for recording
  // Recorded audio data (persisted)
  audioBuffer?: string;        // Base64-encoded audio data
  audioMimeType?: string;      // MIME type (e.g., "audio/webm")
}

// Evaluation test case result
export interface MagicEvalTestCase {
  input1: string | number | null;
  input2: string | number | null;
  result?: string | number | null;
  error?: string;
}

// Evaluation results for generated code
export interface MagicEvalResults {
  syntaxValid: boolean;
  syntaxError?: string;
  testCases: MagicEvalTestCase[];
  allPassed: boolean;
}

export interface MagicNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  transformPrompt?: string;    // User's natural language transformation description
  generatedCode?: string;      // Cached generated JavaScript code
  codeExplanation?: string;    // Plain English explanation of what the code does
  codeExpanded?: boolean;      // Whether code view is expanded
  evalExpanded?: boolean;      // Whether eval results are expanded
  isGenerating?: boolean;      // Loading state for generation
  generationError?: string;    // Error from code generation
  evalResults?: MagicEvalResults; // Evaluation results from test execution
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

// Voice options for realtime sessions
export type RealtimeVoice =
  | "alloy" | "ash" | "ballad" | "coral" | "echo"
  | "sage" | "shimmer" | "verse" | "marin" | "cedar";

// VAD (Voice Activity Detection) modes
export type RealtimeVADMode = "semantic_vad" | "server_vad" | "disabled";

// Session connection status
export type RealtimeSessionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

// Transcript entry for conversation history
export interface RealtimeTranscriptEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

// Realtime conversation node data
export interface RealtimeNodeData extends Record<string, unknown>, ExecutionData {
  label: string;

  // Configuration (persisted)
  instructions?: string;          // System prompt for the session
  voice: RealtimeVoice;           // Voice for audio output
  vadMode: RealtimeVADMode;       // Voice activity detection mode

  // Runtime state (not persisted, managed by component)
  sessionStatus?: RealtimeSessionStatus;
  transcript?: RealtimeTranscriptEntry[];
  elapsedSeconds?: number;
  audioOutStreamId?: string;      // Registry ID for output audio stream
}

// Audio transcription node data
export interface AudioTranscriptionNodeData extends Record<string, unknown>, ExecutionData {
  label: string;
  model?: "gpt-4o-transcribe" | "gpt-4o-mini-transcribe";
  language?: string;  // Optional ISO 639-1 code (e.g., "en", "es")
}

// Union type for all node data
export type AgentNodeData =
  | InputNodeData
  | OutputNodeData
  | PromptNodeData
  | ImageNodeData
  | ImageInputNodeData
  | AudioInputNodeData
  | MagicNodeData
  | CommentNodeData
  | ReactNodeData
  | RealtimeNodeData
  | AudioTranscriptionNodeData;

// Custom node types
export type NodeType = "text-input" | "preview-output" | "text-generation" | "image-generation" | "image-input" | "audio-input" | "ai-logic" | "comment" | "react-component" | "realtime-conversation" | "audio-transcription";

// Typed nodes
export type InputNode = Node<InputNodeData, "text-input">;
export type OutputNode = Node<OutputNodeData, "preview-output">;
export type PromptNode = Node<PromptNodeData, "text-generation">;
export type ImageNode = Node<ImageNodeData, "image-generation">;
export type ImageInputNode = Node<ImageInputNodeData, "image-input">;
export type AudioInputNode = Node<AudioInputNodeData, "audio-input">;
export type MagicNode = Node<MagicNodeData, "ai-logic">;
export type CommentNode = Node<CommentNodeData, "comment">;
export type ReactNode = Node<ReactNodeData, "react-component">;
export type RealtimeNode = Node<RealtimeNodeData, "realtime-conversation">;
export type AudioTranscriptionNode = Node<AudioTranscriptionNodeData, "audio-transcription">;

export type AgentNode =
  | InputNode
  | OutputNode
  | PromptNode
  | ImageNode
  | ImageInputNode
  | AudioInputNode
  | MagicNode
  | CommentNode
  | ReactNode
  | RealtimeNode
  | AudioTranscriptionNode;

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
    type: "audio-input",
    label: "Audio Input",
    description: "Record from microphone",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    type: "ai-logic",
    label: "AI Logic",
    description: "Custom code transformation",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  {
    type: "react-component",
    label: "React",
    description: "Generate React UI components",
    color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  {
    type: "text-generation",
    label: "Text Gen",
    description: "Generate text with AI",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  },
  {
    type: "image-generation",
    label: "Image Gen",
    description: "Generate images with AI",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  },
  {
    type: "preview-output",
    label: "Output",
    description: "Flow output",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    type: "realtime-conversation",
    label: "Realtime Audio",
    description: "Real-time voice conversation",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    type: "audio-transcription",
    label: "Transcribe",
    description: "Convert audio to text",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
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
  "audio-input": {
    inputs: [],
    outputs: [
      { id: "output", label: "audio", dataType: "audio" },
      { id: "done", label: "Done", dataType: "pulse" },
    ],
  },
  "preview-output": {
    inputs: [
      { id: "string", label: "string", dataType: "string", required: false },
      { id: "image", label: "image", dataType: "image", required: false },
      { id: "audio", label: "audio", dataType: "audio", required: false },
    ],
    outputs: [],
  },
  "text-generation": {
    inputs: [
      { id: "prompt", label: "prompt", dataType: "string", required: true },
      { id: "system", label: "system", dataType: "string", required: false },
      { id: "image", label: "image", dataType: "image", required: false },
    ],
    outputs: [
      { id: "output", label: "string", dataType: "string" },
      { id: "done", label: "Done", dataType: "pulse" },
    ],
  },
  "image-generation": {
    inputs: [
      { id: "image", label: "image", dataType: "image", required: false },
      { id: "prompt", label: "prompt", dataType: "string", required: false },
    ],
    outputs: [
      { id: "output", label: "image", dataType: "image" },
      { id: "done", label: "Done", dataType: "pulse" },
    ],
  },
  "ai-logic": {
    inputs: [
      { id: "transform", label: "transform", dataType: "string", required: false },
      { id: "input1", label: "input1", dataType: "string", required: false },
      { id: "input2", label: "input2", dataType: "string", required: false },
    ],
    outputs: [
      { id: "output", label: "output", dataType: "string" },
      { id: "done", label: "Done", dataType: "pulse" },
    ],
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
    outputs: [
      { id: "output", label: "react", dataType: "response" },
      { id: "done", label: "Done", dataType: "pulse" },
    ],
  },
  "realtime-conversation": {
    inputs: [
      { id: "instructions", label: "instructions", dataType: "string", required: false },
      { id: "audio-in", label: "audio", dataType: "audio", required: false },
    ],
    outputs: [
      { id: "transcript", label: "transcript", dataType: "string" },
      { id: "audio-out", label: "audio", dataType: "audio" },
      { id: "done", label: "Done", dataType: "pulse" },
    ],
  },
  "audio-transcription": {
    inputs: [
      { id: "audio", label: "audio", dataType: "audio", required: true },
      { id: "language", label: "language", dataType: "string", required: false },
    ],
    outputs: [
      { id: "output", label: "string", dataType: "string" },
      { id: "done", label: "Done", dataType: "pulse" },
    ],
  },
};
