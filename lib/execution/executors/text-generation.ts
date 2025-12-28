/**
 * Text Generation Node Executor
 *
 * Executes LLM prompts with streaming support.
 * Supports multiple providers (OpenAI, Anthropic, Google) and vision input.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
import { fetchWithTimeout } from "../utils/fetch";
import { buildApiRequestBody } from "../utils/request";
import { parseNdjsonStream, parseTextStream, parseErrorResponse } from "../utils/streaming";
import {
  createTextGenerationDebugInfo,
  updateDebugInfoChunks,
  finalizeDebugInfo,
} from "../utils/debug";
import { resolveImageInput, modelSupportsVision, getVisionCapableModel } from "@/lib/vision";
import type { ProviderId } from "@/lib/providers";

export const textGenerationExecutor: NodeExecutor = {
  type: "text-generation",
  hasPulseOutput: true,
  shouldTrackDownstream: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs, apiKeys, signal, options, onStreamUpdate } = ctx;

    // Get prompt input (the user message) - from connection or inline textarea
    const hasPromptEdge = "prompt" in inputs;
    const inlineUserPrompt = typeof node.data?.userPrompt === "string" ? node.data.userPrompt : "";
    const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

    // Get system prompt - from connection or inline textarea
    const hasSystemEdge = "system" in inputs;
    const inlineSystemPrompt = typeof node.data?.systemPrompt === "string" ? node.data.systemPrompt : "";
    const effectiveSystemPrompt = hasSystemEdge ? inputs["system"] : inlineSystemPrompt;

    // Get image input - from connection or inline upload (connection wins if non-empty)
    const connectedImage = inputs["image"];
    const inlineImageInput = (node.data?.imageInput as string) || "";
    const imageData = resolveImageInput(connectedImage, inlineImageInput);

    const provider = (node.data.provider as string) || "openai";
    let model = (node.data.model as string) || "gpt-5.2";

    // Guard: If image is present but model doesn't support vision, auto-switch or error
    let imageInput: string | undefined;
    if (imageData) {
      if (!modelSupportsVision(provider as ProviderId, model)) {
        const visionModel = getVisionCapableModel(provider as ProviderId, model);
        if (visionModel) {
          model = visionModel;
        } else {
          throw new Error(
            `Model "${model}" does not support vision and no vision-capable model is available for ${provider}`
          );
        }
      }
      imageInput = JSON.stringify(imageData);
    }

    // Build request body
    const baseFields = {
      type: "text-generation" as const,
      inputs: { prompt: promptInput, system: effectiveSystemPrompt },
      provider,
      model,
      verbosity: node.data.verbosity,
      thinking: node.data.thinking,
      googleThinkingConfig: node.data.googleThinkingConfig,
      googleSafetyPreset: node.data.googleSafetyPreset,
      googleStructuredOutputs: node.data.googleStructuredOutputs,
      imageInput,
    };

    const requestBody = buildApiRequestBody(baseFields, apiKeys, options);

    // Create debug info
    let debugInfo = createTextGenerationDebugInfo(
      {
        provider,
        model,
        userPrompt: promptInput,
        systemPrompt: effectiveSystemPrompt,
        hasImage: !!imageInput,
        verbosity: node.data.verbosity as string | undefined,
        thinking: node.data.thinking as boolean | undefined,
        googleThinkingConfig: node.data.googleThinkingConfig as Record<string, unknown> | undefined,
        googleSafetyPreset: node.data.googleSafetyPreset as string | undefined,
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
      const errorMessage = await parseErrorResponse(response, "Failed to execute prompt");
      debugInfo = finalizeDebugInfo(debugInfo);
      throw new Error(errorMessage);
    }

    if (!response.body) {
      debugInfo = finalizeDebugInfo(debugInfo);
      throw new Error("No response body");
    }

    // Check if response is NDJSON (Google with thinking enabled)
    const contentType = response.headers.get("content-type") || "";
    const isNdjson = contentType.includes("application/x-ndjson");

    const reader = response.body.getReader();
    let fullOutput = "";
    let fullReasoning = "";
    let streamChunksReceived = 0;

    if (isNdjson) {
      // Parse NDJSON stream with text and reasoning parts
      const result = await parseNdjsonStream(reader, (output, reasoning, rawChunks) => {
        streamChunksReceived++;
        debugInfo = updateDebugInfoChunks(debugInfo, streamChunksReceived, rawChunks.join("\n"));
        onStreamUpdate?.(output, debugInfo, reasoning);
      });
      fullOutput = result.output;
      fullReasoning = result.reasoning;
    } else {
      // Regular text stream
      const result = await parseTextStream(reader, (output, rawChunks) => {
        streamChunksReceived++;
        debugInfo = updateDebugInfoChunks(debugInfo, streamChunksReceived, rawChunks.join(""));
        onStreamUpdate?.(output, debugInfo);
      });
      fullOutput = result.output;
    }

    debugInfo = finalizeDebugInfo(debugInfo, fullOutput || "(empty response)");

    // Handle empty response from model
    if (!fullOutput.trim()) {
      throw new Error("Model returned empty response. The prompt combination may have confused the model.");
    }

    return {
      output: fullOutput,
      reasoning: fullReasoning || undefined,
      debugInfo,
    };
  },
};
