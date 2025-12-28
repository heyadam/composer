/**
 * Image Input Node Executor
 *
 * Entry point node that provides image input to the flow.
 * Returns the uploaded image data.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const imageInputExecutor: NodeExecutor = {
  type: "image-input",

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    // Image input node returns its uploaded image data
    return {
      output: (ctx.node.data.uploadedImage as string) || "",
    };
  },
};
