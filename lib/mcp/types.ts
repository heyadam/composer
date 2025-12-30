/**
 * MCP Server Types
 *
 * Type definitions for the Composer MCP server that enables
 * external tools to discover, run, and monitor flow executions.
 */

/**
 * Job lifecycle states
 */
export type JobStatus = "pending" | "running" | "completed" | "failed";

/**
 * Structured output types for MCP responses
 */
export type StructuredOutputType = "text" | "image" | "audio" | "code";

/**
 * Structured output from flow execution.
 * Replaces raw string outputs with typed objects for better consumer handling.
 */
export interface StructuredOutput {
  /** The type of output data */
  type: StructuredOutputType;
  /** The output value - text content or base64-encoded binary data */
  value: string;
  /** MIME type for binary data (e.g., "image/png", "audio/webm"). Defaults applied for image/audio. */
  mimeType?: string;
}

/**
 * Type guard to check if an object is a StructuredOutput
 */
export function isStructuredOutput(obj: unknown): obj is StructuredOutput {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.type === "string" &&
    ["text", "image", "audio", "code"].includes(o.type) &&
    typeof o.value === "string"
  );
}

/**
 * In-memory job record
 */
export interface FlowJob {
  id: string;
  shareToken: string;
  status: JobStatus;
  inputs: Record<string, string>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  outputs?: Record<string, StructuredOutput>;
  errors?: Record<string, string>;
}

/**
 * Flow info returned by get_flow_info tool
 */
export interface FlowInfo {
  name: string;
  description: string | null;
  ownerFunded: boolean;
  inputs: Array<{
    id: string;
    label: string;
    type: "text-input" | "image-input" | "audio-input";
  }>;
  outputs: Array<{
    id: string;
    label: string;
  }>;
}

/**
 * Result from run_flow tool
 */
export interface RunFlowResult {
  job_id: string;
  status: JobStatus;
  message: string;
  quota_remaining?: number;
}

/**
 * Result from get_run_status tool
 */
export interface RunStatusResult {
  job_id: string;
  status: JobStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  outputs?: Record<string, StructuredOutput>;
  errors?: Record<string, string>;
}

// ============================================================================
// Streaming Types (MCP 2025-03-26 Streamable HTTP)
// ============================================================================

/**
 * Progress notification sent during streaming execution.
 * Follows MCP notifications/progress format.
 */
export interface ProgressNotification {
  /** Unique token to correlate progress with the original request */
  progressToken: string;
  /** Number of nodes completed */
  progress: number;
  /** Total number of executable nodes (if known) */
  total?: number;
  /** Human-readable progress message */
  message?: string;
  /** Node execution event details */
  node?: NodeExecutionEvent;
}

/**
 * Event emitted when a node's execution status changes.
 * Used for real-time progress updates during streaming execution.
 */
export interface NodeExecutionEvent {
  /** Unique node identifier */
  nodeId: string;
  /** Human-readable node label */
  nodeLabel: string;
  /** Node type (e.g., "text-generation", "image-generation") */
  nodeType: string;
  /** Current execution status */
  status: "running" | "success" | "error";
  /** Output data (only for preview-output nodes on success) */
  output?: StructuredOutput;
  /** Error message (only on error status) */
  error?: string;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Final result sent at the end of a streaming execution.
 */
export interface StreamingRunResult {
  /** Overall execution status */
  status: "completed" | "failed";
  /** Outputs from preview-output nodes (keyed by label) */
  outputs?: Record<string, StructuredOutput>;
  /** Errors from failed nodes (keyed by label) */
  errors?: Record<string, string>;
  /** Total execution time in milliseconds */
  duration_ms: number;
}
