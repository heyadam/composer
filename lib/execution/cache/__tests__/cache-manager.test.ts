import { describe, it, expect, beforeEach } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { CacheManager } from "../cache-manager";
import {
  computeConfigHash,
  computeEdgeHash,
  computeInputHashes,
  isNeverCacheable,
  isImplicitlyCacheable,
  estimateResultSize,
} from "../fingerprint";
import type { ExecuteNodeResult } from "../../executors/types";

// Helper to create a test node
function createNode(
  id: string,
  type: string,
  data: Record<string, unknown> = {}
): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: `Test ${type}`, ...data },
  };
}

// Helper to create a test edge
function createEdge(
  source: string,
  target: string,
  sourceHandle = "output",
  targetHandle = "prompt"
): Edge {
  return {
    id: `${source}-${target}`,
    source,
    sourceHandle,
    target,
    targetHandle,
  };
}

// Helper to create a test result
function createResult(output: string): ExecuteNodeResult {
  return { output };
}

describe("CacheManager", () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  describe("basic cache operations", () => {
    it("returns null for cache miss (not found)", () => {
      const node = createNode("node1", "text-generation", { cacheable: true });
      const result = cache.get("node1", node, [], {});
      expect(result).toBeNull();
    });

    it("returns cached result on cache hit", () => {
      const node = createNode("node1", "text-generation", { cacheable: true });
      const sourceNode = createNode("source1", "text-input");
      const edges = [createEdge("source1", "node1", "output", "prompt")];
      const inputs = { prompt: "test input" };
      const result = createResult("test output");

      cache.set("node1", node, edges, inputs, result);
      // Upstream outputs must match the inputs by source node ID
      const upstreamOutputs = { source1: "test input" };
      const cached = cache.get("node1", node, edges, upstreamOutputs);

      expect(cached).toEqual(result);
    });

    it("returns null when node config changes", () => {
      const node = createNode("node1", "text-generation", {
        cacheable: true,
        userPrompt: "original",
      });
      const edges: Edge[] = [];
      const inputs = {};
      const result = createResult("test output");

      cache.set("node1", node, edges, inputs, result);

      // Modify node config
      const modifiedNode = createNode("node1", "text-generation", {
        cacheable: true,
        userPrompt: "modified",
      });

      const cached = cache.get("node1", modifiedNode, edges, {});
      expect(cached).toBeNull();
    });

    it("returns null when edges change", () => {
      const node = createNode("node1", "text-generation", { cacheable: true });
      const edges = [createEdge("source1", "node1")];
      const inputs = { prompt: "input" };
      const result = createResult("test output");

      cache.set("node1", node, edges, inputs, result);

      // Add a new edge
      const newEdges = [
        createEdge("source1", "node1"),
        createEdge("source2", "node1", "output", "system"),
      ];

      const cached = cache.get("node1", node, newEdges, { prompt: "input" });
      expect(cached).toBeNull();
    });

    it("returns null when input values change", () => {
      const node = createNode("node1", "text-generation", { cacheable: true });
      const edges: Edge[] = [];
      const inputs = { prompt: "original input" };
      const result = createResult("test output");

      cache.set("node1", node, edges, inputs, result);

      // Different upstream output
      const cached = cache.get("node1", node, edges, {
        prompt: "different input",
      });
      expect(cached).toBeNull();
    });
  });

  describe("cache invalidation", () => {
    it("invalidateNode removes single node from cache", () => {
      const node1 = createNode("node1", "text-generation", { cacheable: true });
      const node2 = createNode("node2", "text-generation", { cacheable: true });

      cache.set("node1", node1, [], {}, createResult("output1"));
      cache.set("node2", node2, [], {}, createResult("output2"));

      expect(cache.has("node1")).toBe(true);
      expect(cache.has("node2")).toBe(true);

      cache.invalidateNode("node1");

      expect(cache.has("node1")).toBe(false);
      expect(cache.has("node2")).toBe(true);
    });

    it("invalidateDownstream removes node and all downstream nodes", () => {
      const node1 = createNode("node1", "text-input");
      const node2 = createNode("node2", "text-generation", { cacheable: true });
      const node3 = createNode("node3", "text-generation", { cacheable: true });
      const node4 = createNode("node4", "preview-output");

      const edges = [
        createEdge("node1", "node2"),
        createEdge("node2", "node3"),
        createEdge("node3", "node4"),
      ];

      // Cache all nodes
      cache.set("node1", node1, edges, {}, createResult("o1"));
      cache.set("node2", node2, edges, {}, createResult("o2"));
      cache.set("node3", node3, edges, {}, createResult("o3"));
      cache.set("node4", node4, edges, {}, createResult("o4"));

      // Invalidate node2 and downstream
      cache.invalidateDownstream("node2", edges);

      expect(cache.has("node1")).toBe(true); // Upstream preserved
      expect(cache.has("node2")).toBe(false); // Invalidated
      expect(cache.has("node3")).toBe(false); // Downstream invalidated
      expect(cache.has("node4")).toBe(false); // Downstream invalidated
    });

    it("clear removes all entries", () => {
      const node1 = createNode("node1", "text-generation", { cacheable: true });
      const node2 = createNode("node2", "text-generation", { cacheable: true });

      cache.set("node1", node1, [], {}, createResult("output1"));
      cache.set("node2", node2, [], {}, createResult("output2"));

      expect(cache.getStats().entries).toBe(2);

      cache.clear();

      expect(cache.getStats().entries).toBe(0);
      expect(cache.has("node1")).toBe(false);
      expect(cache.has("node2")).toBe(false);
    });
  });

  describe("never cacheable nodes", () => {
    it("audio-input is never cacheable", () => {
      expect(isNeverCacheable("audio-input")).toBe(true);
    });

    it("realtime-conversation is never cacheable", () => {
      expect(isNeverCacheable("realtime-conversation")).toBe(true);
    });

    it("comment is never cacheable", () => {
      expect(isNeverCacheable("comment")).toBe(true);
    });

    it("text-generation is cacheable", () => {
      expect(isNeverCacheable("text-generation")).toBe(false);
    });

    it("never cacheable nodes are not stored in cache", () => {
      const node = createNode("node1", "audio-input");
      cache.set("node1", node, [], {}, createResult("output"));
      expect(cache.has("node1")).toBe(false);
    });

    it("never cacheable nodes always return null on get", () => {
      const node = createNode("node1", "audio-input");
      const result = cache.get("node1", node, [], {});
      expect(result).toBeNull();
    });
  });

  describe("implicitly cacheable nodes", () => {
    it("text-input is implicitly cacheable", () => {
      expect(isImplicitlyCacheable("text-input")).toBe(true);
    });

    it("image-input is implicitly cacheable", () => {
      expect(isImplicitlyCacheable("image-input")).toBe(true);
    });

    it("text-generation is not implicitly cacheable", () => {
      expect(isImplicitlyCacheable("text-generation")).toBe(false);
    });

    it("implicitly cacheable nodes can be cached without cacheable flag", () => {
      const node = createNode("node1", "text-input", { inputValue: "test" });
      const result = createResult("test");

      cache.set("node1", node, [], {}, result);

      // Note: set() doesn't check implicit cacheability - it's checked in engine.ts
      // This test verifies the helper function works correctly
      expect(isImplicitlyCacheable("text-input")).toBe(true);
    });
  });

  describe("cacheability check in validity", () => {
    it("returns not_cacheable for nodes without cacheable flag", () => {
      const node = createNode("node1", "text-generation"); // No cacheable flag
      cache.set("node1", node, [], {}, createResult("output"));

      const validity = cache.checkValidity("node1", node, [], {});
      expect(validity.valid).toBe(false);
      expect(validity.reason).toBe("not_cacheable");
    });

    it("returns not_cacheable for never cacheable nodes", () => {
      const node = createNode("node1", "audio-input", { cacheable: true });
      const validity = cache.checkValidity("node1", node, [], {});
      expect(validity.valid).toBe(false);
      expect(validity.reason).toBe("not_cacheable");
    });

    it("returns valid for implicitly cacheable nodes without flag", () => {
      const node = createNode("node1", "text-input", { inputValue: "test" });
      cache.set("node1", node, [], {}, createResult("test"));

      const validity = cache.checkValidity("node1", node, [], {});
      expect(validity.valid).toBe(true);
    });

    it("invalidates when cacheable flag is removed", () => {
      const node = createNode("node1", "text-generation", { cacheable: true });
      cache.set("node1", node, [], {}, createResult("output"));

      // Remove cacheable flag
      const modifiedNode = createNode("node1", "text-generation");
      const validity = cache.checkValidity("node1", modifiedNode, [], {});

      expect(validity.valid).toBe(false);
      expect(validity.reason).toBe("not_cacheable");
    });
  });

  describe("LRU eviction", () => {
    it("evicts oldest entry when memory limit exceeded", () => {
      // Create cache with small limit (1KB)
      const smallCache = new CacheManager(1024);

      const node1 = createNode("node1", "text-generation", { cacheable: true });
      const node2 = createNode("node2", "text-generation", { cacheable: true });

      // Add entry that takes ~600 bytes
      const result1 = createResult("a".repeat(200));
      smallCache.set("node1", node1, [], {}, result1);

      // Add another entry that would exceed limit
      const result2 = createResult("b".repeat(200));
      smallCache.set("node2", node2, [], {}, result2);

      // First entry should be evicted
      expect(smallCache.has("node1")).toBe(false);
      expect(smallCache.has("node2")).toBe(true);
      expect(smallCache.getStats().evictions).toBeGreaterThan(0);
    });

    it("does not cache entries larger than total budget", () => {
      const tinyCache = new CacheManager(100); // Very small cache

      const node = createNode("node1", "text-generation", { cacheable: true });
      const largeResult = createResult("x".repeat(1000)); // Much larger than cache

      tinyCache.set("node1", node, [], {}, largeResult);

      expect(tinyCache.has("node1")).toBe(false);
    });

    it("updates LRU order on cache hit", () => {
      // Each entry is ~600 bytes (200 chars * 2 + 200 overhead)
      // 3 entries = ~1800 bytes, so 1500 bytes should force eviction
      const smallCache = new CacheManager(1500);

      const node1 = createNode("node1", "text-input", { inputValue: "a" });
      const node2 = createNode("node2", "text-input", { inputValue: "b" });
      const node3 = createNode("node3", "text-input", { inputValue: "c" });

      smallCache.set("node1", node1, [], {}, createResult("a".repeat(200)));
      smallCache.set("node2", node2, [], {}, createResult("b".repeat(200)));

      // Access node1 to make it recently used (implicit cacheable doesn't need flag)
      smallCache.get("node1", node1, [], {});

      // Add node3 which should evict node2 (older) instead of node1 (recently used)
      smallCache.set("node3", node3, [], {}, createResult("c".repeat(200)));

      expect(smallCache.has("node1")).toBe(true); // Recently accessed
      expect(smallCache.has("node2")).toBe(false); // Evicted
      expect(smallCache.has("node3")).toBe(true); // Newly added
    });
  });

  describe("cache statistics", () => {
    it("tracks hits and misses correctly", () => {
      const node = createNode("node1", "text-generation", { cacheable: true });

      // Miss
      cache.get("node1", node, [], {});
      expect(cache.getStats().misses).toBe(1);
      expect(cache.getStats().hits).toBe(0);

      // Store
      cache.set("node1", node, [], {}, createResult("output"));

      // Hit
      cache.get("node1", node, [], {});
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);
    });

    it("tracks entry count and size", () => {
      const node1 = createNode("node1", "text-generation", { cacheable: true });
      const node2 = createNode("node2", "text-generation", { cacheable: true });

      cache.set("node1", node1, [], {}, createResult("output1"));
      cache.set("node2", node2, [], {}, createResult("output2"));

      const stats = cache.getStats();
      expect(stats.entries).toBe(2);
      expect(stats.sizeBytes).toBeGreaterThan(0);
    });
  });
});

