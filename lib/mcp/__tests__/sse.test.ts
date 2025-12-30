import { describe, it, expect } from "vitest";
import {
  formatSSEEvent,
  formatProgressEvent,
  formatResultEvent,
  formatErrorEvent,
  formatHeartbeat,
  JsonRpcErrorCode,
} from "../sse";
import type { ProgressNotification } from "../types";

describe("formatSSEEvent", () => {
  it("should format data as SSE event with correct structure", () => {
    const data = { jsonrpc: "2.0", method: "test" };
    const result = formatSSEEvent(data);

    expect(result).toBe(
      `event: message\ndata: ${JSON.stringify(data)}\n\n`
    );
  });

  it("should include event ID when provided", () => {
    const data = { jsonrpc: "2.0", id: 1, result: {} };
    const result = formatSSEEvent(data, "evt-123");

    expect(result).toBe(
      `id: evt-123\nevent: message\ndata: ${JSON.stringify(data)}\n\n`
    );
  });

  it("should handle special characters in data (newlines)", () => {
    const data = { message: "line1\nline2\nline3" };
    const result = formatSSEEvent(data);

    // JSON.stringify escapes newlines as \n
    expect(result).toContain('"line1\\nline2\\nline3"');
    expect(result).toContain("event: message");
    expect(result).toContain("data: ");
  });

  it("should handle special characters in data (quotes)", () => {
    const data = { message: 'He said "hello"' };
    const result = formatSSEEvent(data);

    // JSON.stringify escapes quotes
    expect(result).toContain('\\"hello\\"');
  });

  it("should handle empty object data", () => {
    const result = formatSSEEvent({});
    expect(result).toBe("event: message\ndata: {}\n\n");
  });

  it("should handle null data", () => {
    const result = formatSSEEvent(null);
    expect(result).toBe("event: message\ndata: null\n\n");
  });

  it("should handle array data", () => {
    const data = [1, 2, 3];
    const result = formatSSEEvent(data);
    expect(result).toBe("event: message\ndata: [1,2,3]\n\n");
  });

  it("should not include id line when id is undefined", () => {
    const result = formatSSEEvent({ test: true });
    expect(result).not.toContain("id:");
  });

  it("should not include id line when id is empty string", () => {
    const result = formatSSEEvent({ test: true }, "");
    expect(result).not.toContain("id:");
  });
});

describe("formatProgressEvent", () => {
  it("should format progress notification correctly", () => {
    const params: ProgressNotification = {
      progressToken: "req-123",
      progress: 2,
    };

    const result = formatProgressEvent(params);
    const parsed = parseSSEData(result);

    expect(parsed.jsonrpc).toBe("2.0");
    expect(parsed.method).toBe("notifications/progress");
    expect(parsed.params.progressToken).toBe("req-123");
    expect(parsed.params.progress).toBe(2);
  });

  it("should include all progress fields", () => {
    const params: ProgressNotification = {
      progressToken: "req-456",
      progress: 3,
      total: 5,
      message: "Executing text-generation node",
      node: {
        nodeId: "node-1",
        nodeLabel: "My Prompt",
        nodeType: "text-generation",
        status: "running",
        timestamp: "2024-01-01T00:00:00Z",
      },
    };

    const result = formatProgressEvent(params);
    const parsed = parseSSEData(result);

    expect(parsed.params.progressToken).toBe("req-456");
    expect(parsed.params.progress).toBe(3);
    expect(parsed.params.total).toBe(5);
    expect(parsed.params.message).toBe("Executing text-generation node");
    expect(parsed.params.node).toEqual({
      nodeId: "node-1",
      nodeLabel: "My Prompt",
      nodeType: "text-generation",
      status: "running",
      timestamp: "2024-01-01T00:00:00Z",
    });
  });

  it("should handle node with success status and output", () => {
    const params: ProgressNotification = {
      progressToken: "req-789",
      progress: 5,
      total: 5,
      node: {
        nodeId: "output-1",
        nodeLabel: "Result",
        nodeType: "preview-output",
        status: "success",
        output: {
          type: "text",
          value: "Generated text output",
        },
        timestamp: "2024-01-01T00:00:05Z",
      },
    };

    const result = formatProgressEvent(params);
    const parsed = parseSSEData(result);

    expect(parsed.params.node.status).toBe("success");
    expect(parsed.params.node.output).toEqual({
      type: "text",
      value: "Generated text output",
    });
  });

  it("should handle node with error status", () => {
    const params: ProgressNotification = {
      progressToken: "req-err",
      progress: 2,
      total: 5,
      node: {
        nodeId: "node-fail",
        nodeLabel: "Failing Node",
        nodeType: "text-generation",
        status: "error",
        error: "API rate limit exceeded",
        timestamp: "2024-01-01T00:00:03Z",
      },
    };

    const result = formatProgressEvent(params);
    const parsed = parseSSEData(result);

    expect(parsed.params.node.status).toBe("error");
    expect(parsed.params.node.error).toBe("API rate limit exceeded");
  });
});

