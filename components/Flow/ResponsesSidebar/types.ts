import type { NodeType } from "@/types/flow";
import type { ExecutionStatus } from "@/lib/execution/types";

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
