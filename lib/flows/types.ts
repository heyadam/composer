import type { SavedFlow } from "@/lib/flow-storage/types";

/**
 * Database record for a flow (metadata stored in Supabase)
 */
export interface FlowRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
  // Live sharing fields (always populated for new flows)
  live_id: string;
  share_token: string;
  last_accessed_at: string;
  allow_public_execute: boolean;
  use_owner_keys: boolean;
  daily_execution_count: number;
  daily_execution_reset: string;
}

/**
 * Database record for a flow node (normalized storage)
 */
export interface FlowNodeRecord {
  id: string;
  flow_id: string;
  type: string;
  position_x: number;
  position_y: number;
  width?: number | null;
  height?: number | null;
  data: Record<string, unknown>;
  private_data: Record<string, unknown>;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Database record for a flow edge (normalized storage)
 */
export interface FlowEdgeRecord {
  id: string;
  flow_id: string;
  source_node_id: string;
  source_handle?: string | null;
  target_node_id: string;
  target_handle?: string | null;
  edge_type?: string;
  data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Live flow data returned by get_live_flow RPC
 */
export interface LiveFlowData {
  flow: {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    live_id: string;
    allow_public_execute: boolean;
    use_owner_keys: boolean;
    created_at: string;
    updated_at: string;
  };
  nodes: FlowNodeRecord[];
  edges: FlowEdgeRecord[];
}

/**
 * Flow item for list display (subset of FlowRecord)
 */
export interface FlowListItem {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
}

/**
 * Response from create/update flow API
 */
export interface FlowSaveResponse {
  success: boolean;
  flow?: FlowRecord;
  error?: string;
}

/**
 * Response from load flow API
 */
export interface FlowLoadResponse {
  success: boolean;
  flow?: SavedFlow;
  metadata?: FlowRecord;
  error?: string;
}

/**
 * Response from list flows API
 */
export interface FlowListResponse {
  success: boolean;
  flows?: FlowListItem[];
  error?: string;
}

/**
 * Response from delete flow API
 */
export interface FlowDeleteResponse {
  success: boolean;
  error?: string;
}
