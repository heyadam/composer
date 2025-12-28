/**
 * Cache Manager for Incremental Node Execution
 *
 * Manages cached execution results with LRU eviction and
 * automatic invalidation when node config or connections change.
 */

import type { Node, Edge } from "@xyflow/react";
import type { ExecuteNodeResult } from "../executors/types";
import type { NodeCacheEntry, CacheValidityResult, CacheStats } from "./types";
import {
  computeConfigHash,
  computeEdgeHash,
  computeInputHashes,
  hashString,
  isNeverCacheable,
  estimateResultSize,
} from "./fingerprint";

const DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Manages execution cache for incremental flow execution.
 */
export class CacheManager {
  private entries = new Map<string, NodeCacheEntry>();
  private maxSizeBytes: number;
  private currentSizeBytes = 0;

  // Stats for debugging
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(maxSizeBytes = DEFAULT_MAX_SIZE_BYTES) {
    this.maxSizeBytes = maxSizeBytes;
  }

  /**
   * Check if a cached result is still valid for the given node state.
   */
  checkValidity(
    nodeId: string,
    node: Node,
    edges: Edge[],
    upstreamOutputs: Record<string, string>
  ): CacheValidityResult {
    const entry = this.entries.get(nodeId);

    if (!entry) {
      return { valid: false, reason: "not_found" };
    }

    // Check config hash
    const currentConfigHash = computeConfigHash(node);
    if (entry.configHash !== currentConfigHash) {
      return { valid: false, reason: "config_changed" };
    }

    // Check edge hash
    const currentEdgeHash = computeEdgeHash(nodeId, edges);
    if (entry.edgeHash !== currentEdgeHash) {
      return { valid: false, reason: "edges_changed" };
    }

    // Check input hashes
    const currentInputHashes = this.computeCurrentInputHashes(
      nodeId,
      edges,
      upstreamOutputs
    );
    for (const [handleId, hash] of Object.entries(entry.inputHashes)) {
      if (currentInputHashes[handleId] !== hash) {
        return { valid: false, reason: "inputs_changed" };
      }
    }
    // Also check if new inputs were added
    for (const handleId of Object.keys(currentInputHashes)) {
      if (!(handleId in entry.inputHashes)) {
        return { valid: false, reason: "inputs_changed" };
      }
    }

    return { valid: true };
  }

  /**
   * Get a cached result if valid, or null if cache miss.
   */
  get(
    nodeId: string,
    node: Node,
    edges: Edge[],
    upstreamOutputs: Record<string, string>
  ): ExecuteNodeResult | null {
    // Never cache certain node types
    if (isNeverCacheable(node.type || "")) {
      this.misses++;
      return null;
    }

    const validity = this.checkValidity(nodeId, node, edges, upstreamOutputs);

    if (validity.valid) {
      this.hits++;
      const entry = this.entries.get(nodeId)!;
      // Update access time for LRU (move to end of Map iteration order)
      // Mutate in place to avoid unnecessary object copying
      entry.cachedAt = Date.now();
      this.entries.delete(nodeId);
      this.entries.set(nodeId, entry);
      return entry.result;
    }

    this.misses++;
    return null;
  }

  /**
   * Store an execution result in the cache.
   */
  set(
    nodeId: string,
    node: Node,
    edges: Edge[],
    inputs: Record<string, string>,
    result: ExecuteNodeResult
  ): void {
    // Don't cache uncacheable types
    if (isNeverCacheable(node.type || "")) {
      return;
    }

    const sizeBytes = estimateResultSize(result);

    // Don't cache entries larger than the entire cache budget
    // (would evict everything and still be the only entry)
    if (sizeBytes > this.maxSizeBytes) {
      return;
    }

    // Evict entries if we would exceed memory limit
    while (
      this.currentSizeBytes + sizeBytes > this.maxSizeBytes &&
      this.entries.size > 0
    ) {
      this.evictOldest();
    }

    // Remove existing entry if updating
    const existing = this.entries.get(nodeId);
    if (existing) {
      this.currentSizeBytes -= existing.sizeBytes;
      this.entries.delete(nodeId);
    }

    const entry: NodeCacheEntry = {
      configHash: computeConfigHash(node),
      edgeHash: computeEdgeHash(nodeId, edges),
      inputHashes: computeInputHashes(inputs),
      result,
      cachedAt: Date.now(),
      sizeBytes,
    };

    this.entries.set(nodeId, entry);
    this.currentSizeBytes += sizeBytes;
  }

  /**
   * Invalidate cache entry for a specific node.
   */
  invalidateNode(nodeId: string): void {
    const entry = this.entries.get(nodeId);
    if (entry) {
      this.currentSizeBytes -= entry.sizeBytes;
      this.entries.delete(nodeId);
    }
  }

  /**
   * Invalidate a node and all its downstream nodes.
   * Uses BFS to traverse the graph.
   */
  invalidateDownstream(nodeId: string, edges: Edge[]): void {
    const toInvalidate = new Set<string>([nodeId]);
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      // Find outgoing edges
      const outgoing = edges.filter((e) => e.source === currentId);
      for (const edge of outgoing) {
        if (!toInvalidate.has(edge.target)) {
          toInvalidate.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    // Invalidate all collected nodes
    for (const id of toInvalidate) {
      this.invalidateNode(id);
    }
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.entries.clear();
    this.currentSizeBytes = 0;
  }

  /**
   * Get cache statistics for debugging.
   */
  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      entries: this.entries.size,
      sizeBytes: this.currentSizeBytes,
    };
  }

  /**
   * Check if a node has a cached entry (regardless of validity).
   */
  has(nodeId: string): boolean {
    return this.entries.has(nodeId);
  }

  /**
   * Compute input hashes from upstream outputs based on edge topology.
   */
  private computeCurrentInputHashes(
    nodeId: string,
    edges: Edge[],
    upstreamOutputs: Record<string, string>
  ): Record<string, string> {
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const hashes: Record<string, string> = {};

    for (const edge of incomingEdges) {
      const handleId = edge.targetHandle || "prompt";
      const outputKey =
        edge.sourceHandle === "done" ? `${edge.source}:done` : edge.source;
      const output = upstreamOutputs[outputKey];

      if (output !== undefined) {
        hashes[handleId] = hashString(output);
      }
    }

    return hashes;
  }

  /**
   * Evict the oldest cache entry (LRU).
   */
  private evictOldest(): void {
    // Map maintains insertion order, so first entry is oldest
    const firstKey = this.entries.keys().next().value;
    if (firstKey) {
      const entry = this.entries.get(firstKey)!;
      this.entries.delete(firstKey);
      this.currentSizeBytes -= entry.sizeBytes;
      this.evictions++;
    }
  }
}
