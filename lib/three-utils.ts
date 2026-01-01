/**
 * Three.js output utility functions
 *
 * Centralized utilities for handling Three.js/R3F output data from threejs-scene nodes.
 * Used by OutputNode, ThreejsSceneNode, and ThreePreview components.
 */

/**
 * Three.js scene data structure for JSON output
 */
export interface ThreejsData {
  type: "threejs";
  code: string;
}

/**
 * Check if output string contains JSON Three.js data
 */
export function isThreejsOutput(output?: string): boolean {
  if (!output) return false;
  try {
    const parsed = JSON.parse(output);
    return parsed.type === "threejs" && typeof parsed.code === "string";
  } catch {
    return false;
  }
}

/**
 * Parse Three.js data from JSON output string
 * Returns null if output is not valid Three.js data
 */
export function parseThreejsOutput(output: string): ThreejsData | null {
  try {
    const parsed = JSON.parse(output);
    if (parsed.type === "threejs" && typeof parsed.code === "string") {
      return {
        type: "threejs",
        code: parsed.code,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract just the code from a Three.js output string
 * Returns undefined if output is not valid Three.js data
 */
export function extractThreejsCode(output: string): string | undefined {
  const data = parseThreejsOutput(output);
  return data?.code;
}
