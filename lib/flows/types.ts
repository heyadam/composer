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
