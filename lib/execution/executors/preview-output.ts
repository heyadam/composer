/**
 * Preview Output Node Executor
 *
 * Exit point node that collects and displays flow outputs.
 * Handles string, image, and audio inputs separately.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const previewOutputExecutor: NodeExecutor = {
  type: "preview-output",

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    // Output node collects string, image, and audio inputs separately
    const stringOutput = ctx.inputs["string"] || "";
    const imageOutput = ctx.inputs["image"] || "";
    const audioOutput = ctx.inputs["audio"] || "";

    // Return primary output for backward compatibility (image/audio take priority for proper rendering)
    // Individual outputs are also passed for node component display
    const primaryOutput = imageOutput || audioOutput || stringOutput;

    return {
      output: primaryOutput,
      stringOutput,
      imageOutput,
      audioOutput,
    };
  },
};
