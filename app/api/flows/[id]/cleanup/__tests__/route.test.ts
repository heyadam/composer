import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

// Mock Supabase client
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

// Chain mocks for select query
const mockSelectChain = {
  eq: vi.fn().mockReturnThis(),
  single: () => mockSingle(),
};

// Chain mocks for delete query
const mockDeleteChain = {
  eq: vi.fn().mockReturnThis(),
};

// Chain mocks for update query
const mockUpdateChain = {
  eq: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => {
      if (table === "flows") {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              eq: () => ({
                single: () => mockSingle(),
              }),
            }),
          }),
          delete: () => ({
            eq: (col: string, val: string) => ({
              eq: () => mockDelete(),
            }),
          }),
          update: () => ({
            eq: (col: string, val: string) => ({
              eq: () => mockUpdate(),
            }),
          }),
        };
      }
      return {};
    },
    storage: {
      from: () => ({
        remove: (paths: string[]) => mockRemove(paths),
      }),
    },
  }),
}));

// Helper to create mock request
function createMockRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/flows/flow-123/cleanup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// Helper for route params
const mockParams = { params: Promise.resolve({ id: "flow-123" }) };

describe("POST /api/flows/[id]/cleanup", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  // Helper to create a flow record with a specific updated_at time
  const createMockFlowRecord = (updatedSecondsAgo: number = 10) => ({
    name: "Untitled",
    live_id: "ABCD",
    storage_path: "flows/user-123/flow-123.json",
    updated_at: new Date(Date.now() - updatedSecondsAgo * 1000).toISOString(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Date.now to a fixed value for consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("authentication", () => {
    it("should skip cleanup when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest({ nodeCount: 0 });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe("skipped");
      expect(data.reason).toBe("no_auth");
    });

    it("should skip cleanup when auth error occurs", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Auth failed"),
      });

      const request = createMockRequest({ nodeCount: 0 });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe("skipped");
      expect(data.reason).toBe("no_auth");
    });
  });

  describe("request validation", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should return 400 for invalid JSON body", async () => {
      const request = new NextRequest(
        "http://localhost/api/flows/flow-123/cleanup",
        {
          method: "POST",
          body: "not valid json",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid request body");
    });

    it("should return 400 when nodeCount is missing", async () => {
      const request = createMockRequest({});
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("nodeCount is required");
    });

    it("should return 400 when nodeCount is not a number", async () => {
      const request = createMockRequest({ nodeCount: "five" });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("nodeCount is required");
    });
  });

  describe("flow lookup", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should skip when flow not found", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });

      const request = createMockRequest({ nodeCount: 0 });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe("skipped");
      expect(data.reason).toBe("not_found");
    });

    it("should skip when flow is already named", async () => {
      mockSingle.mockResolvedValue({
        data: { ...createMockFlowRecord(), name: "My Saved Flow" },
        error: null,
      });

      const request = createMockRequest({ nodeCount: 5 });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe("skipped");
      expect(data.reason).toBe("already_named");
    });

    it("should skip when flow was recently updated", async () => {
      // Flow updated 1 second ago (within 3 second grace period)
      mockSingle.mockResolvedValue({
        data: createMockFlowRecord(1), // 1 second ago
        error: null,
      });

      const request = createMockRequest({ nodeCount: 5 });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe("skipped");
      expect(data.reason).toBe("recently_updated");
    });
  });

  describe("empty flow deletion", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: createMockFlowRecord(10), // 10 seconds ago - old enough
        error: null,
      });
    });

    it("should delete empty flow", async () => {
      mockRemove.mockResolvedValue({ error: null });
      mockDelete.mockResolvedValue({ error: null });

      const request = createMockRequest({ nodeCount: 0 });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe("deleted");
      expect(mockRemove).toHaveBeenCalledWith(["flows/user-123/flow-123.json"]);
    });

    it("should continue deletion even if storage cleanup fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockRemove.mockResolvedValue({
        error: { message: "Storage error" },
      });
      mockDelete.mockResolvedValue({ error: null });

      const request = createMockRequest({ nodeCount: 0 });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe("deleted");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete flow storage (orphaned file):",
        expect.objectContaining({
          flowId: "flow-123",
          storagePath: "flows/user-123/flow-123.json",
        })
      );

      consoleSpy.mockRestore();
    });

    it("should return 500 if flow deletion fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockRemove.mockResolvedValue({ error: null });
      mockDelete.mockResolvedValue({
        error: { message: "Delete failed" },
      });

      const request = createMockRequest({ nodeCount: 0 });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to delete flow");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("non-empty flow rename", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: createMockFlowRecord(10), // 10 seconds ago - old enough
        error: null,
      });
    });

    it("should rename non-empty flow to draft", async () => {
      mockUpdate.mockResolvedValue({ error: null });

      const request = createMockRequest({ nodeCount: 5 });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe("renamed");
      expect(data.name).toBe("Draft - ABCD"); // live_id from createMockFlowRecord
    });

    it("should return 500 if rename fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockUpdate.mockResolvedValue({
        error: { message: "Update failed" },
      });

      const request = createMockRequest({ nodeCount: 5 });
      const response = await POST(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to rename flow");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
