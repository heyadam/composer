/**
 * Supabase-backed Job Store
 *
 * Manages async flow execution jobs with database persistence
 * for serverless compatibility (works reliably on Vercel).
 */

import { createServiceRoleClient } from "@/lib/supabase/service";
import { parseRawOutput } from "./output-parser";
import type { FlowJob, JobStatus, StructuredOutput } from "./types";
import { isStructuredOutput } from "./types";

/**
 * Database record shape for mcp_jobs table
 * Note: outputs can be either legacy string format or new StructuredOutput format
 */
interface McpJobRecord {
  id: string;
  share_token: string;
  status: JobStatus;
  inputs: Record<string, string>;
  outputs: Record<string, unknown> | null;
  errors: Record<string, string> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Normalize outputs from database to StructuredOutput format.
 * Handles both legacy string format and new structured format for backward compatibility.
 */
function normalizeOutputs(
  outputs: Record<string, unknown> | null
): Record<string, StructuredOutput> | undefined {
  if (!outputs) return undefined;

  return Object.fromEntries(
    Object.entries(outputs).map(([key, value]) => {
      if (typeof value === "string") {
        // Legacy format: raw string, parse it
        return [key, parseRawOutput(value)];
      } else if (isStructuredOutput(value)) {
        // New format: already structured
        return [key, value];
      }
      // Unknown format: convert to text
      return [key, { type: "text" as const, value: String(value) }];
    })
  );
}

/**
 * Convert database record to FlowJob
 */
function recordToJob(record: McpJobRecord): FlowJob {
  return {
    id: record.id,
    shareToken: record.share_token,
    status: record.status,
    inputs: record.inputs,
    outputs: normalizeOutputs(record.outputs),
    errors: record.errors ?? undefined,
    createdAt: new Date(record.created_at),
    startedAt: record.started_at ? new Date(record.started_at) : undefined,
    completedAt: record.completed_at ? new Date(record.completed_at) : undefined,
  };
}

/**
 * Supabase-backed job store for serverless environments
 */
class JobStore {
  /**
   * Create a new job with status 'running' (avoids race condition)
   * Uses crypto.randomUUID() for collision-free IDs
   */
  async create(shareToken: string, inputs: Record<string, string>): Promise<FlowJob> {
    const jobId = `job_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .rpc("create_mcp_job", {
        p_job_id: jobId,
        p_share_token: shareToken,
        p_inputs: inputs,
      })
      .single<McpJobRecord>();

    if (error || !data) {
      throw new Error(`Failed to create job: ${error?.message || "Unknown error"}`);
    }

    return recordToJob(data);
  }

  /**
   * Get a job by ID
   */
  async get(jobId: string): Promise<FlowJob | null> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .rpc("get_mcp_job", { p_job_id: jobId })
      .single<McpJobRecord>();

    if (error) {
      // PGRST116 = no rows returned (not found)
      if (error.code === "PGRST116") {
        return null;
      }
      throw new Error(`Failed to get job: ${error.message}`);
    }

    return data ? recordToJob(data) : null;
  }

  /**
   * Mark job as completed with structured outputs
   * Throws if the update fails to avoid silent failures
   */
  async complete(jobId: string, outputs: Record<string, StructuredOutput>): Promise<void> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase.rpc("complete_mcp_job", {
      p_job_id: jobId,
      p_outputs: outputs,
    });

    if (error) {
      // Throw to surface the error - don't leave job stuck in running state
      throw new Error(`Failed to complete job ${jobId}: ${error.message}`);
    }
  }

  /**
   * Mark job as failed with errors
   * Logs but doesn't throw - we don't want to mask the original error
   */
  async fail(jobId: string, errors: Record<string, string>): Promise<void> {
    const supabase = createServiceRoleClient();

    const { error } = await supabase.rpc("fail_mcp_job", {
      p_job_id: jobId,
      p_errors: errors,
    });

    if (error) {
      // Log but don't throw - failing to record failure shouldn't mask original error
      // The job will be stuck in "running" but that's better than losing the error info
      console.error(`Failed to mark job ${jobId} as failed:`, error);
    }
  }

  /**
   * Cleanup expired jobs (called periodically or via cron)
   */
  async cleanup(): Promise<number> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc("cleanup_mcp_jobs").single<number>();

    if (error) {
      console.error("Failed to cleanup jobs:", error);
      return 0;
    }

    return data ?? 0;
  }
}

// Singleton instance
export const jobStore = new JobStore();
