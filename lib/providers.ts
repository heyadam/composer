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
