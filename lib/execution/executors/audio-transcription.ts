/**
 * Audio Transcription Node Executor
 *
 * Transcribes audio input to text using OpenAI's transcription API.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
import { fetchWithTimeout } from "../utils/fetch";
import { buildApiRequestBody } from "../utils/request";
import { parseTextStream } from "../utils/streaming";
import {
  createAudioTranscriptionDebugInfo,
  updateDebugInfoChunks,
  finalizeDebugInfo,
} from "../utils/debug";

export const audioTranscriptionExecutor: NodeExecutor = {
  type: "audio-transcription",
  hasPulseOutput: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs, apiKeys, signal, options, onStreamUpdate } = ctx;

    // Get audio from connected node
    const audioInput = inputs["audio"];
    if (!audioInput) {
      throw new Error("No audio input connected");
    }

    // Parse audio data (AudioEdgeData format from AudioInputNode)
    let audioData: { type: string; buffer: string; mimeType: string };
    try {
      audioData = JSON.parse(audioInput);
      if (audioData.type !== "buffer" || !audioData.buffer) {
        throw new Error("Only buffer-type audio is supported for transcription");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("buffer-type")) throw e;
      throw new Error("Invalid audio input format");
    }

    const model = (node.data.model as string) || "gpt-4o-transcribe";
    const language = inputs["language"] || (node.data.language as string) || undefined;

    // Build request body
    const baseFields = {
      type: "audio-transcription" as const,
      audioBuffer: audioData.buffer,
      audioMimeType: audioData.mimeType,
      model,
      language,
    };

    const requestBody = buildApiRequestBody(baseFields, apiKeys, options);

    // Create debug info
    let debugInfo = createAudioTranscriptionDebugInfo({ model }, requestBody);

    // Make API request
    const response = await fetchWithTimeout("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMsg = "Transcription failed";
      try {
        errorMsg = JSON.parse(text).error || errorMsg;
      } catch {
        // Use default error
      }
      debugInfo = finalizeDebugInfo(debugInfo);
      throw new Error(errorMsg);
    }

    if (!response.body) {
      debugInfo = finalizeDebugInfo(debugInfo);
      throw new Error("No response body");
    }

    // Stream transcript chunks
    const reader = response.body.getReader();
    let streamChunksReceived = 0;

    const result = await parseTextStream(reader, (output) => {
      streamChunksReceived++;
      debugInfo = updateDebugInfoChunks(debugInfo, streamChunksReceived, output);
      onStreamUpdate?.(output, debugInfo);
    });

    debugInfo = finalizeDebugInfo(debugInfo, result.output);

    return { output: result.output, debugInfo };
  },
};
