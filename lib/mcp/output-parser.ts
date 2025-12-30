/**
 * MCP Output Parser
 *
 * Transforms raw flow execution outputs into structured format.
 * Handles detection and parsing of image, audio, and React code outputs.
 */

import type { StructuredOutput } from "./types";

/**
 * Parse a raw output string into a StructuredOutput object.
 * Detects image, audio, and code outputs by attempting JSON parse.
 */
export function parseRawOutput(rawOutput: string): StructuredOutput {
  // Try to parse as JSON to detect structured data
  try {
    const parsed = JSON.parse(rawOutput);

    // Check for image output: { type: "image", value: string, mimeType: string }
    if (parsed.type === "image" && typeof parsed.value === "string") {
      return {
        type: "image",
        value: parsed.value,
        mimeType: parsed.mimeType || "image/png",
      };
    }

    // Check for audio output: { type: "buffer", buffer: string, mimeType: string }
    if (parsed.type === "buffer" && typeof parsed.buffer === "string") {
      return {
        type: "audio",
        value: parsed.buffer,
        mimeType: parsed.mimeType || "audio/webm",
      };
    }

    // Check for React component output: { type: "react", code: string }
    if (parsed.type === "react" && typeof parsed.code === "string") {
      return {
        type: "code",
        value: parsed.code,
        mimeType: "text/jsx",
      };
    }

    // Unknown JSON structure - treat as text
    return {
      type: "text",
      value: rawOutput,
    };
  } catch {
    // Not JSON - plain text output
    return {
      type: "text",
      value: rawOutput,
    };
  }
}

/**
 * Transform a record of raw string outputs to structured outputs.
 */
export function transformOutputs(
  rawOutputs: Record<string, string>
): Record<string, StructuredOutput> {
  return Object.fromEntries(
    Object.entries(rawOutputs).map(([label, rawValue]) => [
      label,
      parseRawOutput(rawValue),
    ])
  );
}
