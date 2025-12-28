/**
 * Fingerprint utilities for cache key generation.
 *
 * Computes hashes of node configuration and edge topology to detect
 * when a node's cache entry is still valid.
 */

import type { Node, Edge } from "@xyflow/react";

/**
 * Cache-relevant fields for each node type.
 * Changes to these fields invalidate the node's cache.
 */
const CACHE_RELEVANT_FIELDS: Record<string, string[]> = {
  "text-input": ["inputValue"],
  "image-input": ["uploadedImage"],
  "audio-input": ["audioBuffer", "audioMimeType"],
  "text-generation": [
    "userPrompt",
    "systemPrompt",
    "provider",
    "model",
    "verbosity",
    "thinking",
    "googleThinkingConfig",
    "googleSafetyPreset",
    "imageInput", // Inline image for vision prompts
  ],
  "image-generation": [
    "prompt",
    "provider",
    "model",
    "outputFormat",
    "size",
    "quality",
    "partialImages",
    "aspectRatio",
    "imageInput", // Reference image for image-to-image
  ],
  "ai-logic": ["transformPrompt", "generatedCode"],
  "react-component": [
    "userPrompt",
    "systemPrompt",
    "provider",
    "model",
    "stylePreset",
  ],
  "audio-transcription": ["model", "language"],
  "realtime-conversation": ["instructions", "voice", "vadMode"],
  "preview-output": [],
  comment: [],
};

/**
 * FNV-1a hash function for browser compatibility.
 * Fast and produces good distribution for cache keys.
 */
export function hashString(str: string): string {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0; // FNV prime, keep as unsigned 32-bit
  }
  return hash.toString(36); // Base36 for compact representation
}

/**
 * Compute a hash of the node's cache-relevant configuration.
 */
export function computeConfigHash(node: Node): string {
  const nodeType = node.type || "";
  const relevantFields = CACHE_RELEVANT_FIELDS[nodeType] || [];

  const configObj: Record<string, unknown> = {
    __type: nodeType,
  };

  for (const field of relevantFields) {
    const value = node.data?.[field];
    if (value !== undefined) {
      configObj[field] = value;
    }
  }

  try {
    // Stable JSON serialization (sorted keys)
    const json = JSON.stringify(configObj, Object.keys(configObj).sort());
    return hashString(json);
  } catch {
    // Fallback for non-serializable values (circular refs, etc.)
    // Return unique hash per node to force re-execution
    return hashString(`${nodeType}:${node.id}:${Date.now()}`);
  }
}

/**
 * Compute a hash of the incoming edge topology for a node.
 * Changes to connections invalidate the cache.
 */
export function computeEdgeHash(nodeId: string, edges: Edge[]): string {
  try {
    const incomingEdges = edges
      .filter((e) => e.target === nodeId)
      .map((e) => ({
        source: e.source,
        sourceHandle: e.sourceHandle || "output",
        targetHandle: e.targetHandle || "prompt",
      }))
      .sort((a, b) => {
        // Stable sort: by source, then sourceHandle, then targetHandle
        if (a.source !== b.source) return a.source.localeCompare(b.source);
        if (a.sourceHandle !== b.sourceHandle) {
          return a.sourceHandle.localeCompare(b.sourceHandle);
        }
        return a.targetHandle.localeCompare(b.targetHandle);
      });

    return hashString(JSON.stringify(incomingEdges));
  } catch {
    // Fallback for edge serialization errors
    return hashString(`edges:${nodeId}:${Date.now()}`);
  }
}

/**
 * Compute hashes for each input value by target handle.
 */
export function computeInputHashes(
  inputs: Record<string, string>
): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const [handleId, value] of Object.entries(inputs)) {
    hashes[handleId] = hashString(value);
  }
  return hashes;
}

/**
 * Check if a node type should never be cached.
 * Input nodes and real-time nodes always execute fresh.
 */
export function isNeverCacheable(nodeType: string): boolean {
  // These nodes always require fresh execution
  const neverCache = new Set([
    "audio-input", // Requires user recording
    "realtime-conversation", // Real-time interaction
    "comment", // Not executed
  ]);
  return neverCache.has(nodeType);
}

/**
 * Estimate the memory size of an execution result in bytes.
 */
export function estimateResultSize(result: {
  output?: string;
  reasoning?: string;
  generatedCode?: string;
  codeExplanation?: string;
}): number {
  let size = 0;

  // UTF-16: 2 bytes per character
  if (result.output) size += result.output.length * 2;
  if (result.reasoning) size += result.reasoning.length * 2;
  if (result.generatedCode) size += result.generatedCode.length * 2;
  if (result.codeExplanation) size += result.codeExplanation.length * 2;

  // Object overhead
  size += 200;

  return size;
}