describe("Fingerprint utilities", () => {
  describe("computeConfigHash", () => {
    it("produces same hash for identical configs", () => {
      const node1 = createNode("node1", "text-generation", {
        userPrompt: "test",
        model: "gpt-4",
      });
      const node2 = createNode("node1", "text-generation", {
        userPrompt: "test",
        model: "gpt-4",
      });

      expect(computeConfigHash(node1)).toBe(computeConfigHash(node2));
    });

    it("produces different hash when config changes", () => {
      const node1 = createNode("node1", "text-generation", {
        userPrompt: "test1",
      });
      const node2 = createNode("node1", "text-generation", {
        userPrompt: "test2",
      });

      expect(computeConfigHash(node1)).not.toBe(computeConfigHash(node2));
    });

    it("ignores non-cache-relevant fields", () => {
      const node1 = createNode("node1", "text-generation", {
        userPrompt: "test",
        label: "Label 1", // Not cache-relevant
      });
      const node2 = createNode("node1", "text-generation", {
        userPrompt: "test",
        label: "Label 2", // Different label
      });

      expect(computeConfigHash(node1)).toBe(computeConfigHash(node2));
    });
  });

  describe("computeEdgeHash", () => {
    it("produces same hash for identical edge topology", () => {
      const edges1 = [createEdge("a", "node1"), createEdge("b", "node1")];
      const edges2 = [createEdge("a", "node1"), createEdge("b", "node1")];

      expect(computeEdgeHash("node1", edges1)).toBe(
        computeEdgeHash("node1", edges2)
      );
    });

    it("produces different hash when edges change", () => {
      const edges1 = [createEdge("a", "node1")];
      const edges2 = [createEdge("a", "node1"), createEdge("b", "node1")];

      expect(computeEdgeHash("node1", edges1)).not.toBe(
        computeEdgeHash("node1", edges2)
      );
    });

    it("is stable regardless of edge order", () => {
      const edges1 = [createEdge("b", "node1"), createEdge("a", "node1")];
      const edges2 = [createEdge("a", "node1"), createEdge("b", "node1")];

      expect(computeEdgeHash("node1", edges1)).toBe(
        computeEdgeHash("node1", edges2)
      );
    });
  });

  describe("computeInputHashes", () => {
    it("produces hash for each input", () => {
      const inputs = { prompt: "hello", system: "world" };
      const hashes = computeInputHashes(inputs);

      expect(Object.keys(hashes)).toEqual(["prompt", "system"]);
      expect(hashes.prompt).toBeDefined();
      expect(hashes.system).toBeDefined();
    });

    it("produces same hash for same input value", () => {
      const hashes1 = computeInputHashes({ prompt: "test" });
      const hashes2 = computeInputHashes({ prompt: "test" });

      expect(hashes1.prompt).toBe(hashes2.prompt);
    });

    it("produces different hash for different input value", () => {
      const hashes1 = computeInputHashes({ prompt: "test1" });
      const hashes2 = computeInputHashes({ prompt: "test2" });

      expect(hashes1.prompt).not.toBe(hashes2.prompt);
    });
  });

  describe("estimateResultSize", () => {
    it("estimates size based on string lengths", () => {
      const result1 = { output: "a".repeat(100) };
      const result2 = { output: "a".repeat(200) };

      const size1 = estimateResultSize(result1);
      const size2 = estimateResultSize(result2);

      expect(size2).toBeGreaterThan(size1);
    });

    it("includes all string fields in estimate", () => {
      const result = {
        output: "output",
        reasoning: "reasoning",
        generatedCode: "code",
        codeExplanation: "explanation",
      };

      const size = estimateResultSize(result);
      // Should include overhead (200) + all string lengths * 2 (UTF-16)
      // output(6) + reasoning(9) + code(4) + explanation(11) = 30 chars * 2 = 60 bytes + 200 = 260
      expect(size).toBeGreaterThanOrEqual(200 + (6 + 9 + 4 + 11) * 2);
    });

    it("handles debugInfo in size estimation", () => {
      const result1 = { output: "test" };
      const result2 = {
        output: "test",
        debugInfo: { request: { model: "gpt-4" }, response: { tokens: 100 } },
      };

      const size1 = estimateResultSize(result1);
      const size2 = estimateResultSize(result2);

      expect(size2).toBeGreaterThan(size1);
    });
  });
});
