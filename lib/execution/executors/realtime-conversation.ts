/**
 * Realtime Conversation Node Executor
 *
 * Interactive real-time voice conversation node.
 * Resolves connected instructions input and passes to component for session start.
 * Execution passes through current transcript since the node is interactive.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
import { createRealtimeConversationDebugInfo } from "../utils/debug";

export const realtimeConversationExecutor: NodeExecutor = {
  type: "realtime-conversation",
  hasPulseOutput: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs, onNodeStateChange } = ctx;

    // Resolve instructions from connected input or inline value
    const hasInstructionsEdge = "instructions" in inputs;
    const inlineInstructions = typeof node.data?.instructions === "string" ? node.data.instructions : "";
    const resolvedInstructions = hasInstructionsEdge ? inputs["instructions"] : inlineInstructions;

    // Pass resolved instructions to component before it auto-starts the session
    if (onNodeStateChange && hasInstructionsEdge) {
      onNodeStateChange(node.id, {
        status: "running",
        resolvedInstructions,
      });
    }

    // Realtime node is interactive - execution passes through current transcript
    const transcriptEntries = (node.data.transcript as Array<{ role: string; text: string }>) || [];

    const fullTranscript = transcriptEntries
      .map((e) => `${e.role === "user" ? "User" : "AI"}: ${e.text}`)
      .join("\n");

    return {
      output: fullTranscript || "(No conversation yet)",
      debugInfo: createRealtimeConversationDebugInfo(),
    };
  },
};
