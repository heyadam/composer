import type { SavedFlow } from "@/lib/flow-storage/types";
import type {
  FlowListResponse,
  FlowSaveResponse,
  FlowLoadResponse,
  FlowDeleteResponse,
  LiveFlowData,
  FlowNodeRecord,
  FlowEdgeRecord,
} from "./types";

/**
 * Response from publish flow API
 */
export interface PublishFlowResponse {
  success: boolean;
  live_id?: string;
  share_token?: string;
  use_owner_keys?: boolean;
  already_published?: boolean;
  error?: string;
}

/**
 * Response from load live flow API
 */
export interface LiveFlowResponse {
  success: boolean;
  flow?: LiveFlowData["flow"];
  nodes?: FlowNodeRecord[];
  edges?: FlowEdgeRecord[];
  error?: string;
}

/**
 * Response from user keys API
 */
export interface UserKeysStatusResponse {
  success: boolean;
  hasOpenai?: boolean;
  hasGoogle?: boolean;
  hasAnthropic?: boolean;
  error?: string;
}

/**
 * Changes to send when updating a live flow
 */
export interface LiveFlowChanges {
  nodes?: FlowNodeRecord[];
  edges?: FlowEdgeRecord[];
  deletedNodeIds?: string[];
  deletedEdgeIds?: string[];
  name?: string;
  description?: string;
  allowPublicExecute?: boolean;
}

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

// ============================================================================
// Live Flow APIs
// ============================================================================

/**
 * Publish a flow (generate live_id + share_token)
 */
export async function publishFlow(id: string): Promise<PublishFlowResponse> {
  try {
    const res = await fetch(`/api/flows/${id}/publish`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to publish flow: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish flow",
    };
  }
}

/**
 * Unpublish a flow (remove live_id + share_token)
 */
export async function unpublishFlow(id: string): Promise<FlowDeleteResponse> {
  try {
    const res = await fetch(`/api/flows/${id}/publish`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to unpublish flow: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unpublish flow",
    };
  }
}

/**
 * Update publish settings (owner only, flow ID authenticated)
 *
 * This uses the owner-authenticated PATCH endpoint, NOT the token-gated route,
 * to prevent collaborators from enabling owner-funded execution.
 */
export async function updatePublishSettings(
  flowId: string,
  settings: {
    useOwnerKeys?: boolean;
    allowPublicExecute?: boolean;
  }
): Promise<FlowDeleteResponse> {
  try {
    const res = await fetch(`/api/flows/${flowId}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update settings",
    };
  }
}

/**
 * Load a live flow by share token
 */
export async function loadLiveFlow(token: string): Promise<LiveFlowResponse> {
  try {
    const res = await fetch(`/api/live/${token}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to load live flow: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load live flow",
    };
  }
}

/**
 * Update a live flow via share token
 */
export async function updateLiveFlow(
  token: string,
  changes: LiveFlowChanges
): Promise<FlowDeleteResponse> {
  try {
    const res = await fetch(`/api/live/${token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to update live flow: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update live flow",
    };
  }
}

// ============================================================================
// User API Keys APIs
// ============================================================================

/**
 * Get stored API key status (which providers have keys stored)
 */
export async function getUserKeysStatus(): Promise<UserKeysStatusResponse> {
  try {
    const res = await fetch("/api/user/keys");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to get keys status: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get keys status",
    };
  }
}

/**
 * Store API keys server-side (encrypted)
 */
export async function storeUserKeys(keys: {
  openai?: string;
  google?: string;
  anthropic?: string;
}): Promise<UserKeysStatusResponse> {
  try {
    const res = await fetch("/api/user/keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keys),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to store keys: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to store keys",
    };
  }
}

/**
 * Delete stored API keys
 */
export async function deleteUserKeys(): Promise<FlowDeleteResponse> {
  try {
    const res = await fetch("/api/user/keys", {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Failed to delete keys: ${res.status}` };
    }
    return await res.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete keys",
    };
  }
}
