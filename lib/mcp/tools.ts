/**
 * MCP Tool Implementations
 *
 * Implements the three MCP tools:
 * - get_flow_info: Discover flow inputs/outputs
 * - run_flow: Start async execution
 * - get_run_status: Poll for results
 */

import { createServiceRoleClient } from "@/lib/supabase/service";
import { decryptKeys } from "@/lib/encryption";
import { recordToNode, recordToEdge } from "@/lib/flows/transform";
import { executeFlowServer } from "@/lib/execution/server-execute";
import { jobStore } from "./job-store";
import type { FlowNodeRecord, FlowEdgeRecord } from "@/lib/flows/types";
import type { FlowInfo, FlowJob, RunFlowResult, RunStatusResult } from "./types";

/**
 * Validate share token format
 */
function validateToken(token: string): void {
  if (!token || !/^[a-zA-Z0-9]{12}$/.test(token)) {
    throw new Error("Invalid token format. Expected 12 alphanumeric characters.");
  }
}

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "job_";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * get_flow_info tool
 *
 * Returns metadata about a flow including its input/output nodes
 */
export async function getFlowInfo(token: string): Promise<FlowInfo> {
  validateToken(token);

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc("get_live_flow", {
    p_share_token: token,
  });

  if (error || !data) {
    throw new Error(`Flow not found or not accessible: ${error?.message || "Unknown error"}`);
  }

  const nodeRecords = (data.nodes || []) as FlowNodeRecord[];
  const nodes = nodeRecords.map(recordToNode);

  // Extract input nodes (text-input, image-input, audio-input)
  const inputTypes = ["text-input", "image-input", "audio-input"];
  const inputs = nodes
    .filter((n) => inputTypes.includes(n.type || ""))
    .map((n) => ({
      id: n.id,
      label: (n.data?.label as string) || n.id,
      type: n.type as "text-input" | "image-input" | "audio-input",
    }));

  // Extract output nodes (preview-output)
  const outputs = nodes
    .filter((n) => n.type === "preview-output")
    .map((n) => ({
      id: n.id,
      label: (n.data?.label as string) || "Output",
    }));

  return {
    name: data.flow?.name || "Untitled Flow",
    description: data.flow?.description || null,
    ownerFunded: data.flow?.use_owner_keys ?? false,
    inputs,
    outputs,
  };
}

/**
 * run_flow tool
 *
 * Starts async execution and returns a job ID for polling
 */
export async function runFlow(
  token: string,
  inputs?: Record<string, string>
): Promise<RunFlowResult> {
  validateToken(token);

  const supabase = createServiceRoleClient();

  // Check minute-level rate limit (10 requests/minute)
  const { data: minuteLimit, error: minuteError } = await supabase
    .rpc("check_minute_rate_limit", {
      p_share_token: token,
      p_limit: 10,
    })
    .single<{ allowed: boolean; current_count: number; reset_at: string }>();

  if (minuteError) {
    console.error("Minute rate limit check failed:", minuteError);
    throw new Error("Rate limit check unavailable. Please try again.");
  }

  if (!minuteLimit?.allowed) {
    const retryAfter = minuteLimit?.reset_at
      ? Math.ceil((new Date(minuteLimit.reset_at).getTime() - Date.now()) / 1000)
      : 60;
    throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
  }

  // Check daily execution quota (100 runs/day)
  const { data: quotaResult, error: quotaError } = await supabase.rpc(
    "execute_live_flow_check",
    {
      p_share_token: token,
      p_daily_limit: 100,
    }
  );

  if (quotaError) {
    console.error("Daily quota check failed:", quotaError);
    throw new Error("Quota check unavailable. Please try again.");
  }

  if (!quotaResult?.allowed) {
    throw new Error(quotaResult?.reason || "Daily execution quota exceeded.");
  }

  // Log execution for rate limiting
  const { error: logError } = await supabase.rpc("log_execution", {
    p_share_token: token,
  });
  if (logError) {
    console.error("Failed to log execution:", logError);
    // Non-critical, continue
  }

  // Create job
  const jobId = generateJobId();
  const job: FlowJob = {
    id: jobId,
    shareToken: token,
    status: "pending",
    inputs: inputs || {},
    createdAt: new Date(),
  };
  jobStore.create(job);

  // Start async execution (don't await)
  executeJobAsync(job).catch((err) => {
    console.error(`Job ${jobId} execution failed:`, err);
    // Only update if job still exists (wasn't evicted from store)
    if (jobStore.get(jobId)) {
      jobStore.fail(jobId, { _error: err.message || "Unknown error" });
    }
  });

  return {
    job_id: jobId,
    status: "pending",
    message: `Job ${jobId} created. Use get_run_status to check progress.`,
    quota_remaining: quotaResult.remaining,
  };
}

