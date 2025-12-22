import type { SavedFlow } from "@/lib/flow-storage/types";
import type {
  FlowListResponse,
  FlowSaveResponse,
  FlowLoadResponse,
  FlowDeleteResponse,
} from "./types";

/**
 * List all flows for the current user
 */
export async function listFlows(): Promise<FlowListResponse> {
  try {
    const res = await fetch("/api/flows");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to list flows: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list flows",
    };
  }
}

/**
 * Create a new flow
 */
export async function createFlow(
  flow: SavedFlow
): Promise<FlowSaveResponse> {
  try {
    const res = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flow }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to create flow: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create flow",
    };
  }
}

/**
 * Load a flow by ID
 */
export async function loadFlow(id: string): Promise<FlowLoadResponse> {
  try {
    const res = await fetch(`/api/flows/${id}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to load flow: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load flow",
    };
  }
}

/**
 * Update an existing flow
 */
export async function updateFlow(
  id: string,
  flow: SavedFlow
): Promise<FlowSaveResponse> {
  try {
    const res = await fetch(`/api/flows/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flow }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to update flow: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update flow",
    };
  }
}

/**
 * Delete a flow by ID
 */
export async function deleteFlow(id: string): Promise<FlowDeleteResponse> {
  try {
    const res = await fetch(`/api/flows/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to delete flow: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete flow",
    };
  }
}
