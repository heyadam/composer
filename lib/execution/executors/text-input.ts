/**
 * Text Input Node Executor
 *
 * Entry point node that provides text input to the flow.
 * Returns the stored inputValue or the first available input.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const textInputExecutor: NodeExecutor = {
  type: "text-input",

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    // Input node uses its stored inputValue or the first available input
    return {
      output: ctx.inputs["prompt"] || ctx.inputs["input"] || "",
    };
  },
};