/**
 * get_run_status tool
 *
 * Returns the status and results of a job
 */
export async function getRunStatus(jobId: string): Promise<RunStatusResult> {
  const job = jobStore.get(jobId);

  if (!job) {
    throw new Error(`Job not found: ${jobId}. Jobs expire after 1 hour.`);
  }

  return {
    job_id: job.id,
    status: job.status,
    created_at: job.createdAt.toISOString(),
    started_at: job.startedAt?.toISOString(),
    completed_at: job.completedAt?.toISOString(),
    outputs: job.outputs,
    errors: job.errors,
  };
}

/**
 * Execute job in background
 */
async function executeJobAsync(job: FlowJob): Promise<void> {
  const supabase = createServiceRoleClient();

  jobStore.setStatus(job.id, "running");

  // Get flow data
  const { data: flowData, error: flowError } = await supabase.rpc("get_live_flow", {
    p_share_token: job.shareToken,
  });

  if (flowError || !flowData) {
    throw new Error("Failed to load flow");
  }

  // Check if owner-funded execution is enabled
  if (!flowData.flow?.use_owner_keys) {
    throw new Error(
      "This flow requires owner-funded execution to be enabled. " +
        "The flow owner must enable 'Use Owner Keys' in the share settings."
    );
  }

  // Get owner's encrypted API keys
  const { data: encryptedKeys, error: keysError } = await supabase.rpc(
    "get_owner_keys_for_execution",
    { p_share_token: job.shareToken }
  );

  if (keysError || !encryptedKeys) {
    throw new Error(
      "Owner API keys not available. " +
        "The flow owner must store their API keys to enable execution."
    );
  }

  // Decrypt keys
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("Server configuration error: encryption key not set");
  }

  const apiKeys = decryptKeys(encryptedKeys, encryptionKey);

  // Convert DB records to React Flow format
  const nodeRecords = (flowData.nodes || []) as FlowNodeRecord[];
  const edgeRecords = (flowData.edges || []) as FlowEdgeRecord[];
  const nodes = nodeRecords.map(recordToNode);
  const edges = edgeRecords.map(recordToEdge);

  // Build input overrides map
  // Inputs can be specified by node label or node ID
  const inputOverrides: Record<string, string> = {};
  for (const node of nodes) {
    if (node.type === "text-input") {
      const label = (node.data?.label as string) || node.id;
      // Check by label first, then by ID
      if (job.inputs[label] !== undefined) {
        inputOverrides[node.id] = job.inputs[label];
      } else if (job.inputs[node.id] !== undefined) {
        inputOverrides[node.id] = job.inputs[node.id];
      }
    }
  }

  // Execute flow
  const result = await executeFlowServer(
    nodes,
    edges,
    apiKeys,
    Object.keys(inputOverrides).length > 0 ? inputOverrides : undefined
  );

  // Update job with results
  const hasErrors = Object.keys(result.errors).length > 0;

  if (hasErrors) {
    jobStore.fail(job.id, result.errors);
  } else {
    jobStore.complete(job.id, result.outputs);
  }
}
