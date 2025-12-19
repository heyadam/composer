export const PROVIDERS = {
  openai: {
    label: "OpenAI",
    models: [
      { value: "gpt-5.2", label: "GPT-5.2", supportsVerbosity: true, supportsThinking: true },
      { value: "gpt-5-mini", label: "GPT-5 Mini", supportsVerbosity: true, supportsThinking: true },
      { value: "gpt-5-nano", label: "GPT-5 Nano", supportsVerbosity: true, supportsThinking: false },
    ],
  },
  google: {
    label: "Google",
    models: [
      { value: "gemini-3-flash-preview", label: "Gemini 3 Flash", supportsVerbosity: false, supportsThinking: false, supportsThinkingBudget: false, supportsThinkingLevel: true },
      { value: "gemini-3-pro-preview", label: "Gemini 3 Pro", supportsVerbosity: false, supportsThinking: false, supportsThinkingBudget: false, supportsThinkingLevel: true },
    ],
  },
  anthropic: {
    label: "Anthropic",
    models: [
      { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", supportsVerbosity: false, supportsThinking: false },
      { value: "claude-opus-4-5", label: "Claude Opus 4.5", supportsVerbosity: false, supportsThinking: false },
      { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", supportsVerbosity: false, supportsThinking: false },
    ],
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;
export const DEFAULT_PROVIDER: ProviderId = "google";
export const DEFAULT_MODEL = "gemini-3-flash-preview";

export const VERBOSITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export const THINKING_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "on", label: "On" },
] as const;

// Google Gemini 3 thinking level options
// Both Flash and Pro support: low, high
export const GOOGLE_THINKING_LEVEL_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "high", label: "High" },
] as const;

export const GOOGLE_THINKING_BUDGET_OPTIONS = [
  { value: "0", label: "Off" },
  { value: "1024", label: "1K tokens" },
  { value: "4096", label: "4K tokens" },
  { value: "8192", label: "8K tokens" },
  { value: "16384", label: "16K tokens" },
] as const;

export const GOOGLE_HARM_CATEGORY_OPTIONS = [
  { value: "HARM_CATEGORY_HATE_SPEECH", label: "Hate Speech" },
  { value: "HARM_CATEGORY_DANGEROUS_CONTENT", label: "Dangerous Content" },
  { value: "HARM_CATEGORY_HARASSMENT", label: "Harassment" },
  { value: "HARM_CATEGORY_SEXUALLY_EXPLICIT", label: "Sexually Explicit" },
] as const;

export const GOOGLE_HARM_THRESHOLD_OPTIONS = [
  { value: "HARM_BLOCK_THRESHOLD_UNSPECIFIED", label: "Default" },
  { value: "BLOCK_LOW_AND_ABOVE", label: "Block Low+" },
  { value: "BLOCK_MEDIUM_AND_ABOVE", label: "Block Medium+" },
  { value: "BLOCK_ONLY_HIGH", label: "Block High Only" },
  { value: "BLOCK_NONE", label: "Block None" },
] as const;

export const GOOGLE_SAFETY_PRESET_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "strict", label: "Strict" },
  { value: "relaxed", label: "Relaxed" },
  { value: "none", label: "None" },
] as const;

export type GoogleSafetyPreset = (typeof GOOGLE_SAFETY_PRESET_OPTIONS)[number]["value"];

// Helper to convert safety preset to settings array
export function getSafetySettingsFromPreset(preset: GoogleSafetyPreset) {
  const categories = [
    "HARM_CATEGORY_HATE_SPEECH",
    "HARM_CATEGORY_DANGEROUS_CONTENT",
    "HARM_CATEGORY_HARASSMENT",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  ] as const;

  const thresholdMap: Record<GoogleSafetyPreset, string> = {
    default: "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
    strict: "BLOCK_LOW_AND_ABOVE",
    relaxed: "BLOCK_ONLY_HIGH",
    none: "BLOCK_NONE",
  };

  return categories.map((category) => ({
    category,
    threshold: thresholdMap[preset],
  }));
}

// Image generation providers
export const IMAGE_PROVIDERS = {
  openai: {
    label: "OpenAI",
    models: [
      { value: "gpt-5.2", label: "GPT-5.2", supportsPartialImages: true },
    ],
  },
  google: {
    label: "Google",
    models: [
      { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash", supportsPartialImages: false },
      { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro", supportsPartialImages: false },
    ],
  },
} as const;

export type ImageProviderId = keyof typeof IMAGE_PROVIDERS;
export const DEFAULT_IMAGE_PROVIDER: ImageProviderId = "openai";
export const DEFAULT_IMAGE_MODEL = "gpt-5.2";

export const ASPECT_RATIO_OPTIONS = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "4:3", label: "Landscape (4:3)" },
  { value: "9:16", label: "Tall (9:16)" },
  { value: "16:9", label: "Wide (16:9)" },
] as const;

// OpenAI image generation options
export const OUTPUT_FORMAT_OPTIONS = [
  { value: "webp", label: "WebP" },
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
] as const;

export const SIZE_OPTIONS = [
  { value: "1024x1024", label: "Square" },
  { value: "1024x1792", label: "Portrait" },
  { value: "1792x1024", label: "Landscape" },
] as const;

export const QUALITY_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export const PARTIAL_IMAGES_OPTIONS = [
  { value: "0", label: "None" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
] as const;

// Type helpers for option values
export type OutputFormat = (typeof OUTPUT_FORMAT_OPTIONS)[number]["value"];
export type ImageSize = (typeof SIZE_OPTIONS)[number]["value"];
export type ImageQuality = (typeof QUALITY_OPTIONS)[number]["value"];
export type Verbosity = (typeof VERBOSITY_OPTIONS)[number]["value"];
export type AspectRatio = (typeof ASPECT_RATIO_OPTIONS)[number]["value"];
