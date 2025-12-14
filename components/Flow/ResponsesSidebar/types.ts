import type { NodeType } from "@/types/flow";
import type { ExecutionStatus, DebugInfo } from "@/lib/execution/types";

export interface PreviewEntry {
  id: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: NodeType;
  status: ExecutionStatus;
  output?: string;
  error?: string;
  timestamp: number;
  /** The type of node producing the content (e.g., "image" for image generation) */
  sourceType?: NodeType;
}

export interface DebugEntry {
  id: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: NodeType;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  request: DebugInfo["request"];
  response?: {
    output: string;
    isStreaming: boolean;
    streamChunksReceived?: number;
  };
  status: ExecutionStatus;
  error?: string;
  rawRequestBody?: string;
}
