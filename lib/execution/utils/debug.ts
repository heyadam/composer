/**
 * Debug info utilities for tracking API call metadata
 */

import type { DebugInfo } from "../types";
import { redactRequestBody } from "./request";

export interface TextGenerationDebugParams {
  provider: string;
  model: string;
  userPrompt: string;
  systemPrompt: string;
  hasImage: boolean;
  verbosity?: string;
  thinking?: boolean;
  googleThinkingConfig?: Record<string, unknown>;
  googleSafetyPreset?: string;
}

export interface ImageGenerationDebugParams {
  provider: string;
  model: string;
  imagePrompt: string;
  hasSourceImage: boolean;
  size: string;
  quality: string;
  aspectRatio: string;
  outputFormat: string;
  partialImages: number;
}

export interface ReactComponentDebugParams {
  provider: string;
  model: string;
  userPrompt: string;
  systemPrompt: string;
}

export interface AudioTranscriptionDebugParams {
  model: string;
}

export interface ThreejsSceneDebugParams {
  provider: string;
  model: string;
  userPrompt: string;
  systemPrompt: string;
  hasSceneInput: boolean;
}

/**
 * Create initial debug info for text generation
 */
export function createTextGenerationDebugInfo(
  params: TextGenerationDebugParams,
  requestBody: Record<string, unknown>
): DebugInfo {
  return {
    startTime: Date.now(),
    request: {
      type: "text-generation",
      provider: params.provider,
      model: params.model,
      userPrompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      hasImage: params.hasImage,
      verbosity: params.verbosity,
      thinking: params.thinking,
      googleThinkingConfig: params.googleThinkingConfig,
      googleSafetyPreset: params.googleSafetyPreset,
    },
    streamChunksReceived: 0,
    rawRequestBody: JSON.stringify(redactRequestBody(requestBody), null, 2),
  };
}

/**
 * Create initial debug info for image generation
 */
export function createImageGenerationDebugInfo(
  params: ImageGenerationDebugParams,
  requestBody: Record<string, unknown>
): DebugInfo {
  return {
    startTime: Date.now(),
    request: {
      type: "image-generation",
      provider: params.provider,
      model: params.model,
      imagePrompt: params.imagePrompt,
      hasSourceImage: params.hasSourceImage,
      size: params.size,
      quality: params.quality,
      aspectRatio: params.aspectRatio,
      outputFormat: params.outputFormat,
      partialImages: params.partialImages,
    },
    streamChunksReceived: 0,
    rawRequestBody: JSON.stringify(redactRequestBody(requestBody), null, 2),
  };
}

/**
 * Create initial debug info for React component generation
 */
export function createReactComponentDebugInfo(
  params: ReactComponentDebugParams,
  requestBody: Record<string, unknown>
): DebugInfo {
  return {
    startTime: Date.now(),
    request: {
      type: "react-component",
      provider: params.provider,
      model: params.model,
      userPrompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
    },
    streamChunksReceived: 0,
    rawRequestBody: JSON.stringify(redactRequestBody(requestBody), null, 2),
  };
}

/**
 * Create initial debug info for audio transcription
 */
export function createAudioTranscriptionDebugInfo(
  params: AudioTranscriptionDebugParams,
  requestBody: Record<string, unknown>
): DebugInfo {
  return {
    startTime: Date.now(),
    request: {
      type: "audio-transcription",
      model: params.model,
    },
    streamChunksReceived: 0,
    rawRequestBody: JSON.stringify(redactRequestBody(requestBody), null, 2),
  };
}

/**
 * Create initial debug info for Three.js scene generation
 */
export function createThreejsSceneDebugInfo(
  params: ThreejsSceneDebugParams,
  requestBody: Record<string, unknown>
): DebugInfo {
  return {
    startTime: Date.now(),
    request: {
      type: "threejs-scene",
      provider: params.provider,
      model: params.model,
      userPrompt: params.userPrompt,
      systemPrompt: params.systemPrompt,
      hasSceneInput: params.hasSceneInput,
    },
    streamChunksReceived: 0,
    rawRequestBody: JSON.stringify(redactRequestBody(requestBody), null, 2),
  };
}

/**
 * Create debug info for realtime conversation (minimal, as it's interactive)
 */
export function createRealtimeConversationDebugInfo(): DebugInfo {
  return {
    startTime: Date.now(),
    endTime: Date.now(),
    request: {
      type: "realtime-conversation",
    },
  };
}

/**
 * Update debug info with stream chunk count
 */
export function updateDebugInfoChunks(
  debugInfo: DebugInfo,
  chunksReceived: number,
  rawResponseBody?: string
): DebugInfo {
  return {
    ...debugInfo,
    streamChunksReceived: chunksReceived,
    rawResponseBody,
  };
}

/**
 * Finalize debug info with end time
 */
export function finalizeDebugInfo(
  debugInfo: DebugInfo,
  rawResponseBody?: string
): DebugInfo {
  return {
    ...debugInfo,
    endTime: Date.now(),
    rawResponseBody: rawResponseBody || debugInfo.rawResponseBody,
  };
}
