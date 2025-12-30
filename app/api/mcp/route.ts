/**
 * MCP Server HTTP Endpoint
 *
 * Exposes Composer flow operations via the Model Context Protocol.
 * Uses stateless mode for serverless compatibility.
 *
 * Tools:
 * - get_flow_info: Discover flow inputs/outputs by share token
 * - run_flow: Start async flow execution, returns job_id
 * - get_run_status: Poll for job status and results
 */

import { NextRequest, NextResponse } from "next/server";
import { getFlowInfo, runFlow, getRunStatus } from "@/lib/mcp/tools";

/**
 * MCP Tool definitions
 */
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
      "Requires owner-funded execution to be enabled on the flow.",
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
            "Map of input node labels to values. " +
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
      },
      required: ["job_id"],
    },
  },
];

/**
 * Handle JSON-RPC request
 */
async function handleJsonRpcRequest(
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "composer-mcp",
          version: "1.0.0",
        },
      };

    case "tools/list":
      return { tools: TOOLS };

    case "tools/call": {
      const { name, arguments: args } = params as {
        name: string;
        arguments: Record<string, unknown>;
      };

      try {
        let result: unknown;

        switch (name) {
          case "get_flow_info":
            result = await getFlowInfo(args.token as string);
            break;

          case "run_flow":
            result = await runFlow(
              args.token as string,
              args.inputs as Record<string, string> | undefined
            );
            break;

          case "get_run_status":
            result = await getRunStatus(args.job_id as string);
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
 * POST /api/mcp
 *
 * Handle MCP JSON-RPC requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle single request or batch
    const isBatch = Array.isArray(body);
    const requests = isBatch ? body : [body];
    const responses: unknown[] = [];

    for (const req of requests) {
      const { jsonrpc, id, method, params = {} } = req;

      if (jsonrpc !== "2.0") {
        responses.push({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32600,
            message: "Invalid Request: jsonrpc must be '2.0'",
          },
        });
        continue;
      }

      try {
        const result = await handleJsonRpcRequest(method, params);

        // Notifications don't get responses
        if (result === null) {
          continue;
        }

        responses.push({
          jsonrpc: "2.0",
          id,
          result,
        });
      } catch (error) {
        responses.push({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal error",
          },
        });
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
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
        },
      },
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
    version: "1.0.0",
    description:
      "MCP server for Composer - a visual AI workflow builder. " +
      "Use POST to interact with the JSON-RPC API.",
    tools: TOOLS.map((t) => t.name),
  });
}
