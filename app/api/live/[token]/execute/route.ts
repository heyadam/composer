import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptKeys } from "@/lib/encryption";
import { recordToNode, recordToEdge } from "@/lib/flows/transform";
import { executeFlowServer } from "@/lib/execution/server-execute";
import type { FlowNodeRecord, FlowEdgeRecord } from "@/lib/flows/types";

interface RouteParams {
  params: Promise<{ token: string }>;
}

interface ApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
}

/**
 * Extract API keys from request headers
 */
function getKeysFromHeaders(request: NextRequest): ApiKeys {
  return {
    openai: request.headers.get("x-openai-key") || undefined,
    google: request.headers.get("x-google-key") || undefined,
    anthropic: request.headers.get("x-anthropic-key") || undefined,
  };
}

/**
 * Check if keys object has at least one valid key
 */
function hasAnyKey(keys: ApiKeys): boolean {
  return !!(keys.openai || keys.google || keys.anthropic);
}

/**
 * POST /api/live/[token]/execute - Execute a live flow
 *
 * Execution flow:
 * 1. Check if execution is allowed + enforce quota atomically
 * 2. Try to get owner's stored keys (if use_owner_keys is enabled)
 * 3. Fall back to keys from request headers
 * 4. Execute the flow
 * 5. Return outputs
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Validate token format
    if (!token || !/^[a-zA-Z0-9]{12}$/.test(token)) {
      return NextResponse.json(
        { success: false, error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Parse request body for inputs
    const body = await request.json().catch(() => ({}));
    const { inputs = {} } = body;

    // Check minute-level rate limit first
    // Note: RPC returns TABLE, use .single() to get object instead of array
    const { data: minuteLimit, error: minuteError } = await supabase
      .rpc("check_minute_rate_limit", {
        p_share_token: token,
        p_limit: 10,
      })
      .single<{ allowed: boolean; current_count: number; reset_at: string }>();

    if (minuteError || !minuteLimit?.allowed) {
      const retryAfter = minuteLimit?.reset_at
        ? Math.ceil(
            (new Date(minuteLimit.reset_at).getTime() - Date.now()) / 1000
          )
        : 60;
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: `Too many requests. Try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    // Check daily execution quota atomically
    const { data: quotaResult, error: quotaError } = await supabase.rpc(
      "execute_live_flow_check",
      {
        p_share_token: token,
        p_daily_limit: 100,
      }
    );

    if (quotaError) {
      console.error("Error checking execution quota:", quotaError);
      return NextResponse.json(
        { success: false, error: "Failed to check execution quota" },
        { status: 500 }
      );
    }

    if (!quotaResult?.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: quotaResult?.reason || "Execution not allowed",
        },
        { status: 403 }
      );
    }

    // Log execution for minute-level rate limiting
    await supabase.rpc("log_execution", { p_share_token: token });

    // Try to get owner's stored keys (if use_owner_keys is enabled)
    let apiKeys: ApiKeys = {};
    const { data: encryptedKeys } = await supabase.rpc(
      "get_owner_keys_for_execution",
      { p_share_token: token }
    );

    if (encryptedKeys) {
      // Decrypt owner's keys
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        console.error("ENCRYPTION_KEY not configured");
        return NextResponse.json(
          { success: false, error: "Server configuration error" },
          { status: 500 }
        );
      }

      try {
        const decrypted = decryptKeys(encryptedKeys, encryptionKey);
        apiKeys = {
          openai: decrypted.openai,
          google: decrypted.google,
          anthropic: decrypted.anthropic,
        };
      } catch (err) {
        console.error("Error decrypting owner keys:", err);
        // Fall through to check collaborator's keys
      }
    }

    // Fall back to keys from request headers (collaborator's own keys)
    if (!hasAnyKey(apiKeys)) {
      apiKeys = getKeysFromHeaders(request);
    }

    if (!hasAnyKey(apiKeys)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No API keys available. Owner has not enabled shared keys and no keys were provided.",
        },
        { status: 400 }
      );
    }

    // Get the flow data
    const { data: flowData, error: flowError } = await supabase.rpc(
      "get_live_flow",
      { p_share_token: token }
    );

    if (flowError || !flowData) {
      console.error("Error fetching flow for execution:", flowError);
      return NextResponse.json(
        { success: false, error: "Failed to load flow" },
        { status: 500 }
      );
    }

    // Convert DB records to React Flow format
    const nodeRecords = (flowData.nodes || []) as FlowNodeRecord[];
    const edgeRecords = (flowData.edges || []) as FlowEdgeRecord[];

    const nodes = nodeRecords.map(recordToNode);
    const edges = edgeRecords.map(recordToEdge);

    if (nodes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Flow has no nodes" },
        { status: 400 }
      );
    }

    // Build input overrides map (from node labels to values)
    // The inputs object uses node labels as keys
    const inputOverrides: Record<string, string> = {};
    for (const node of nodes) {
      if (node.type === "text-input") {
        const label = (node.data?.label as string) || node.id;
        if (inputs[label] !== undefined) {
          inputOverrides[node.id] = inputs[label];
        } else if (inputs[node.id] !== undefined) {
          inputOverrides[node.id] = inputs[node.id];
        }
      }
    }

    // Execute the flow
    const result = await executeFlowServer(
      nodes,
      edges,
      apiKeys,
      Object.keys(inputOverrides).length > 0 ? inputOverrides : undefined
    );

    // Check for errors
    const hasErrors = Object.keys(result.errors).length > 0;

    return NextResponse.json({
      success: !hasErrors,
      quotaRemaining: quotaResult.remaining,
      flowName: flowData.flow?.name,
      outputs: result.outputs,
      ...(hasErrors && { errors: result.errors }),
    });
  } catch (error) {
    console.error("Error in POST /api/live/[token]/execute:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
