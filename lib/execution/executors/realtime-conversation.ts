/**
 * Realtime Conversation Node Executor
 *
 * Interactive real-time voice conversation node.
 * Execution passes through current transcript since the node is interactive.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
import { createRealtimeConversationDebugInfo } from "../utils/debug";

export const realtimeConversationExecutor: NodeExecutor = {
  type: "realtime-conversation",
  hasPulseOutput: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node } = ctx;

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
