/**
 * SSE Formatting Utilities for MCP Server
 *
 * This module provides utilities for formatting Server-Sent Events (SSE)
 * in the MCP JSON-RPC format. Used by the streaming execution endpoint
 * to push real-time progress updates and results to clients.
 *
 * SSE Format Reference:
 * - Each event consists of one or more lines
 * - Lines starting with ":" are comments (used for heartbeats)
 * - "id:" sets the event ID for reconnection
 * - "event:" sets the event type (we use "message" for JSON-RPC)
 * - "data:" contains the payload (JSON-RPC message)
 * - Events are terminated by a blank line
 *
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 * @see https://spec.modelcontextprotocol.io/specification/basic/transports/#streamable-http
 */

import type { ProgressNotification } from "./types";

/**
 * Format data as an SSE event in MCP JSON-RPC format.
 *
 * Produces a properly formatted SSE event with optional event ID.
 * The data is JSON-stringified and sent as the "message" event type.
 *
 * @param data - The data to send (will be JSON-stringified)
 * @param id - Optional event ID for client reconnection support
 * @returns Formatted SSE event string ready to write to the stream
 *
 * @example
 * ```typescript
 * formatSSEEvent({ jsonrpc: "2.0", method: "test" })
 * // Returns:
 * // event: message
 * // data: {"jsonrpc":"2.0","method":"test"}
 * //
 * // (with trailing newline)
 * ```
 *
 * @example
 * ```typescript
 * formatSSEEvent({ jsonrpc: "2.0", id: 1, result: {} }, "evt-123")
 * // Returns:
 * // id: evt-123
 * // event: message
 * // data: {"jsonrpc":"2.0","id":1,"result":{}}
 * //
 * // (with trailing newline)
 * ```
 */
export function formatSSEEvent(data: unknown, id?: string): string {
  const lines: string[] = [];
  if (id) lines.push(`id: ${id}`);
  lines.push(`event: message`);
  lines.push(`data: ${JSON.stringify(data)}`);
  lines.push("");
  return lines.join("\n") + "\n";
}

/**
 * Format a progress notification event.
 *
 * Wraps the progress notification in the MCP JSON-RPC notification format
 * using the "notifications/progress" method. Progress notifications are
 * one-way messages (no id field) that inform the client about execution progress.
 *
 * @param params - Progress notification parameters including token, progress, and optional total/message
 * @returns Formatted SSE event string containing the JSON-RPC notification
 *
 * @example
 * ```typescript
 * formatProgressEvent({
 *   progressToken: "req-123",
 *   progress: 2,
 *   total: 5,
 *   message: "Executing text-generation node"
 * })
 * // Returns SSE event with:
 * // {
 * //   "jsonrpc": "2.0",
 * //   "method": "notifications/progress",
 * //   "params": { "progressToken": "req-123", "progress": 2, "total": 5, "message": "..." }
 * // }
 * ```
 */
export function formatProgressEvent(params: ProgressNotification): string {
  return formatSSEEvent({
    jsonrpc: "2.0",
    method: "notifications/progress",
    params,
  });
}

/**
 * Format a successful JSON-RPC result event.
 *
 * Wraps the result in the MCP tool result format with a text content block.
 * The result is double-JSON-encoded: first as the content text, then as
 * the SSE data payload.
 *
 * @param requestId - The original JSON-RPC request ID to correlate the response
 * @param result - The result data (will be JSON-stringified into the content text)
 * @returns Formatted SSE event string containing the JSON-RPC response
 *
 * @example
 * ```typescript
 * formatResultEvent("req-123", { status: "completed", outputs: {} })
 * // Returns SSE event with:
 * // {
 * //   "jsonrpc": "2.0",
 * //   "id": "req-123",
 * //   "result": {
 * //     "content": [{ "type": "text", "text": "{\"status\":\"completed\",\"outputs\":{}}" }]
 * //   }
 * // }
 * ```
 */
export function formatResultEvent(
  requestId: string | number,
  result: unknown
): string {
  return formatSSEEvent({
    jsonrpc: "2.0",
    id: requestId,
    result: {
      content: [{ type: "text", text: JSON.stringify(result) }],
    },
  });
}

/**
 * JSON-RPC error codes used in MCP.
 *
 * Standard JSON-RPC 2.0 error codes plus MCP-specific codes.
 * @see https://www.jsonrpc.org/specification#error_object
 */
export const JsonRpcErrorCode = {
  /** Invalid JSON was received by the server */
  PARSE_ERROR: -32700,
  /** The JSON sent is not a valid Request object */
  INVALID_REQUEST: -32600,
  /** The method does not exist / is not available */
  METHOD_NOT_FOUND: -32601,
  /** Invalid method parameter(s) */
  INVALID_PARAMS: -32602,
  /** Internal JSON-RPC error */
  INTERNAL_ERROR: -32603,
} as const;

export type JsonRpcErrorCode =
  (typeof JsonRpcErrorCode)[keyof typeof JsonRpcErrorCode];

/**
 * Format a JSON-RPC error response event.
 *
 * Creates an SSE event containing a JSON-RPC error response.
 * Use this when execution fails or an error occurs during streaming.
 *
 * @param requestId - The original JSON-RPC request ID (use null if request ID was invalid/missing)
 * @param code - JSON-RPC error code (use JsonRpcErrorCode constants)
 * @param message - Human-readable error message
 * @param data - Optional additional error data for debugging
 * @returns Formatted SSE event string containing the JSON-RPC error response
 *
 * @example
 * ```typescript
 * formatErrorEvent("req-123", JsonRpcErrorCode.INTERNAL_ERROR, "Execution failed")
 * // Returns SSE event with:
 * // {
 * //   "jsonrpc": "2.0",
 * //   "id": "req-123",
 * //   "error": { "code": -32603, "message": "Execution failed" }
 * // }
 * ```
 *
 * @example
 * ```typescript
 * formatErrorEvent("req-123", JsonRpcErrorCode.INVALID_PARAMS, "Invalid token", { token: "abc" })
 * // Returns SSE event with error including data field
 * ```
 */
export function formatErrorEvent(
  requestId: string | number | null,
  code: number,
  message: string,
  data?: unknown
): string {
  const error: { code: number; message: string; data?: unknown } = {
    code,
    message,
  };
  if (data !== undefined) {
    error.data = data;
  }

  return formatSSEEvent({
    jsonrpc: "2.0",
    id: requestId,
    error,
  });
}

/**
 * Format a heartbeat comment.
 *
 * SSE connections can be closed by proxies and load balancers if idle
 * for too long. Heartbeat comments keep the connection alive without
 * sending actual data. Comments start with ":" and are ignored by clients.
 *
 * Recommended interval: every 15-30 seconds.
 *
 * @returns Formatted SSE comment string (": heartbeat\n\n")
 *
 * @example
 * ```typescript
 * // In a streaming handler:
 * const heartbeatInterval = setInterval(() => {
 *   if (!signal.aborted) {
 *     controller.enqueue(encoder.encode(formatHeartbeat()));
 *   }
 * }, 15000);
 * ```
 */
export function formatHeartbeat(): string {
  return ": heartbeat\n\n";
}
