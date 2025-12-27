/**
 * Audio Input Node Executor
 *
 * Entry point node that provides audio input to the flow.
 * Can wait for user to record audio if no recording exists.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
import { pendingInputRegistry, type AudioInputData } from "../pending-input-registry";

export const audioInputExecutor: NodeExecutor = {
  type: "audio-input",
  hasPulseOutput: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, edges, onNodeStateChange } = ctx;

    // Audio input node returns its recorded audio buffer as AudioEdgeData
    let audioBuffer = node.data.audioBuffer as string | undefined;
    let audioMimeType = node.data.audioMimeType as string | undefined;
    let recordingDuration = node.data.recordingDuration as number | undefined;

    // If no recording but node is wired, wait for user to record
    if (!audioBuffer && edges && onNodeStateChange) {
      const hasOutgoing = edges.some((e) => e.source === node.id);
      if (hasOutgoing) {
        // Signal that we're waiting for input (triggers auto-recording in UI)
        onNodeStateChange(node.id, { status: "running", awaitingInput: true });

        // Wait for user to complete recording
        const audioData = await pendingInputRegistry.waitForInput<AudioInputData>(node.id);

        // Clear awaiting state immediately after input is received
        onNodeStateChange(node.id, { status: "running", awaitingInput: false });

        // Check for cancellation
        if (!audioData) {
          throw new Error("Recording was cancelled.");
        }

        // Use the data from the completed recording
        audioBuffer = audioData.buffer;
        audioMimeType = audioData.mimeType;
        recordingDuration = audioData.duration;
      }
    }

    if (!audioBuffer) {
      throw new Error("No audio recorded. Please record audio before running.");
    }

    // Return AudioEdgeData format for downstream nodes
    return {
      output: JSON.stringify({
        type: "buffer",
        buffer: audioBuffer,
        mimeType: audioMimeType || "audio/webm",
        duration: recordingDuration,
      }),
    };
  },
};
