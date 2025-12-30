import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock next/server's after function
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    after: vi.fn(),
  };
});

// Mock the tool implementations
vi.mock("../tools", () => ({
  getFlowInfo: vi.fn(),
  runFlow: vi.fn(),
  getRunStatus: vi.fn(),
  createFlowExecutionStream: vi.fn(),
}));

import { POST, GET } from "@/app/api/mcp/route";
import { getFlowInfo, runFlow, getRunStatus, createFlowExecutionStream } from "../tools";

const mockGetFlowInfo = vi.mocked(getFlowInfo);
const mockRunFlow = vi.mocked(runFlow);
const mockGetRunStatus = vi.mocked(getRunStatus);
const mockCreateFlowExecutionStream = vi.mocked(createFlowExecutionStream);

function createRequest(body: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("MCP Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/mcp", () => {
    it("should return server info", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.name).toBe("composer-mcp");
      expect(data.version).toBe("2.0.0");
      expect(data.tools).toEqual(["get_flow_info", "run_flow", "get_run_status"]);
    });
  });

  describe("POST /api/mcp", () => {
    describe("JSON-RPC validation", () => {
      it("should reject invalid jsonrpc version", async () => {
        const request = createRequest({
          jsonrpc: "1.0",
          id: 1,
          method: "tools/list",
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.error.code).toBe(-32600);
        expect(data.error.message).toContain("Invalid Request");
      });

      it("should reject missing method", async () => {
        const request = createRequest({
          jsonrpc: "2.0",
          id: 1,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.error.code).toBe(-32600);
        expect(data.error.message).toContain("Invalid Request");
      });

      it("should handle malformed JSON", async () => {
        const request = new NextRequest("http://localhost:3000/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not valid json",
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error.code).toBe(-32700);
        expect(data.error.message).toBe("Parse error");
      });
    });

    describe("initialize method", () => {
      it("should return protocol info", async () => {
        const request = createRequest({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.result.protocolVersion).toBe("2025-03-26");
        expect(data.result.serverInfo.name).toBe("composer-mcp");
        expect(data.result.capabilities.tools).toEqual({});
      });
    });

    describe("tools/list method", () => {
      it("should return tool definitions", async () => {
        const request = createRequest({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.result.tools).toHaveLength(3);
        expect(data.result.tools.map((t: { name: string }) => t.name)).toEqual([
          "get_flow_info",
          "run_flow",
          "get_run_status",
        ]);
      });
    });

    describe("tools/call method", () => {
      it("should call get_flow_info tool", async () => {
        mockGetFlowInfo.mockResolvedValue({
          name: "Test Flow",
          description: null,
          ownerFunded: true,
          inputs: [{ id: "n1", label: "Input", type: "text-input" }],
          outputs: [{ id: "n2", label: "Output" }],
        });

        const request = createRequest({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "get_flow_info",
            arguments: { token: "abc123DEF456" },
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.result.content[0].type).toBe("text");
        const content = JSON.parse(data.result.content[0].text);
        expect(content.name).toBe("Test Flow");
        expect(mockGetFlowInfo).toHaveBeenCalledWith("abc123DEF456");
      });

      it("should call run_flow tool", async () => {
        mockRunFlow.mockResolvedValue({
          response: {
            job_id: "job_abc123def456ghij",
            status: "running",
            message: "Job created",
            quota_remaining: 99,
          },
          executionPromise: Promise.resolve(),
        });

        const request = createRequest({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "run_flow",
            arguments: { token: "abc123DEF456", inputs: { prompt: "hello" } },
          },
        });

        const response = await POST(request);
        const data = await response.json();

        const content = JSON.parse(data.result.content[0].text);
        expect(content.job_id).toBe("job_abc123def456ghij");
        expect(mockRunFlow).toHaveBeenCalledWith("abc123DEF456", { prompt: "hello" });
      });

      it("should call get_run_status tool", async () => {
        mockGetRunStatus.mockResolvedValue({
          job_id: "job_abc123def456ghij",
          status: "completed",
          message: "Flow completed successfully! The outputs field contains the results.",
          created_at: "2024-01-01T00:00:00Z",
          outputs: { result: { type: "text", value: "Done" } },
        });

        const request = createRequest({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "get_run_status",
            arguments: { job_id: "job_abc123def456ghij" },
          },
        });

        const response = await POST(request);
        const data = await response.json();

        const content = JSON.parse(data.result.content[0].text);
        expect(content.status).toBe("completed");
        expect(mockGetRunStatus).toHaveBeenCalledWith("job_abc123def456ghij", undefined);
      });

      it("should call get_run_status with optional token", async () => {
        mockGetRunStatus.mockResolvedValue({
          job_id: "job_abc123def456ghij",
          status: "completed",
          message: "Flow completed successfully! The outputs field contains the results.",
          created_at: "2024-01-01T00:00:00Z",
          outputs: { result: { type: "text", value: "Done" } },
        });

        const request = createRequest({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "get_run_status",
            arguments: { job_id: "job_abc123def456ghij", token: "abc123DEF456" },
          },
        });

        const response = await POST(request);
        const data = await response.json();

        const content = JSON.parse(data.result.content[0].text);
        expect(content.status).toBe("completed");
        expect(mockGetRunStatus).toHaveBeenCalledWith("job_abc123def456ghij", "abc123DEF456");
      });

      it("should return error for unknown tool", async () => {
        const request = createRequest({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "unknown_tool",
            arguments: {},
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.result.isError).toBe(true);
        expect(data.result.content[0].text).toContain("Unknown tool: unknown_tool");
      });

      it("should handle tool errors gracefully", async () => {
        mockGetFlowInfo.mockRejectedValue(new Error("Flow not found"));

        const request = createRequest({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "get_flow_info",
            arguments: { token: "abc123DEF456" },
          },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.result.isError).toBe(true);
        expect(data.result.content[0].text).toContain("Error: Flow not found");
      });
    });

    describe("notifications", () => {
      it("should handle initialized notification with 204", async () => {
        const request = createRequest({
          jsonrpc: "2.0",
          id: null,
          method: "notifications/initialized",
        });

        const response = await POST(request);

        expect(response.status).toBe(204);
      });
    });

    describe("batch requests", () => {
      it("should handle batch requests", async () => {
        mockGetFlowInfo.mockResolvedValue({
          name: "Test",
          description: null,
          ownerFunded: true,
          inputs: [],
          outputs: [],
        });

        const request = createRequest([
          { jsonrpc: "2.0", id: 1, method: "tools/list" },
          {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: { name: "get_flow_info", arguments: { token: "abc123DEF456" } },
          },
        ]);

        const response = await POST(request);
        const data = await response.json();

        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(2);
        expect(data[0].id).toBe(1);
        expect(data[1].id).toBe(2);
      });

      it("should handle mixed valid/invalid batch requests", async () => {
        const request = createRequest([
          { jsonrpc: "2.0", id: 1, method: "tools/list" },
          { jsonrpc: "1.0", id: 2, method: "invalid" }, // Invalid version
        ]);

        const response = await POST(request);
        const data = await response.json();

        expect(data).toHaveLength(2);
        expect(data[0].result).toBeDefined(); // Valid request succeeded
        expect(data[1].error).toBeDefined(); // Invalid request failed
      });
    });

    describe("unknown methods", () => {
      it("should return error for unknown method", async () => {
        const request = createRequest({
          jsonrpc: "2.0",
          id: 1,
          method: "unknown/method",
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.error.code).toBe(-32603);
        expect(data.error.message).toContain("Unknown method");
      });
    });

    // SSE streaming is currently disabled to prevent context bloat in Cursor
    // These tests are skipped but kept for when SSE is re-enabled
    describe.skip("SSE streaming (disabled)", () => {
      it("should return SSE response when Accept header includes text/event-stream", async () => {
        // Create a mock ReadableStream for the SSE response
        const mockStream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("event: message\ndata: {}\n\n"));
            controller.close();
          },
        });
        mockCreateFlowExecutionStream.mockReturnValue(mockStream);

        const request = createRequest(
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: "run_flow",
              arguments: { token: "abc123DEF456", inputs: { prompt: "hello" } },
            },
          },
          { Accept: "text/event-stream" }
        );

        const response = await POST(request);

        expect(response.headers.get("Content-Type")).toBe("text/event-stream");
        expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
        expect(mockCreateFlowExecutionStream).toHaveBeenCalledWith(
          "abc123DEF456",
          { prompt: "hello" },
          1,
          expect.any(AbortSignal)
        );
        // runFlow should NOT be called for SSE requests
        expect(mockRunFlow).not.toHaveBeenCalled();
      });

      it("should fall back to polling when Accept header does not include text/event-stream", async () => {
        mockRunFlow.mockResolvedValue({
          response: {
            job_id: "job_abc123def456ghij",
            status: "running",
            message: "Job created",
            quota_remaining: 99,
          },
          executionPromise: Promise.resolve(),
        });

        const request = createRequest(
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: "run_flow",
              arguments: { token: "abc123DEF456", inputs: { prompt: "hello" } },
            },
          },
          { Accept: "application/json" }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.headers.get("Content-Type")).toContain("application/json");
        const content = JSON.parse(data.result.content[0].text);
        expect(content.job_id).toBe("job_abc123def456ghij");
        expect(mockRunFlow).toHaveBeenCalled();
        expect(mockCreateFlowExecutionStream).not.toHaveBeenCalled();
      });

      it("should only stream for run_flow tool calls (not get_flow_info)", async () => {
        mockGetFlowInfo.mockResolvedValue({
          name: "Test Flow",
          description: null,
          ownerFunded: true,
          inputs: [{ id: "n1", label: "Input", type: "text-input" }],
          outputs: [{ id: "n2", label: "Output" }],
        });

        const request = createRequest(
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: "get_flow_info",
              arguments: { token: "abc123DEF456" },
            },
          },
          { Accept: "text/event-stream" }
        );

        const response = await POST(request);
        const data = await response.json();

        // Should return JSON response, not SSE
        expect(response.headers.get("Content-Type")).toContain("application/json");
        const content = JSON.parse(data.result.content[0].text);
        expect(content.name).toBe("Test Flow");
        expect(mockGetFlowInfo).toHaveBeenCalledWith("abc123DEF456");
        expect(mockCreateFlowExecutionStream).not.toHaveBeenCalled();
      });

      it("should only stream for run_flow tool calls (not get_run_status)", async () => {
        mockGetRunStatus.mockResolvedValue({
          job_id: "job_abc123def456ghij",
          status: "completed",
          message: "Flow completed successfully! The outputs field contains the results.",
          created_at: "2024-01-01T00:00:00Z",
          outputs: { result: { type: "text", value: "Done" } },
        });

        const request = createRequest(
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: "get_run_status",
              arguments: { job_id: "job_abc123def456ghij" },
            },
          },
          { Accept: "text/event-stream" }
        );

        const response = await POST(request);
        const data = await response.json();

        // Should return JSON response, not SSE
        expect(response.headers.get("Content-Type")).toContain("application/json");
        const content = JSON.parse(data.result.content[0].text);
        expect(content.status).toBe("completed");
        expect(mockGetRunStatus).toHaveBeenCalled();
        expect(mockCreateFlowExecutionStream).not.toHaveBeenCalled();
      });

      it("should not stream for batch requests even with SSE Accept header", async () => {
        mockRunFlow.mockResolvedValue({
          response: {
            job_id: "job_abc123def456ghij",
            status: "running",
            message: "Job created",
          },
          executionPromise: Promise.resolve(),
        });

        // Batch request (array)
        const request = createRequest(
          [
            {
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: {
                name: "run_flow",
                arguments: { token: "abc123DEF456" },
              },
            },
          ],
          { Accept: "text/event-stream" }
        );

        const response = await POST(request);
        const data = await response.json();

        // Should return JSON batch response, not SSE
        expect(Array.isArray(data)).toBe(true);
        expect(response.headers.get("Content-Type")).toContain("application/json");
        expect(mockRunFlow).toHaveBeenCalled();
        expect(mockCreateFlowExecutionStream).not.toHaveBeenCalled();
      });

      it("should not stream for requests with null id", async () => {
        mockRunFlow.mockResolvedValue({
          response: {
            job_id: "job_abc123def456ghij",
            status: "running",
            message: "Job created",
          },
          executionPromise: Promise.resolve(),
        });

        const request = createRequest(
          {
            jsonrpc: "2.0",
            id: null, // null id = notification-style, no response expected
            method: "tools/call",
            params: {
              name: "run_flow",
              arguments: { token: "abc123DEF456" },
            },
          },
          { Accept: "text/event-stream" }
        );

        const response = await POST(request);
        const data = await response.json();

        // Should return JSON response, not SSE (null id means we can't correlate response)
        expect(response.headers.get("Content-Type")).toContain("application/json");
        expect(mockRunFlow).toHaveBeenCalled();
        expect(mockCreateFlowExecutionStream).not.toHaveBeenCalled();
      });

      it("should handle SSE request with empty inputs", async () => {
        const mockStream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("event: message\ndata: {}\n\n"));
            controller.close();
          },
        });
        mockCreateFlowExecutionStream.mockReturnValue(mockStream);

        const request = createRequest(
          {
            jsonrpc: "2.0",
            id: "req-123",
            method: "tools/call",
            params: {
              name: "run_flow",
              arguments: { token: "abc123DEF456" },
            },
          },
          { Accept: "text/event-stream" }
        );

        const response = await POST(request);

        expect(response.headers.get("Content-Type")).toBe("text/event-stream");
        expect(mockCreateFlowExecutionStream).toHaveBeenCalledWith(
          "abc123DEF456",
          {},
          "req-123",
          expect.any(AbortSignal)
        );
      });
    });
  });
});
