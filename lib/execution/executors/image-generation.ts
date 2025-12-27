/**
 * Image Generation Node Executor
 *
 * Generates images using AI models with streaming support for partial images.
 * Supports multiple providers (OpenAI, Google) and source image input.
 */

import type { NodeExecutor, ExecutionContext, ExecuteNodeResult } from "./types";
import { fetchWithTimeout, IMAGE_GENERATION_TIMEOUT_MS } from "../utils/fetch";
import { buildApiRequestBody } from "../utils/request";
import { parseImageStream } from "../utils/streaming";
import {
  createImageGenerationDebugInfo,
  updateDebugInfoChunks,
  finalizeDebugInfo,
} from "../utils/debug";

export const imageGenerationExecutor: NodeExecutor = {
  type: "image-generation",
  hasPulseOutput: true,
  shouldTrackDownstream: true,

  async execute(ctx: ExecutionContext): Promise<ExecuteNodeResult> {
    const { node, inputs, apiKeys, signal, options, onStreamUpdate } = ctx;

    const prompt = typeof node.data?.prompt === "string" ? node.data.prompt : "";
    const promptInput = inputs["prompt"] || "";
    // Get source image from connected input or inline upload
    const imageInput = inputs["image"] || (node.data.imageInput as string) || "";
    const provider = (node.data.provider as string) || "openai";
    const model = (node.data.model as string) || "gpt-5.2";

    const outputFormat = (node.data.outputFormat as string) || "webp";
    const size = (node.data.size as string) || "1024x1024";
    const quality = (node.data.quality as string) || "low";
    const partialImages = (node.data.partialImages as number) ?? 3;
    const aspectRatio = (node.data.aspectRatio as string) || "1:1";

    // Build request body
    const baseFields = {
      type: "image-generation" as const,
      prompt,
      provider,
      model,
      outputFormat,
      size,
      quality,
      partialImages,
      aspectRatio,
      input: promptInput,
      imageInput,
    };

    const requestBody = buildApiRequestBody(baseFields, apiKeys, options);

    // Create debug info
    let debugInfo = createImageGenerationDebugInfo(
      {
        provider,
        model,
        imagePrompt: prompt + (promptInput ? ` | Input: ${promptInput}` : ""),
        hasSourceImage: !!imageInput,
        size,
        quality,
        aspectRatio,
        outputFormat,
        partialImages,
      },
      requestBody
    );

    // Make API request with extended timeout for image generation
    const response = await fetchWithTimeout(
      "/api/execute",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal,
      },
      IMAGE_GENERATION_TIMEOUT_MS
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Image generation API error response:", text);
      debugInfo = finalizeDebugInfo(debugInfo);
      try {
        const data = JSON.parse(text);
        console.error("Image generation error details:", data);
        throw new Error(data.error || "Image generation failed");
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== "Image generation failed") {
          throw parseError;
        }
        console.error("Failed to parse error response:", parseError);
        throw new Error("Image generation failed");
      }
    }

    // Check if response is JSON (Google) or streaming (OpenAI)
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // Non-streaming JSON response (Google)
      const data = await response.json();
      debugInfo = finalizeDebugInfo(debugInfo);
      if (data.type === "image" && data.value) {
        const imageOutput = JSON.stringify({
          type: "image",
          value: data.value,
          mimeType: data.mimeType,
        });
        onStreamUpdate?.(imageOutput, debugInfo);
        return { output: imageOutput, debugInfo };
      }
      throw new Error(data.error || "No image generated");
    }

    // Streaming response (OpenAI)
    if (!response.body) {
      debugInfo = finalizeDebugInfo(debugInfo);
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    let streamChunksReceived = 0;

    const result = await parseImageStream(reader, (imageData) => {
      streamChunksReceived++;
      debugInfo = updateDebugInfoChunks(debugInfo, streamChunksReceived);

      // Update with partial or final image
      const imageOutput = JSON.stringify({
        type: "image",
        value: imageData.value,
        mimeType: imageData.mimeType,
      });
      onStreamUpdate?.(imageOutput, debugInfo);
    });

    debugInfo = finalizeDebugInfo(debugInfo);

    if (!result.finalImage) {
      throw new Error("No final image received");
    }

    return {
      output: JSON.stringify({
        type: "image",
        value: result.finalImage.value,
        mimeType: result.finalImage.mimeType,
      }),
      debugInfo,
    };
  },
};
