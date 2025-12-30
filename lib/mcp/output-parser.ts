/**
 * MCP Output Parser
 *
 * Transforms raw flow execution outputs into structured format.
 * Handles detection and parsing of image, audio, and React code outputs.
 *
 * Also provides resource link transformation to prevent context bloat
 * by replacing large binary outputs with fetchable URLs.
 */

import type { StructuredOutput, ResourceLink, OutputContent } from "./types";

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

// ============================================================================
// Resource Link Transformation
// ============================================================================

/**
 * Thresholds for when to use resource links vs inline content.
 * Binary data (image, audio) always uses resource links to avoid context bloat.
 * Text/code uses resource links only when exceeding the threshold.
 */
const RESOURCE_LINK_THRESHOLDS = {
  /** Text outputs over this size (chars) become resource links */
  TEXT_THRESHOLD: 2000,
  /** Code outputs over this size (chars) become resource links */
  CODE_THRESHOLD: 2000,
} as const;

/**
 * Get file extension for a MIME type
 */
function getExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "text/jsx": "jsx",
    "text/plain": "txt",
  };
  return mimeToExt[mimeType] || "bin";
}

/**
 * Calculate the size in bytes of a structured output.
 * For base64-encoded binary data, calculates the decoded size.
 */
function getOutputSizeBytes(output: StructuredOutput): number {
  if (output.type === "image" || output.type === "audio") {
    // Base64 to bytes: 4 chars = 3 bytes (roughly)
    return Math.floor((output.value.length * 3) / 4);
  }
  // Text: UTF-8 byte length
  return Buffer.byteLength(output.value, "utf-8");
}

/**
 * Transform a single structured output to a resource link if appropriate.
 *
 * Binary outputs (image, audio) always become resource links.
 * Text/code outputs only become resource links if over threshold.
 *
 * @param key - The output key (label)
 * @param output - The structured output to potentially transform
 * @param jobId - The job ID for constructing the fetch URL
 * @param baseUrl - The base URL of the API (e.g., "https://composer.design")
 * @returns Either a ResourceLink or the original StructuredOutput
 */
export function transformToResourceLink(
  key: string,
  output: StructuredOutput,
  jobId: string,
  baseUrl: string
): OutputContent {
  const mimeType =
    output.mimeType ||
    (output.type === "image"
      ? "image/png"
      : output.type === "audio"
        ? "audio/webm"
        : output.type === "code"
          ? "text/jsx"
          : "text/plain");

  const sizeBytes = getOutputSizeBytes(output);
  const extension = getExtension(mimeType);

  // Binary outputs always use resource links
  if (output.type === "image" || output.type === "audio") {
    // URL-encode the key to handle spaces and special characters
    const encodedKey = encodeURIComponent(key);
    const uri = `${baseUrl}/api/mcp/outputs/${jobId}/${encodedKey}`;

    return {
      type: "resource_link",
      uri,
      name: `${key}.${extension}`,
      mimeType,
      size_bytes: sizeBytes,
    };
  }

  // Text/code: only use resource links if over threshold
  const threshold =
    output.type === "code"
      ? RESOURCE_LINK_THRESHOLDS.CODE_THRESHOLD
      : RESOURCE_LINK_THRESHOLDS.TEXT_THRESHOLD;

  if (output.value.length > threshold) {
    const encodedKey = encodeURIComponent(key);
    const uri = `${baseUrl}/api/mcp/outputs/${jobId}/${encodedKey}`;

    return {
      type: "resource_link",
      uri,
      name: `${key}.${extension}`,
      mimeType,
      size_bytes: sizeBytes,
      description: `${output.type === "code" ? "Code" : "Text"} output (${output.value.length} chars)`,
    };
  }

  // Small text/code: return inline
  return output;
}

/**
 * Transform a record of structured outputs to use resource links where appropriate.
 *
 * This prevents context bloat in MCP clients by replacing large binary data
 * with fetchable URLs while keeping small text outputs inline.
 *
 * @param outputs - Record of structured outputs from flow execution
 * @param jobId - The job ID for constructing fetch URLs
 * @param baseUrl - The base URL of the API (e.g., "https://composer.design")
 * @returns Record of OutputContent (mix of ResourceLinks and StructuredOutputs)
 */
export function transformOutputsToResourceLinks(
  outputs: Record<string, StructuredOutput>,
  jobId: string,
  baseUrl: string
): Record<string, OutputContent> {
  return Object.fromEntries(
    Object.entries(outputs).map(([key, output]) => [
      key,
      transformToResourceLink(key, output, jobId, baseUrl),
    ])
  );
}
