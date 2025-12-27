/**
 * React Component Node Executor
 *
 * Generates React components using AI with streaming support.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
import { fetchWithTimeout } from "../utils/fetch";
import { buildApiRequestBody } from "../utils/request";
import { parseTextStream, parseErrorResponse } from "../utils/streaming";
import {
  createReactComponentDebugInfo,
  updateDebugInfoChunks,
  finalizeDebugInfo,
} from "../utils/debug";

export const reactComponentExecutor: NodeExecutor = {
  type: "react-component",
  hasPulseOutput: true,
  shouldTrackDownstream: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs, apiKeys, signal, options, onStreamUpdate } = ctx;

    // Get prompt input - from connection or inline textarea
    const hasPromptEdge = "prompt" in inputs;
    const inlineUserPrompt = typeof node.data?.userPrompt === "string" ? node.data.userPrompt : "";
    const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

    // Get system prompt - from connection or inline textarea
    const hasSystemEdge = "system" in inputs;
    const inlineSystemPrompt = typeof node.data?.systemPrompt === "string" ? node.data.systemPrompt : "";
    const effectiveSystemPrompt = hasSystemEdge ? inputs["system"] : inlineSystemPrompt;

    const provider = (node.data.provider as string) || "openai";
    const model = (node.data.model as string) || "gpt-5.2";
    const stylePreset = (node.data.stylePreset as string) || "simple";

    // Build request body
    const baseFields = {
      type: "react-component" as const,
      inputs: { prompt: promptInput, system: effectiveSystemPrompt },
      provider,
      model,
      stylePreset,
    };

    const requestBody = buildApiRequestBody(baseFields, apiKeys, options);

    // Create debug info
    let debugInfo = createReactComponentDebugInfo(
      {
        provider,
        model,
        userPrompt: promptInput,
        systemPrompt: effectiveSystemPrompt,
      },
      requestBody
    );

    // Make API request
    const response = await fetchWithTimeout("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response, "Failed to generate React component");
      debugInfo = finalizeDebugInfo(debugInfo);
      throw new Error(errorMessage);
    }

    if (!response.body) {
      debugInfo = finalizeDebugInfo(debugInfo);
      throw new Error("No response body");
    }

    // Stream the response
    const reader = response.body.getReader();
    let streamChunksReceived = 0;

    const result = await parseTextStream(reader, (output, rawChunks) => {
      streamChunksReceived++;
      debugInfo = updateDebugInfoChunks(debugInfo, streamChunksReceived, rawChunks.join(""));

      // Stream partial code wrapped in react output format
      const partialOutput = JSON.stringify({
        type: "react",
        code: output,
      });
      onStreamUpdate?.(partialOutput, debugInfo);
    });

    debugInfo = finalizeDebugInfo(debugInfo, result.output || "(empty response)");

    if (!result.output.trim()) {
      throw new Error("Model returned empty response.");
    }

    // Wrap final output in react format
    const reactOutput = JSON.stringify({
      type: "react",
      code: result.output,
    });

    return { output: reactOutput, debugInfo };
  },
};
