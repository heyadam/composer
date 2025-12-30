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
  outputs?: Record<string, string>;
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
  outputs?: Record<string, string>;
  errors?: Record<string, string>;
}
