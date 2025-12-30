/**
 * MCP Server HTTP Endpoint
 *
 * Exposes Composer flow operations via the Model Context Protocol.
 * Uses stateless mode for serverless compatibility.
 *
 * Supports both polling-based and SSE streaming execution:
 * - Polling: Call run_flow to get job_id, then poll get_run_status
 * - Streaming: Call run_flow with Accept: text/event-stream header
 *
 * Tools:
 * - get_flow_info: Discover flow inputs/outputs by share token
 * - run_flow: Start async flow execution (supports SSE streaming)
 * - get_run_status: Poll for job status and results
 */

// Node.js runtime required for crypto module (API key encryption/decryption)
// SSE streaming works with Node.js runtime on Vercel
export const runtime = "nodejs";

// Allow up to 5 minutes for flow execution (matches EXECUTION_LIMITS.TIMEOUT_MS)
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";

import {
  getFlowInfo,
  runFlow,
  getRunStatus,
  createFlowExecutionStream,
} from "@/lib/mcp/tools";

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional().default({}),
});

const ToolCallParamsSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional().default({}),
});

// Type for validated request
type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS = [
  {
    name: "get_flow_info",
    description:
      "Get metadata about a Composer flow including its inputs and outputs. " +
      "Use this to discover what inputs a flow expects before running it.",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "12-character share token for the flow",
        },
      },
      required: ["token"],
    },
  },
  {
    name: "run_flow",
    description:
      "Execute a Composer flow asynchronously with optional input values. " +
      "Returns a job_id that you can poll with get_run_status. " +
      "Requires owner-funded execution to be enabled on the flow. " +
      "Note: Only text-input nodes can receive values; image/audio inputs use pre-configured data.",
    inputSchema: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "12-character share token for the flow",
        },
        inputs: {
          type: "object",
          description:
            "Map of text-input node labels to string values. " +
            "Use get_flow_info to discover available inputs.",
          additionalProperties: { type: "string" },
        },
      },
      required: ["token"],
    },
  },
  {
    name: "get_run_status",
    description:
      "Check the status of an async flow execution and retrieve results when complete. " +
      "Poll this until status is 'completed' or 'failed'.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "Job ID returned from run_flow",
        },
        token: {
          type: "string",
          description:
            "Optional: Share token for ownership verification. " +
            "Recommended for security.",
        },
      },
      required: ["job_id"],
    },
  },
];

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * Handle JSON-RPC request with validated params
 */
async function handleJsonRpcRequest(
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: "2025-03-26",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "composer-mcp",
          version: "2.0.0",
        },
      };

    case "tools/list":
      return { tools: TOOLS };

    case "tools/call": {
      // Validate tool call params
      const parseResult = ToolCallParamsSchema.safeParse(params);
      if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0];
        throw new Error(`Invalid tool call params: ${firstIssue?.message || "validation failed"}`);
      }

      const { name, arguments: args } = parseResult.data;

      try {
        let result: unknown;

        switch (name) {
          case "get_flow_info":
            result = await getFlowInfo(args.token);
            break;

          case "run_flow": {
            const { response, executionPromise } = await runFlow(args.token, args.inputs);
            // Use after() to keep function alive for background execution
            after(executionPromise);
            result = response;
            break;
          }

          case "get_run_status":
            result = await getRunStatus(args.job_id, args.token);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "notifications/initialized":
      // Client notification, no response needed
      return null;

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

/**
 * Build JSON-RPC error response
 */
function buildErrorResponse(
  id: string | number | null,
  code: number,
  message: string
) {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}

/**
 * POST /api/mcp
 *
 * Handle MCP JSON-RPC requests
 *
 * For run_flow with Accept: text/event-stream header, returns an SSE stream
 * with real-time progress updates instead of returning a job_id for polling.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle single request or batch
    const isBatch = Array.isArray(body);
    const requests = isBatch ? body : [body];

    // Check if client accepts SSE (only applicable for single run_flow requests)
    const acceptsSSE = request.headers.get("Accept")?.includes("text/event-stream");

    // For single run_flow requests with SSE accept header, return streaming response
    if (!isBatch && acceptsSSE && requests.length === 1) {
      const req = requests[0];
      const parseResult = JsonRpcRequestSchema.safeParse(req);

      if (parseResult.success) {
        const validatedReq = parseResult.data;

        // Check if this is a tools/call for run_flow
        // Also verify we have a valid request ID (streaming requires an ID to correlate the response)
        if (validatedReq.method === "tools/call" && validatedReq.id !== null) {
          const toolParseResult = ToolCallParamsSchema.safeParse(validatedReq.params);
          if (toolParseResult.success && toolParseResult.data.name === "run_flow") {
            const args = toolParseResult.data.arguments;

            // Return SSE stream directly (no after() needed - stream keeps function alive)
            const stream = createFlowExecutionStream(
              args.token as string,
              (args.inputs as Record<string, string>) || {},
              validatedReq.id,
              request.signal
            );

            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
              },
            });
          }
        }
      }
    }

    // Standard JSON-RPC handling for non-SSE requests
    const responses: unknown[] = [];

    for (const req of requests) {
      // Validate JSON-RPC request structure
      const parseResult = JsonRpcRequestSchema.safeParse(req);

      if (!parseResult.success) {
        const id = typeof req === "object" && req !== null ? req.id ?? null : null;
        const firstIssue = parseResult.error.issues[0];
        responses.push(
          buildErrorResponse(
            id,
            -32600,
            `Invalid Request: ${firstIssue?.message || "validation failed"}`
          )
        );
        continue;
      }

      const validatedReq: JsonRpcRequest = parseResult.data;

      try {
        const result = await handleJsonRpcRequest(
          validatedReq.method,
          validatedReq.params
        );

        // Notifications don't get responses
        if (result === null) {
          continue;
        }

        responses.push({
          jsonrpc: "2.0",
          id: validatedReq.id,
          result,
        });
      } catch (error) {
        responses.push(
          buildErrorResponse(
            validatedReq.id,
            -32603,
            error instanceof Error ? error.message : "Internal error"
          )
        );
      }
    }

    // Return batch or single response
    if (isBatch) {
      return NextResponse.json(responses);
    } else if (responses.length === 0) {
      // Notification only, return 204
      return new NextResponse(null, { status: 204 });
    } else {
      return NextResponse.json(responses[0]);
    }
  } catch (error) {
    console.error("MCP request error:", error);
    return NextResponse.json(
      buildErrorResponse(null, -32700, "Parse error"),
      { status: 400 }
    );
  }
}

/**
 * GET /api/mcp
 *
 * Health check and server info
 */
export async function GET() {
  return NextResponse.json({
    name: "composer-mcp",
    version: "2.0.0",
    protocolVersion: "2025-03-26",
    description:
      "MCP server for Composer - a visual AI workflow builder. " +
      "Use POST to interact with the JSON-RPC API. " +
      "Supports SSE streaming for real-time execution progress.",
    tools: TOOLS.map((t) => t.name),
  });
}
