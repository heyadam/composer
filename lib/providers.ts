export const PROVIDERS = {
  openai: {
    label: "OpenAI",
    models: [
      { value: "gpt-5", label: "GPT-5", supportsVerbosity: true, supportsThinking: true },
      { value: "gpt-5-mini", label: "GPT-5 Mini", supportsVerbosity: true, supportsThinking: true },
      { value: "gpt-5-nano", label: "GPT-5 Nano", supportsVerbosity: true, supportsThinking: false },
    ],
  },
  google: {
    label: "Google Gemini",
    models: [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", supportsVerbosity: false, supportsThinking: false },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", supportsVerbosity: false, supportsThinking: false },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", supportsVerbosity: false, supportsThinking: false },
    ],
  },
  anthropic: {
    label: "Anthropic",
    models: [
      { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", supportsVerbosity: false, supportsThinking: false },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", supportsVerbosity: false, supportsThinking: false },
    ],
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;
export const DEFAULT_PROVIDER: ProviderId = "openai";
export const DEFAULT_MODEL = "gpt-5";

export const VERBOSITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export const THINKING_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "on", label: "On" },
] as const;

// Image generation providers
export const IMAGE_PROVIDERS = {
  openai: {
    label: "OpenAI",
    models: [
      { value: "gpt-5", label: "GPT-5", supportsPartialImages: true },
    ],
  },
  google: {
    label: "Google Gemini",
    models: [
      { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash", supportsPartialImages: false },
      { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro", supportsPartialImages: false },
    ],
  },
} as const;

export type ImageProviderId = keyof typeof IMAGE_PROVIDERS;
export const DEFAULT_IMAGE_PROVIDER: ImageProviderId = "openai";
export const DEFAULT_IMAGE_MODEL = "gpt-5";

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
