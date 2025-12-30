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
 * Resource link for large outputs.
 * Instead of embedding binary data inline (which causes context bloat),
 * return a fetchable URL that clients can use to retrieve the full data.
 */
export interface ResourceLink {
  /** Discriminator for resource links */
  type: "resource_link";
  /** Full URL to fetch the output data */
  uri: string;
  /** Suggested filename for the output (e.g., "Anime.png") */
  name: string;
  /** MIME type of the output data */
  mimeType: string;
  /** Size of the output in bytes (helps LLMs understand scale) */
  size_bytes: number;
  /** Optional description for additional context */
  description?: string;
}

/**
 * Type guard to check if an object is a ResourceLink
 */
export function isResourceLink(obj: unknown): obj is ResourceLink {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    o.type === "resource_link" &&
    typeof o.uri === "string" &&
    typeof o.name === "string" &&
    typeof o.mimeType === "string" &&
    typeof o.size_bytes === "number"
  );
}

/**
 * Union type for output content.
 * Can be either inline structured output or a resource link to fetch.
 */
export type OutputContent = StructuredOutput | ResourceLink;

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
 * Submission confirmation status for run_flow responses.
 * Uses "started" to clearly distinguish from polling statuses.
 * This prevents LLMs from confusing the submission response with
 * a polling response and retrying run_flow instead of calling get_run_status.
 */
export type SubmissionStatus = "started";

/**
 * Result from run_flow tool
 */
export interface RunFlowResult {
  job_id: string;
  /** Always "started" to indicate successful submission. Use get_run_status to poll for completion. */
  status: SubmissionStatus;
  message: string;
  /** Explicit instruction for the LLM on what to do next */
  next_action: "call get_run_status";
  quota_remaining?: number;
}

/**
 * Result from get_run_status tool
 */
export interface RunStatusResult {
  job_id: string;
  status: JobStatus;
  /** Guidance message for LLM on what to do next */
  message: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  /** Outputs as resource links (for binary) or inline content (for small text) */
  outputs?: Record<string, OutputContent>;
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
  /** Outputs as resource links (for binary) or inline content (for small text) */
  outputs?: Record<string, OutputContent>;
  /** Errors from failed nodes (keyed by label) */
  errors?: Record<string, string>;
  /** Total execution time in milliseconds */
  duration_ms: number;
}
