/**
 * Three.js Scene Node Executor
 *
 * Generates Three.js/React Three Fiber scenes using AI with streaming support.
 * Output is JSON-wrapped R3F code that can be rendered in ThreePreview.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
import { fetchWithTimeout } from "../utils/fetch";
import { buildApiRequestBody } from "../utils/request";
import { parseTextStream, parseErrorResponse } from "../utils/streaming";
import {
  createThreejsSceneDebugInfo,
  updateDebugInfoChunks,
  finalizeDebugInfo,
} from "../utils/debug";

export const threejsSceneExecutor: NodeExecutor = {
  type: "threejs-scene",
  hasPulseOutput: true,
  shouldTrackDownstream: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs, apiKeys, signal, options, onStreamUpdate } = ctx;

    // Get prompt input - from connection or inline textarea
    const hasPromptEdge = "prompt" in inputs;
    const inlineUserPrompt = typeof node.data?.userPrompt === "string" ? node.data.userPrompt : "";
    const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

    // Validate prompt input before making API call
    if (!promptInput || promptInput.trim().length === 0) {
      throw new Error("Scene description is required");
    }

    // Get system prompt - from connection or inline textarea
    const hasSystemEdge = "system" in inputs;
    const inlineSystemPrompt = typeof node.data?.systemPrompt === "string" ? node.data.systemPrompt : "";
    const effectiveSystemPrompt = hasSystemEdge ? inputs["system"] : inlineSystemPrompt;

    // Get scene input for variable injection
    const hasSceneEdge = "scene" in inputs;
    const sceneInput = hasSceneEdge ? inputs["scene"] : undefined;

    // Get options input (camera, light, interaction settings)
    const hasOptionsEdge = "options" in inputs;
    const optionsInput = hasOptionsEdge ? inputs["options"] : undefined;

    const provider = (node.data.provider as string) || "anthropic";
    const model = (node.data.model as string) || "claude-sonnet-4-5";

    // Build request body
    const baseFields = {
      type: "threejs-scene" as const,
      inputs: {
        prompt: promptInput,
        system: effectiveSystemPrompt,
        scene: sceneInput,
        options: optionsInput,
      },
      provider,
      model,
    };

    const requestBody = buildApiRequestBody(baseFields, apiKeys, options);

    // Create debug info
    let debugInfo = createThreejsSceneDebugInfo(
      {
        provider,
        model,
        userPrompt: promptInput,
        systemPrompt: effectiveSystemPrompt,
        hasSceneInput: hasSceneEdge,
        hasOptionsInput: hasOptionsEdge,
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
      const errorMessage = await parseErrorResponse(response, "Failed to generate Three.js scene");
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

      // Stream partial code wrapped in threejs output format
      const partialOutput = JSON.stringify({
        type: "threejs",
        code: output,
      });
      onStreamUpdate?.(partialOutput, debugInfo);
    });

    debugInfo = finalizeDebugInfo(debugInfo, result.output || "(empty response)");

    if (!result.output.trim()) {
      throw new Error("Model returned empty response.");
    }

    // Wrap final output in threejs format
    const threejsOutput = JSON.stringify({
      type: "threejs",
      code: result.output,
    });

    return { output: threejsOutput, debugInfo };
  },
};
