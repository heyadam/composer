/**
 * Three.js Options Node Executor
 *
 * Combines camera, lighting, and interaction settings into a single formatted
 * options string for the 3D Scene node.
 *
 * Priority: Connected inputs take precedence over text field values.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
import type { ThreejsOptionsNodeData } from "@/types/flow";

export const threejsOptionsExecutor: NodeExecutor = {
  type: "threejs-options",
  hasPulseOutput: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { inputs, node } = ctx;
    const data = node.data as ThreejsOptionsNodeData;

    // Collect non-empty sections (connected inputs take precedence over text fields)
    const parts: string[] = [];

    const camera = inputs["camera"] || data.cameraText;
    const light = inputs["light"] || data.lightText;
    const mouse = inputs["mouse"] || data.mouseText;

    if (camera) {
      parts.push(`CAMERA: ${camera}`);
    }
    if (light) {
      parts.push(`LIGHT: ${light}`);
    }
    if (mouse) {
      parts.push(`MOUSE: ${mouse}`);
    }

    // Combine with newlines
    const output = parts.join("\n");

    return { output };
  },
};
