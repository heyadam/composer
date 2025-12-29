import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

// Mock Supabase client
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => ({
          single: () => mockSingle(),
        }),
      }),
    }),
  }),
}));

describe("GET /api/flows/current", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when auth error occurs", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Auth failed"),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("get or create flow", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should return existing flow when one exists", async () => {
      const existingFlow = {
        id: "flow-456",
        user_id: "user-123",
        name: "My Flow",
        live_id: "ABCD",
        share_token: "abc123def456",
        storage_path: "flows/user-123/flow-456.json",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        last_accessed_at: "2024-01-01T00:00:00Z",
        use_owner_keys: false,
      };

      mockRpc.mockResolvedValue({
        data: [{ id: "flow-456", is_new: false }],
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: existingFlow,
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.flow).toEqual(existingFlow);
      expect(data.isNew).toBe(false);
      expect(mockRpc).toHaveBeenCalledWith("get_or_create_current_flow", {
        p_user_id: "user-123",
      });
    });

    it("should create new flow when none exists", async () => {
      const newFlow = {
        id: "flow-789",
        user_id: "user-123",
        name: "Untitled Flow",
        live_id: "WXYZ",
        share_token: "xyz789abc123",
        storage_path: "flows/user-123/flow-789.json",
        created_at: "2024-01-02T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        last_accessed_at: "2024-01-02T00:00:00Z",
        use_owner_keys: false,
      };

      mockRpc.mockResolvedValue({
        data: [{ id: "flow-789", is_new: true }],
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: newFlow,
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.flow).toEqual(newFlow);
      expect(data.isNew).toBe(true);
    });
  });

  describe("error handling", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should return 500 when RPC fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to get current flow");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should return 500 when RPC returns empty result", async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No flow returned");
    });

    it("should return 500 when RPC returns null", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No flow returned");
    });

    it("should return 500 when fetching flow record fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockRpc.mockResolvedValue({
        data: [{ id: "flow-123", is_new: false }],
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Failed to fetch" },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to fetch flow record");
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
