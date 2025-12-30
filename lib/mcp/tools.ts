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
import {
  executeFlowServer,
  executeFlowServerWithProgress,
} from "@/lib/execution/server-execute";
import { jobStore } from "./job-store";
import { transformOutputs } from "./output-parser";
import {
  formatSSEEvent,
  formatResultEvent,
  formatErrorEvent,
  formatHeartbeat,
  JsonRpcErrorCode,
} from "./sse";
import type { FlowNodeRecord, FlowEdgeRecord } from "@/lib/flows/types";
import type {
  FlowInfo,
  FlowJob,
  RunFlowResult,
  RunStatusResult,
  StreamingRunResult,
} from "./types";
import type { Node } from "@xyflow/react";

// ============================================================================
// Constants
// ============================================================================

const RATE_LIMITS = {
  /** Maximum executions per minute per share token */
  PER_MINUTE: 10,
  /** Maximum executions per day per flow */
  PER_DAY: 100,
} as const;

const INPUT_LIMITS = {
  /** Maximum length for a single input value */
  MAX_VALUE_LENGTH: 100_000, // 100KB
  /** Maximum number of input keys */
  MAX_INPUT_COUNT: 50,
  /** Maximum length for input key names */
  MAX_KEY_LENGTH: 256,
} as const;

const INPUT_NODE_TYPES = ["text-input", "image-input", "audio-input"] as const;
type InputNodeType = (typeof INPUT_NODE_TYPES)[number];

const EXECUTION_LIMITS = {
  /** Maximum execution time in milliseconds (5 minutes) */
  TIMEOUT_MS: 5 * 60 * 1000,
  /** Maximum output size in bytes (10MB) - supports larger images */
  MAX_OUTPUT_SIZE: 10_000_000,
} as const;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate flow data structure from RPC response
 */
interface ValidatedFlowData {
  flow: {
    name?: string;
    description?: string;
    use_owner_keys?: boolean;
  };
  nodes: FlowNodeRecord[];
  edges: FlowEdgeRecord[];
}

function validateFlowData(data: unknown): ValidatedFlowData {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid flow data: expected object");
  }

  const flowData = data as Record<string, unknown>;

  // Validate nodes array
  const nodes = flowData.nodes;
  if (!Array.isArray(nodes)) {
    throw new Error("Invalid flow data: nodes must be an array");
  }

  // Validate edges array
  const edges = flowData.edges;
  if (!Array.isArray(edges)) {
    throw new Error("Invalid flow data: edges must be an array");
  }

  // Validate flow object exists
  const flow = flowData.flow;
  if (flow !== null && flow !== undefined && typeof flow !== "object") {
    throw new Error("Invalid flow data: flow must be an object");
  }

  return {
    flow: (flow as ValidatedFlowData["flow"]) || {},
    nodes: nodes as FlowNodeRecord[],
    edges: edges as FlowEdgeRecord[],
  };
}

/**
 * Validate share token format
 */
function validateToken(token: unknown): asserts token is string {
  if (typeof token !== "string") {
    throw new Error("Token must be a string");
  }
  if (!/^[a-zA-Z0-9]{12}$/.test(token)) {
    throw new Error("Invalid token format. Expected 12 alphanumeric characters.");
  }
}

/**
 * Validate job ID format
 */
function validateJobId(jobId: unknown): asserts jobId is string {
  if (typeof jobId !== "string") {
    throw new Error("Job ID must be a string");
  }
  if (!/^job_[a-zA-Z0-9]{16}$/.test(jobId)) {
    throw new Error("Invalid job ID format");
  }
}

/**
 * Validate and sanitize inputs object
 */
function validateInputs(inputs: unknown): Record<string, string> {
  if (inputs === undefined || inputs === null) {
    return {};
  }

  if (typeof inputs !== "object" || Array.isArray(inputs)) {
    throw new Error("Inputs must be an object");
  }

  const result: Record<string, string> = {};
  const entries = Object.entries(inputs as Record<string, unknown>);

  if (entries.length > INPUT_LIMITS.MAX_INPUT_COUNT) {
    throw new Error(`Too many inputs. Maximum ${INPUT_LIMITS.MAX_INPUT_COUNT} allowed.`);
  }

  for (const [key, value] of entries) {
    // Validate key length (keys from Object.entries are always strings)
    if (key.length > INPUT_LIMITS.MAX_KEY_LENGTH) {
      throw new Error(`Input key too long: "${key.slice(0, 50)}..." (max ${INPUT_LIMITS.MAX_KEY_LENGTH} chars)`);
    }

    // Validate value
    if (typeof value !== "string") {
      throw new Error(`Input value for "${key}" must be a string`);
    }

    if (value.length > INPUT_LIMITS.MAX_VALUE_LENGTH) {
      throw new Error(
        `Input value for "${key}" exceeds maximum length of ${INPUT_LIMITS.MAX_VALUE_LENGTH} characters`
      );
    }

    result[key] = value;
  }

  return result;
}