describe("formatResultEvent", () => {
  it("should format successful result with double JSON encoding", () => {
    const result = { status: "completed", outputs: { text: "Hello" } };
    const sseEvent = formatResultEvent("req-123", result);
    const parsed = parseSSEData(sseEvent);

    expect(parsed.jsonrpc).toBe("2.0");
    expect(parsed.id).toBe("req-123");
    expect(parsed.result.content).toHaveLength(1);
    expect(parsed.result.content[0].type).toBe("text");

    // The result is double-encoded
    const innerContent = JSON.parse(parsed.result.content[0].text);
    expect(innerContent.status).toBe("completed");
    expect(innerContent.outputs).toEqual({ text: "Hello" });
  });

  it("should include request ID", () => {
    const sseEvent = formatResultEvent(42, { data: "test" });
    const parsed = parseSSEData(sseEvent);

    expect(parsed.id).toBe(42);
  });

  it("should handle complex nested result", () => {
    const result = {
      status: "completed",
      outputs: {
        "Image Output": {
          type: "image",
          value: "base64data...",
          mimeType: "image/png",
        },
        "Text Output": {
          type: "text",
          value: "Generated caption",
        },
      },
      duration_ms: 1234,
    };

    const sseEvent = formatResultEvent("complex-req", result);
    const parsed = parseSSEData(sseEvent);
    const innerContent = JSON.parse(parsed.result.content[0].text);

    expect(innerContent.outputs["Image Output"].type).toBe("image");
    expect(innerContent.outputs["Text Output"].value).toBe("Generated caption");
    expect(innerContent.duration_ms).toBe(1234);
  });

  it("should handle empty result object", () => {
    const sseEvent = formatResultEvent("empty-req", {});
    const parsed = parseSSEData(sseEvent);
    const innerContent = JSON.parse(parsed.result.content[0].text);

    expect(innerContent).toEqual({});
  });
});

describe("formatErrorEvent", () => {
  it("should format error with code and message", () => {
    const sseEvent = formatErrorEvent(
      "req-123",
      JsonRpcErrorCode.INTERNAL_ERROR,
      "Execution failed"
    );
    const parsed = parseSSEData(sseEvent);

    expect(parsed.jsonrpc).toBe("2.0");
    expect(parsed.id).toBe("req-123");
    expect(parsed.error.code).toBe(-32603);
    expect(parsed.error.message).toBe("Execution failed");
    expect(parsed.error.data).toBeUndefined();
  });

  it("should include optional data field when provided", () => {
    const sseEvent = formatErrorEvent(
      "req-456",
      JsonRpcErrorCode.INVALID_PARAMS,
      "Invalid token format",
      { token: "abc", expected: "12 alphanumeric characters" }
    );
    const parsed = parseSSEData(sseEvent);

    expect(parsed.error.code).toBe(-32602);
    expect(parsed.error.message).toBe("Invalid token format");
    expect(parsed.error.data).toEqual({
      token: "abc",
      expected: "12 alphanumeric characters",
    });
  });

  it("should handle null request ID", () => {
    const sseEvent = formatErrorEvent(
      null,
      JsonRpcErrorCode.PARSE_ERROR,
      "Parse error"
    );
    const parsed = parseSSEData(sseEvent);

    expect(parsed.id).toBeNull();
    expect(parsed.error.code).toBe(-32700);
  });

  it("should handle numeric request ID", () => {
    const sseEvent = formatErrorEvent(
      999,
      JsonRpcErrorCode.METHOD_NOT_FOUND,
      "Method not found"
    );
    const parsed = parseSSEData(sseEvent);

    expect(parsed.id).toBe(999);
    expect(parsed.error.code).toBe(-32601);
  });

  it("should use standard JSON-RPC error codes", () => {
    expect(JsonRpcErrorCode.PARSE_ERROR).toBe(-32700);
    expect(JsonRpcErrorCode.INVALID_REQUEST).toBe(-32600);
    expect(JsonRpcErrorCode.METHOD_NOT_FOUND).toBe(-32601);
    expect(JsonRpcErrorCode.INVALID_PARAMS).toBe(-32602);
    expect(JsonRpcErrorCode.INTERNAL_ERROR).toBe(-32603);
  });

  it("should handle string data", () => {
    const sseEvent = formatErrorEvent(
      "req-str",
      JsonRpcErrorCode.INTERNAL_ERROR,
      "Error occurred",
      "Additional string details"
    );
    const parsed = parseSSEData(sseEvent);

    expect(parsed.error.data).toBe("Additional string details");
  });

  it("should handle array data", () => {
    const sseEvent = formatErrorEvent(
      "req-arr",
      JsonRpcErrorCode.INVALID_PARAMS,
      "Multiple validation errors",
      ["Error 1", "Error 2", "Error 3"]
    );
    const parsed = parseSSEData(sseEvent);

    expect(parsed.error.data).toEqual(["Error 1", "Error 2", "Error 3"]);
  });
});

describe("formatHeartbeat", () => {
  it("should return correctly formatted heartbeat comment", () => {
    const result = formatHeartbeat();

    expect(result).toBe(": heartbeat\n\n");
  });

  it("should start with colon (SSE comment)", () => {
    const result = formatHeartbeat();

    expect(result.startsWith(":")).toBe(true);
  });

  it("should end with double newline", () => {
    const result = formatHeartbeat();

    expect(result.endsWith("\n\n")).toBe(true);
  });

  it("should be a valid SSE comment that is ignored by EventSource", () => {
    // SSE comments start with ":" and contain no "data:", "event:", or "id:" lines
    const result = formatHeartbeat();

    expect(result).not.toContain("data:");
    expect(result).not.toContain("event:");
    expect(result).not.toContain("id:");
  });
});

// Helper function to parse SSE data line from formatted event
function parseSSEData(sseEvent: string): Record<string, unknown> {
  const dataLine = sseEvent
    .split("\n")
    .find((line) => line.startsWith("data: "));
  if (!dataLine) {
    throw new Error("No data line found in SSE event");
  }
  return JSON.parse(dataLine.substring(6));
}
