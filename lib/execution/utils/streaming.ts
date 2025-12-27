/**
 * Stream parsing utilities for different response formats
 */

/**
 * Parsed result from an NDJSON stream (used by Google with thinking enabled)
 */
export interface NdjsonStreamResult {
  output: string;
  reasoning: string;
  rawChunks: string[];
}

/**
 * Parse an NDJSON stream with text and reasoning parts.
 * Used by text-generation with Google's thinking mode.
 */
export async function parseNdjsonStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (output: string, reasoning: string, rawChunks: string[]) => void
): Promise<NdjsonStreamResult> {
  const decoder = new TextDecoder();
  let buffer = "";
  let fullOutput = "";
  let fullReasoning = "";
  const rawChunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        rawChunks.push(line);

        if (data.type === "reasoning") {
          fullReasoning += data.text;
        } else if (data.type === "text") {
          fullOutput += data.text;
        }

        onChunk(fullOutput, fullReasoning, rawChunks);
      } catch (e) {
        console.error("Failed to parse NDJSON line:", e);
      }
    }
  }

  return { output: fullOutput, reasoning: fullReasoning, rawChunks };
}

/**
 * Parsed result from a text stream
 */
export interface TextStreamResult {
  output: string;
  rawChunks: string[];
}

/**
 * Parse a regular text stream.
 * Used by text-generation, react-component, audio-transcription.
 */
export async function parseTextStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (output: string, rawChunks: string[]) => void
): Promise<TextStreamResult> {
  const decoder = new TextDecoder();
  let fullOutput = "";
  const rawChunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    rawChunks.push(chunk);
    fullOutput += chunk;

    onChunk(fullOutput, rawChunks);
  }

  return { output: fullOutput, rawChunks };
}

/**
 * Image data from stream
 */
export interface ImageData {
  type: "partial" | "image";
  value: string;
  mimeType: string;
}

/**
 * Parsed result from an image stream
 */
export interface ImageStreamResult {
  finalImage: ImageData | null;
}

/**
 * Parse an NDJSON image stream with partial and final images.
 * Used by image-generation (OpenAI streaming).
 */
export async function parseImageStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (imageData: ImageData) => void
): Promise<ImageStreamResult> {
  const decoder = new TextDecoder();
  let buffer = "";
  let finalImage: ImageData | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line) as ImageData;
        if (data.type === "partial" || data.type === "image") {
          onChunk(data);
          if (data.type === "image") {
            finalImage = data;
          }
        }
      } catch (e) {
        console.error("Failed to parse image stream line:", e);
      }
    }
  }

  return { finalImage };
}

/**
 * Parse error response from API
 */
export async function parseErrorResponse(response: Response, defaultMessage: string): Promise<string> {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.error || defaultMessage;
  } catch {
    return text || defaultMessage;
  }
}