/**
 * Type guard for input node types
 */
function isInputNodeType(type: string | undefined): type is InputNodeType {
  return INPUT_NODE_TYPES.includes(type as InputNodeType);
}

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * get_flow_info tool
 *
 * Returns metadata about a flow including its input/output nodes
 */
export async function getFlowInfo(token: unknown): Promise<FlowInfo> {
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

  // Extract input nodes with type guard
  const inputs = nodes
    .filter((n): n is Node & { type: InputNodeType } => isInputNodeType(n.type))
    .map((n) => ({
      id: n.id,
      label: (n.data?.label as string) || n.id,
      type: n.type,
    }));

  // Extract output nodes
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
 * Result from runFlow including background execution promise
 */
export interface RunFlowInternalResult {
  response: RunFlowResult;
  /** Promise for background execution - use with Next.js after() */
  executionPromise: Promise<void>;
}

/**
 * run_flow tool
 *
 * Starts async execution and returns a job ID for polling.
 * Returns both the response and the execution promise for use with after().
 */
export async function runFlow(
  token: unknown,
  inputs?: unknown
): Promise<RunFlowInternalResult> {
  // Validate inputs
  validateToken(token);
  const validatedInputs = validateInputs(inputs);

  const supabase = createServiceRoleClient();

  // Check minute-level rate limit
  const { data: minuteLimit, error: minuteError } = await supabase
    .rpc("check_minute_rate_limit", {
      p_share_token: token,
      p_limit: RATE_LIMITS.PER_MINUTE,
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

  // Check daily execution quota
  const { data: quotaResult, error: quotaError } = await supabase.rpc(
    "execute_live_flow_check",
    {
      p_share_token: token,
      p_daily_limit: RATE_LIMITS.PER_DAY,
    }
  );

  if (quotaError) {
    console.error("Daily quota check failed:", quotaError);
    throw new Error("Quota check unavailable. Please try again.");
  }

  if (!quotaResult?.allowed) {
    throw new Error(quotaResult?.reason || "Daily execution quota exceeded.");
  }

  // Create job first (before logging) so rate limit isn't consumed if job creation fails
  const job = await jobStore.create(token, validatedInputs);

  // Log execution for rate limiting (after job created successfully)
  const { error: logError } = await supabase.rpc("log_execution", {
    p_share_token: token,
  });
  if (logError) {
    // Log but don't fail - job is already created, rate limiting may be slightly off
    console.warn("Failed to log execution (non-critical):", logError.message);
  }

  // Create execution promise (caller should use after() to keep function alive)
  const executionPromise = executeJobAsync(job).catch(async (err) => {
    console.error(`Job ${job.id} execution failed:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    await jobStore.fail(job.id, { _error: errorMessage || "Unknown error" });
  });

  return {
    response: {
      job_id: job.id,
      status: job.status,
      message: `Job ${job.id} created. Use get_run_status to check progress.`,
      quota_remaining: quotaResult.remaining,
    },
    executionPromise,
  };
}

/**
 * get_run_status tool
 *
 * Returns the status and results of a job.
 * Optionally verifies share_token ownership for security.
 */
export async function getRunStatus(
  jobId: unknown,
  shareToken?: unknown
): Promise<RunStatusResult> {
  validateJobId(jobId);

  // Validate share_token if provided
  if (shareToken !== undefined) {
    validateToken(shareToken);
  }

  const job = await jobStore.get(jobId);

  if (!job) {
    throw new Error(`Job not found: ${jobId}. Jobs expire after 1 hour.`);
  }

  // Verify ownership if share_token provided
  if (shareToken !== undefined && job.shareToken !== shareToken) {
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

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Execute a promise with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Execute job in background
 */
async function executeJobAsync(job: FlowJob): Promise<void> {
  const supabase = createServiceRoleClient();

  // Get flow data
  const { data: rawFlowData, error: flowError } = await supabase.rpc("get_live_flow", {
    p_share_token: job.shareToken,
  });

  if (flowError || !rawFlowData) {
    throw new Error("Failed to load flow");
  }

  // Validate flow data structure
  const flowData = validateFlowData(rawFlowData);

  // Check if owner-funded execution is enabled
  if (!flowData.flow.use_owner_keys) {
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
  const nodes = flowData.nodes.map(recordToNode);
  const edges = flowData.edges.map(recordToEdge);

  // Build input overrides map
  // Inputs can be specified by node label or node ID
  // NOTE: Only text-input nodes are currently supported for MCP input overrides.
  // Image and audio inputs require the flow to have pre-configured data.
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

  // Execute flow with timeout
  const result = await withTimeout(
    executeFlowServer(
      nodes,
      edges,
      apiKeys,
      Object.keys(inputOverrides).length > 0 ? inputOverrides : undefined
    ),
    EXECUTION_LIMITS.TIMEOUT_MS,
    `Execution timed out after ${EXECUTION_LIMITS.TIMEOUT_MS / 1000} seconds`
  );

  // Update job with results
  const errors = result.errors || {};
  const rawOutputs = result.outputs || {};
  const hasErrors = Object.keys(errors).length > 0;

  // Transform raw string outputs to structured format with explicit types
  const structuredOutputs = transformOutputs(rawOutputs);

  // Check output size (10MB to support larger images)
  const outputSize = JSON.stringify(structuredOutputs).length;
  if (outputSize > EXECUTION_LIMITS.MAX_OUTPUT_SIZE) {
    const sizeInMB = (outputSize / 1024 / 1024).toFixed(1);
    const maxInMB = (EXECUTION_LIMITS.MAX_OUTPUT_SIZE / 1024 / 1024).toFixed(0);
    await jobStore.fail(job.id, {
      _error: `Output size (${sizeInMB}MB) exceeds maximum allowed (${maxInMB}MB)`,
    });
    return;
  }

  if (hasErrors) {
    await jobStore.fail(job.id, errors);
  } else {
    try {
      await jobStore.complete(job.id, structuredOutputs);
    } catch (completeError) {
      // If we can't mark as complete, mark as failed instead
      console.error("Failed to complete job, marking as failed:", completeError);
      await jobStore.fail(job.id, {
        _error: `Execution succeeded but failed to save results: ${
          completeError instanceof Error ? completeError.message : "Unknown error"
        }`,
      });
    }
  }
}

// ============================================================================
// Streaming Execution
// ============================================================================

/** Node types that should not be counted for progress tracking */
const NON_EXECUTABLE_NODE_TYPES = ["comment"] as const;

/**
 * Count the number of executable nodes in a flow.
 * Excludes comment nodes and other non-executable node types.
 *
 * @param nodes - Array of nodes to count
 * @returns Number of executable nodes
 */
export function countExecutableNodes(nodes: Node[]): number {
  return nodes.filter(
    (node) =>
      !NON_EXECUTABLE_NODE_TYPES.includes(
        node.type as (typeof NON_EXECUTABLE_NODE_TYPES)[number]
      )
  ).length;
}

/**
 * Create a ReadableStream for SSE-based flow execution.
 *
 * This function returns a stream that emits:
 * - Progress events as JSON-RPC notifications via SSE
 * - Heartbeats every 15 seconds to keep the connection alive
 * - Final result as JSON-RPC response
 *
 * The stream handles:
 * - Token and rate limit validation
 * - Flow loading and owner key decryption
 * - Real-time progress tracking during execution
 * - Client disconnect handling via AbortSignal
 * - Error responses in JSON-RPC format
 *
 * @param token - Share token for the flow (12 alphanumeric characters)
 * @param inputs - Input values for text-input nodes (keyed by node label or ID)
 * @param requestId - JSON-RPC request ID for correlating the response
 * @param signal - AbortSignal for client disconnect handling
 * @returns ReadableStream that emits SSE-formatted events
 *
 * @example
 * ```typescript
 * const stream = createFlowExecutionStream(
 *   "abc123xyz789",
 *   { "User Input": "Hello world" },
 *   "req-123",
 *   request.signal
 * );
 *
 * return new Response(stream, {
 *   headers: { "Content-Type": "text/event-stream" }
 * });
 * ```
 */
export function createFlowExecutionStream(
  token: string,
  inputs: Record<string, string>,
  requestId: string | number,
  signal: AbortSignal
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      // Setup heartbeat interval (15 seconds)
      const heartbeat = setInterval(() => {
        if (!signal.aborted) {
          controller.enqueue(encoder.encode(formatHeartbeat()));
        }
      }, 15000);

      const startTime = Date.now();

      try {
        // Validate token format
        validateToken(token);
        const validatedInputs = validateInputs(inputs);

        const supabase = createServiceRoleClient();

        // Check minute-level rate limit
        const { data: minuteLimit, error: minuteError } = await supabase
          .rpc("check_minute_rate_limit", {
            p_share_token: token,
            p_limit: RATE_LIMITS.PER_MINUTE,
          })
          .single<{ allowed: boolean; current_count: number; reset_at: string }>();

        if (minuteError) {
          throw new Error("Rate limit check unavailable. Please try again.");
        }

        if (!minuteLimit?.allowed) {
          const retryAfter = minuteLimit?.reset_at
            ? Math.ceil(
                (new Date(minuteLimit.reset_at).getTime() - Date.now()) / 1000
              )
            : 60;
          throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
        }

        // Check daily execution quota
        const { data: quotaResult, error: quotaError } = await supabase.rpc(
          "execute_live_flow_check",
          {
            p_share_token: token,
            p_daily_limit: RATE_LIMITS.PER_DAY,
          }
        );

        if (quotaError) {
          throw new Error("Quota check unavailable. Please try again.");
        }

        if (!quotaResult?.allowed) {
          throw new Error(quotaResult?.reason || "Daily execution quota exceeded.");
        }

        // Load flow data
        const { data: rawFlowData, error: flowError } = await supabase.rpc(
          "get_live_flow",
          { p_share_token: token }
        );

        if (flowError || !rawFlowData) {
          throw new Error("Failed to load flow");
        }

        // Validate flow data structure
        const flowData = validateFlowData(rawFlowData);

        // Check if owner-funded execution is enabled
        if (!flowData.flow.use_owner_keys) {
          throw new Error(
            "This flow requires owner-funded execution to be enabled. " +
              "The flow owner must enable 'Use Owner Keys' in the share settings."
          );
        }

        // Get owner's encrypted API keys
        const { data: encryptedKeys, error: keysError } = await supabase.rpc(
          "get_owner_keys_for_execution",
          { p_share_token: token }
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
        const nodes = flowData.nodes.map(recordToNode);
        const edges = flowData.edges.map(recordToEdge);

        // Build input overrides map
        const inputOverrides: Record<string, string> = {};
        for (const node of nodes) {
          if (node.type === "text-input") {
            const label = (node.data?.label as string) || node.id;
            if (validatedInputs[label] !== undefined) {
              inputOverrides[node.id] = validatedInputs[label];
            } else if (validatedInputs[node.id] !== undefined) {
              inputOverrides[node.id] = validatedInputs[node.id];
            }
          }
        }

        // Log execution for rate limiting
        const { error: logError } = await supabase.rpc("log_execution", {
          p_share_token: token,
        });
        if (logError) {
          console.warn("Failed to log execution (non-critical):", logError.message);
        }

        // Count executable nodes for progress tracking
        const totalNodes = countExecutableNodes(nodes);
        let completedNodes = 0;

        // Progress callback that emits SSE events
        const onProgress = (event: {
          nodeId: string;
          nodeLabel: string;
          nodeType: string;
          status: "running" | "success" | "error";
          output?: import("./types").StructuredOutput;
          error?: string;
          timestamp: string;
        }) => {
          if (signal.aborted) return;

          // Count completed nodes (both success and error count as completed)
          if (event.status === "success" || event.status === "error") {
            completedNodes++;
          }

          // Emit progress notification
          controller.enqueue(
            encoder.encode(
              formatSSEEvent({
                jsonrpc: "2.0",
                method: "notifications/progress",
                params: {
                  progressToken: String(requestId),
                  progress: completedNodes,
                  total: totalNodes,
                  message: `${event.nodeLabel}: ${event.status}`,
                  node: event,
                },
              })
            )
          );
        };

        // Execute flow with progress callbacks and abort signal
        const result = await executeFlowServerWithProgress(
          nodes,
          edges,
          apiKeys,
          Object.keys(inputOverrides).length > 0 ? inputOverrides : undefined,
          onProgress,
          signal
        );

        // Check for cancellation before sending final result
        if (signal.aborted) {
          throw new Error("Execution cancelled");
        }

        // Transform outputs to structured format
        const structuredOutputs = transformOutputs(result.outputs);
        const hasErrors = Object.keys(result.errors).length > 0;

        // Build final result
        const finalResult: StreamingRunResult = {
          status: hasErrors ? "failed" : "completed",
          outputs: structuredOutputs,
          errors: hasErrors ? result.errors : undefined,
          duration_ms: Date.now() - startTime,
        };

        // Send final result
        controller.enqueue(encoder.encode(formatResultEvent(requestId, finalResult)));
      } catch (error) {
        // Send error response
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            formatErrorEvent(
              requestId,
              JsonRpcErrorCode.INTERNAL_ERROR,
              errorMessage
            )
          )
        );
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },

    cancel() {
      // Called when the client disconnects
      // The signal parameter already handles abort propagation to the execution
    },
  });
}
