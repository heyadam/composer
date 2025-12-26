/**
 * Centralized configuration for autopilot validation.
 * Single source of truth for valid models, node types, and data types.
 * Derives model lists from providers.ts to avoid duplication.
 */

import { PROVIDERS, IMAGE_PROVIDERS } from "@/lib/providers";

// Derive valid text models from providers.ts
export const VALID_TEXT_MODELS: Record<string, string[]> = {
  openai: PROVIDERS.openai.models.map((m) => m.value),
  google: PROVIDERS.google.models.map((m) => m.value),
  anthropic: PROVIDERS.anthropic.models.map((m) => m.value),
};

// Derive valid image models from providers.ts
export const VALID_IMAGE_MODELS: Record<string, string[]> = {
  openai: IMAGE_PROVIDERS.openai.models.map((m) => m.value),
  google: IMAGE_PROVIDERS.google.models.map((m) => m.value),
};

// Valid node types for autopilot actions
export const VALID_NODE_TYPES = [
  "text-input",
  "image-input",
  "audio-input",
  "text-generation",
  "image-generation",
  "ai-logic",
  "preview-output",
  "react-component",
  "comment",
  "realtime-conversation",
  "audio-transcription",
] as const;

export type ValidNodeType = (typeof VALID_NODE_TYPES)[number];

// Valid data types for edge connections
export const VALID_DATA_TYPES = ["string", "image", "response", "audio"] as const;

export type ValidDataType = (typeof VALID_DATA_TYPES)[number];

/**
 * Format model lists for prompt generation.
 * Returns markdown-formatted list of models by provider.
 */
export function formatModelList(models: Record<string, string[]>): string {
  return Object.entries(models)
    .map(
      ([provider, modelList]) =>
        `- ${provider.charAt(0).toUpperCase() + provider.slice(1)}: \`${modelList.join("`, `")}\``
    )
    .join("\n");
}

/**
 * Required fields per node type for validation.
 * Only 'label' is universally required - other fields are optional.
 */
export const NODE_REQUIRED_FIELDS: Record<ValidNodeType, string[]> = {
  "text-input": ["label"],
  "image-input": ["label"],
  "audio-input": ["label"],
  "text-generation": ["label"],
  "image-generation": ["label"],
  "ai-logic": ["label"],
  "preview-output": ["label"],
  "react-component": ["label"],
  comment: ["title"],
  "realtime-conversation": ["label", "voice", "vadMode"],
  "audio-transcription": ["label"],
};

/**
 * Validate node data has required fields for its type.
 */
export function validateNodeData(
  nodeType: string,
  data: Record<string, unknown>
): { valid: boolean; missingFields: string[] } {
  const requiredFields = NODE_REQUIRED_FIELDS[nodeType as ValidNodeType];

  if (!requiredFields) {
    return { valid: false, missingFields: [`Unknown node type: ${nodeType}`] };
  }

  const missingFields = requiredFields.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || value === "";
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
