/**
 * Preview Output Node Executor
 *
 * Exit point node that collects and displays flow outputs.
 * Handles string, image, audio, code, and 3D scene inputs separately.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const previewOutputExecutor: NodeExecutor = {
  type: "preview-output",

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    // Output node collects string, image, audio, code, and three inputs separately
    // Also check "prompt" for backward compatibility with legacy edges that don't have targetHandle
    const stringOutput = ctx.inputs["string"] || ctx.inputs["prompt"] || "";
    const imageOutput = ctx.inputs["image"] || "";
    const audioOutput = ctx.inputs["audio"] || "";
    const codeOutput = ctx.inputs["code"] || "";
    const threeOutput = ctx.inputs["three"] || "";

    // Return primary output for backward compatibility (rich outputs take priority for proper rendering)
    // Individual outputs are also passed for node component display
    const primaryOutput = threeOutput || imageOutput || audioOutput || codeOutput || stringOutput;

    return {
      output: primaryOutput,
      stringOutput,
      imageOutput,
      audioOutput,
      codeOutput,
      threeOutput,
    };
  },
};
