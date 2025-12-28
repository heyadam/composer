/**
 * Comment Node Executor
 *
 * Annotation-only node that passes through inputs unchanged.
 * Comment nodes are typically not connected to the flow, but if they are,
 * they act as a simple passthrough.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const commentExecutor: NodeExecutor = {
  type: "comment",

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    // Passthrough: return first available input
    const output = ctx.inputs["prompt"] || ctx.inputs["input"] || Object.values(ctx.inputs)[0] || "";
    return { output };
  },
};
