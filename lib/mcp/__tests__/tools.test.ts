import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase before importing the module
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(),
}));

// Mock the job store
vi.mock("../job-store", () => ({
  jobStore: {
    create: vi.fn(),
    get: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
  },
}));

// Mock encryption
vi.mock("@/lib/encryption", () => ({
  decryptKeys: vi.fn(),
}));

// Mock flow transforms
vi.mock("@/lib/flows/transform", () => ({
  recordToNode: vi.fn((record) => record),
  recordToEdge: vi.fn((record) => record),
}));

// Mock server execution
vi.mock("@/lib/execution/server-execute", () => ({
  executeFlowServer: vi.fn(),
}));

import { getFlowInfo, runFlow, getRunStatus } from "../tools";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { jobStore } from "../job-store";

// Helper to create a chainable mock response
function createMockRpcResponse(data: unknown, error: unknown = null) {
  return {
    data,
    error,
    single: vi.fn().mockResolvedValue({ data, error }),
  };
}

const mockRpc = vi.fn();
const mockSupabase = {
  rpc: mockRpc,
};

const mockCreateServiceRoleClient = vi.mocked(createServiceRoleClient);
const mockJobStore = vi.mocked(jobStore);

describe("MCP Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateServiceRoleClient.mockReturnValue(mockSupabase as never);
  });

  describe("getFlowInfo", () => {
    it("should reject invalid token types", async () => {
      await expect(getFlowInfo(123)).rejects.toThrow("Token must be a string");
      await expect(getFlowInfo(null)).rejects.toThrow("Token must be a string");
      await expect(getFlowInfo(undefined)).rejects.toThrow("Token must be a string");
    });

    it("should reject invalid token format", async () => {
      await expect(getFlowInfo("short")).rejects.toThrow(
        "Invalid token format. Expected 12 alphanumeric characters."
      );
      await expect(getFlowInfo("has-special-chars")).rejects.toThrow(
        "Invalid token format. Expected 12 alphanumeric characters."
      );
      await expect(getFlowInfo("toolongtoken123")).rejects.toThrow(
        "Invalid token format. Expected 12 alphanumeric characters."
      );
    });

    it("should accept valid 12-character alphanumeric tokens", async () => {
      const validToken = "abc123DEF456";

      mockRpc.mockResolvedValue({
        data: {
          flow: { name: "Test Flow", description: "A test", use_owner_keys: true },
          nodes: [
            { id: "n1", type: "text-input", data: { label: "Input" } },
            { id: "n2", type: "preview-output", data: { label: "Output" } },
          ],
        },
        error: null,
      });

      const result = await getFlowInfo(validToken);

      expect(result).toEqual({
        name: "Test Flow",
        description: "A test",
        ownerFunded: true,
        inputs: [{ id: "n1", label: "Input", type: "text-input" }],
        outputs: [{ id: "n2", label: "Output" }],
      });
    });

    it("should throw when flow not found", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      await expect(getFlowInfo("abc123DEF456")).rejects.toThrow(
        "Flow not found or not accessible"
      );
    });
  });

  describe("runFlow", () => {
    beforeEach(() => {
      // Default successful rate limit checks
      mockRpc.mockImplementation((fn: string) => {
        if (fn === "check_minute_rate_limit") {
          return createMockRpcResponse({
            allowed: true,
            current_count: 1,
            reset_at: new Date().toISOString(),
          });
        }
        if (fn === "execute_live_flow_check") {
          return Promise.resolve({
            data: { allowed: true, remaining: 99 },
            error: null,
          });
        }
        if (fn === "log_execution") {
          return Promise.resolve({ error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });
    });

    it("should reject invalid token", async () => {
      await expect(runFlow("invalid")).rejects.toThrow(
        "Invalid token format. Expected 12 alphanumeric characters."
      );
    });

    it("should reject non-object inputs", async () => {
      await expect(runFlow("abc123DEF456", "not an object")).rejects.toThrow(
        "Inputs must be an object"
      );
      await expect(runFlow("abc123DEF456", ["array"])).rejects.toThrow(
        "Inputs must be an object"
      );
    });

    it("should reject non-string input values", async () => {
      await expect(
        runFlow("abc123DEF456", { key: 123 })
      ).rejects.toThrow('Input value for "key" must be a string');
    });

    it("should reject too many inputs", async () => {
      const manyInputs: Record<string, string> = {};
      for (let i = 0; i < 51; i++) {
        manyInputs[`key${i}`] = "value";
      }

      await expect(runFlow("abc123DEF456", manyInputs)).rejects.toThrow(
        "Too many inputs. Maximum 50 allowed."
      );
    });

    it("should reject excessively long input values", async () => {
      const longValue = "x".repeat(100_001);

      await expect(
        runFlow("abc123DEF456", { key: longValue })
      ).rejects.toThrow("exceeds maximum length");
    });

    it("should create job on valid input", async () => {
      const mockJob = {
        id: "job_abc123def456ghij",
        shareToken: "abc123DEF456",
        status: "running" as const,
        inputs: { prompt: "hello" },
        createdAt: new Date(),
      };

      mockJobStore.create.mockResolvedValue(mockJob);

      const { response, executionPromise } = await runFlow("abc123DEF456", { prompt: "hello" });

      expect(response.job_id).toBe("job_abc123def456ghij");
      expect(response.status).toBe("running");
      expect(response.quota_remaining).toBe(99);
      expect(executionPromise).toBeInstanceOf(Promise);
      expect(mockJobStore.create).toHaveBeenCalledWith("abc123DEF456", { prompt: "hello" });
    });

    it("should handle rate limit exceeded", async () => {
      mockRpc.mockImplementation((fn: string) => {
        if (fn === "check_minute_rate_limit") {
          return createMockRpcResponse({
            allowed: false,
            reset_at: new Date(Date.now() + 30000).toISOString(),
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      await expect(runFlow("abc123DEF456")).rejects.toThrow("Rate limit exceeded");
    });

    it("should handle daily quota exceeded", async () => {
      mockRpc.mockImplementation((fn: string) => {
        if (fn === "check_minute_rate_limit") {
          return createMockRpcResponse({ allowed: true });
        }
        if (fn === "execute_live_flow_check") {
          return Promise.resolve({
            data: { allowed: false, reason: "Daily limit reached" },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      await expect(runFlow("abc123DEF456")).rejects.toThrow("Daily limit reached");
    });
  });

  describe("getRunStatus", () => {
    it("should reject invalid job ID types", async () => {
      await expect(getRunStatus(123)).rejects.toThrow("Job ID must be a string");
      await expect(getRunStatus(null)).rejects.toThrow("Job ID must be a string");
    });

    it("should reject invalid job ID format", async () => {
      await expect(getRunStatus("invalid")).rejects.toThrow("Invalid job ID format");
      await expect(getRunStatus("job_short")).rejects.toThrow("Invalid job ID format");
      await expect(getRunStatus("notjob_abc123def456gh")).rejects.toThrow(
        "Invalid job ID format"
      );
    });

    it("should return job status when found", async () => {
      const mockJob = {
        id: "job_abc123def456ghij",
        shareToken: "abc123DEF456",
        status: "completed" as const,
        inputs: {},
        outputs: { result: { type: "text" as const, value: "Hello world" } },
        createdAt: new Date("2024-01-01T00:00:00Z"),
        startedAt: new Date("2024-01-01T00:00:01Z"),
        completedAt: new Date("2024-01-01T00:00:05Z"),
      };

      mockJobStore.get.mockResolvedValue(mockJob);

      const result = await getRunStatus("job_abc123def456ghij");

      expect(result).toEqual({
        job_id: "job_abc123def456ghij",
        status: "completed",
        created_at: "2024-01-01T00:00:00.000Z",
        started_at: "2024-01-01T00:00:01.000Z",
        completed_at: "2024-01-01T00:00:05.000Z",
        outputs: { result: { type: "text", value: "Hello world" } },
        errors: undefined,
      });
    });

    it("should throw when job not found", async () => {
      mockJobStore.get.mockResolvedValue(null);

      await expect(getRunStatus("job_abc123def456ghij")).rejects.toThrow(
        "Job not found: job_abc123def456ghij. Jobs expire after 1 hour."
      );
    });

    it("should accept valid share_token that matches job", async () => {
      const mockJob = {
        id: "job_abc123def456ghij",
        shareToken: "abc123DEF456",
        status: "completed" as const,
        inputs: {},
        outputs: { result: { type: "text" as const, value: "Hello world" } },
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockJobStore.get.mockResolvedValue(mockJob);

      const result = await getRunStatus("job_abc123def456ghij", "abc123DEF456");
      expect(result.status).toBe("completed");
    });

    it("should reject when share_token does not match job", async () => {
      const mockJob = {
        id: "job_abc123def456ghij",
        shareToken: "abc123DEF456",
        status: "completed" as const,
        inputs: {},
        outputs: { result: { type: "text" as const, value: "Hello world" } },
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockJobStore.get.mockResolvedValue(mockJob);

      // Different valid token - should fail with same error as not found (to avoid leaking info)
      await expect(getRunStatus("job_abc123def456ghij", "xyz789XYZ012")).rejects.toThrow(
        "Job not found: job_abc123def456ghij. Jobs expire after 1 hour."
      );
    });

    it("should reject invalid share_token format", async () => {
      await expect(getRunStatus("job_abc123def456ghij", "short")).rejects.toThrow(
        "Invalid token format. Expected 12 alphanumeric characters."
      );
    });
  });
});
