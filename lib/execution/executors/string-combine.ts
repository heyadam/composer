/**
 * String combine node executor
 *
 * Combines up to 4 input strings into one output string with an optional separator.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";

export const stringCombineExecutor: NodeExecutor = {
  type: "string-combine",
  hasPulseOutput: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs } = ctx;

    // Get separator from node data (default to empty string)
    const separator = typeof node.data?.separator === "string"
      ? node.data.separator
      : "";

    // Collect all connected input values in order
    const parts: string[] = [];

    if (inputs["input1"]) parts.push(inputs["input1"]);
    if (inputs["input2"]) parts.push(inputs["input2"]);
    if (inputs["input3"]) parts.push(inputs["input3"]);
    if (inputs["input4"]) parts.push(inputs["input4"]);

    // Combine with separator
    const output = parts.join(separator);

    return { output };
  },
};
