/**
 * Text Input Node Executor
 *
 * Entry point node that provides text input to the flow.
 * Reads from node.data.inputValue (the user's typed input).
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const textInputExecutor: NodeExecutor = {
  type: "text-input",

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, context } = ctx;

    // Read from node's stored inputValue
    const inputValue = typeof node.data?.inputValue === "string" ? node.data.inputValue : "";

    // Store in context for potential downstream reference
    context[`userInput_${node.id}`] = inputValue;

    return {
      output: inputValue,
    };
  },
};
