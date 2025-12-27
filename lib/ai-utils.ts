/**
 * Shared AI utilities for model creation and configuration
 */

import { type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";

export interface ApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
}

/**
 * Supported image MIME types for vision models
 */
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

/**
 * Get AI model instance for a provider
 *
 * @param provider - The AI provider (openai, google, anthropic)
 * @param model - The model ID
 * @param apiKeys - Optional API keys (falls back to environment variables)
 */
export function getModel(
  provider: string,
  model: string,
  apiKeys?: ApiKeys
): LanguageModel {
  switch (provider) {
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: apiKeys?.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(model);
    }
    default: {
      const openai = createOpenAI({
        apiKey: apiKeys?.openai || process.env.OPENAI_API_KEY,
      });
      return openai(model);
    }
  }
}
