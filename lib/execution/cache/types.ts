/**
 * Cache Types for Incremental Node Execution
 *
 * Defines interfaces for caching node execution results to enable
 * incremental re-execution (only run nodes whose inputs changed).
 */

import type { ExecuteNodeResult } from "../executors/types";

/**
 * A cached execution result for a single node.
 */
export interface NodeCacheEntry {
  /** Hash of the node's cache-relevant configuration fields */
  configHash: string;

  /** Hash of incoming edge topology (sources and handles) */
  edgeHash: string;

  /** Hashes of upstream outputs by target handle ID */
  inputHashes: Record<string, string>;

  /** The cached execution result */
  result: ExecuteNodeResult;

  /** Timestamp when this entry was cached */
  cachedAt: number;

  /** Estimated size in bytes (for memory management) */
  sizeBytes: number;
}

/**
 * Result of checking cache validity.
 */
export interface CacheValidityResult {
  valid: boolean;
  reason?: "not_found" | "config_changed" | "edges_changed" | "inputs_changed";
}

/**
 * Cache statistics for debugging.
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  entries: number;
  sizeBytes: number;
}
