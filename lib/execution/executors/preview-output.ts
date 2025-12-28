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
    // Output node collects string, image, audio, and code inputs separately
    const stringOutput = ctx.inputs["string"] || "";
    const imageOutput = ctx.inputs["image"] || "";
    const audioOutput = ctx.inputs["audio"] || "";
    const codeOutput = ctx.inputs["code"] || "";

    // Return primary output for backward compatibility (image/audio/code take priority for proper rendering)
    // Individual outputs are also passed for node component display
    const primaryOutput = imageOutput || audioOutput || codeOutput || stringOutput;

    return {
      output: primaryOutput,
      stringOutput,
      imageOutput,
      audioOutput,
      codeOutput,
    };
  },
};
