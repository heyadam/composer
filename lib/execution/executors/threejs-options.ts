/**
 * Three.js Options Node Executor
 *
 * Combines camera, lighting, and interaction settings into a single formatted
 * options string for the 3D Scene node.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const threejsOptionsExecutor: NodeExecutor = {
  type: "threejs-options",
  hasPulseOutput: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { inputs } = ctx;

    // Collect non-empty sections
    const parts: string[] = [];

    if (inputs["camera"]) {
      parts.push(`CAMERA: ${inputs["camera"]}`);
    }
    if (inputs["light"]) {
      parts.push(`LIGHT: ${inputs["light"]}`);
    }
    if (inputs["mouse"]) {
      parts.push(`MOUSE: ${inputs["mouse"]}`);
    }

    // Combine with newlines
    const output = parts.join("\n");

    return { output };
  },
};
