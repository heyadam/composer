import { describe, it, expect, vi } from "vitest";
import {
  parseNdjsonStream,
  parseTextStream,
  parseImageStream,
  parseErrorResponse,
} from "../utils/streaming";

/**
 * Create a mock ReadableStreamDefaultReader that yields the given chunks
 */
function createMockReader(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return {
    read: async () => {
      if (index >= chunks.length) {
        return { done: true, value: undefined };
      }
      const chunk = chunks[index++];
      return { done: false, value: encoder.encode(chunk) };
    },
    cancel: async () => {},
    releaseLock: () => {},
    closed: Promise.resolve(undefined),
  } as ReadableStreamDefaultReader<Uint8Array>;
}

describe("parseNdjsonStream", () => {
  it("parses text chunks from NDJSON stream", async () => {
    const chunks = [
      '{"type":"text","text":"Hello"}\n',
      '{"type":"text","text":" world"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseNdjsonStream(reader, onChunk);

    expect(result.output).toBe("Hello world");
    expect(result.reasoning).toBe("");
    expect(onChunk).toHaveBeenCalledTimes(2);
  });

  it("parses reasoning chunks from NDJSON stream", async () => {
    const chunks = [
      '{"type":"reasoning","text":"Thinking..."}\n',
      '{"type":"text","text":"Answer"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseNdjsonStream(reader, onChunk);

    expect(result.output).toBe("Answer");
    expect(result.reasoning).toBe("Thinking...");
  });

  it("handles mixed text and reasoning", async () => {
    const chunks = [
      '{"type":"reasoning","text":"Step 1"}\n{"type":"reasoning","text":" Step 2"}\n',
      '{"type":"text","text":"Final answer"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseNdjsonStream(reader, onChunk);

    expect(result.output).toBe("Final answer");
    expect(result.reasoning).toBe("Step 1 Step 2");
  });

  it("buffers incomplete lines across chunks", async () => {
    const chunks = [
      '{"type":"text","tex',
      't":"complete"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseNdjsonStream(reader, onChunk);

    expect(result.output).toBe("complete");
  });

  it("skips empty lines", async () => {
    const chunks = [
      '{"type":"text","text":"Hello"}\n\n\n{"type":"text","text":" there"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseNdjsonStream(reader, onChunk);

    expect(result.output).toBe("Hello there");
    expect(onChunk).toHaveBeenCalledTimes(2);
  });

  it("stores raw chunks", async () => {
    const chunks = [
      '{"type":"text","text":"A"}\n{"type":"text","text":"B"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseNdjsonStream(reader, onChunk);

    expect(result.rawChunks).toHaveLength(2);
    expect(result.rawChunks[0]).toBe('{"type":"text","text":"A"}');
  });

  it("handles malformed JSON gracefully", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const chunks = [
      '{"type":"text","text":"Good"}\n',
      'invalid json\n',
      '{"type":"text","text":" data"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseNdjsonStream(reader, onChunk);

    expect(result.output).toBe("Good data");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("ignores unknown type fields", async () => {
    const chunks = [
      '{"type":"unknown","text":"ignored"}\n',
      '{"type":"text","text":"visible"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseNdjsonStream(reader, onChunk);

    expect(result.output).toBe("visible");
    expect(result.reasoning).toBe("");
  });
});

describe("parseTextStream", () => {
  it("accumulates text from stream", async () => {
    const chunks = ["Hello", " ", "world"];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseTextStream(reader, onChunk);

    expect(result.output).toBe("Hello world");
    expect(onChunk).toHaveBeenCalledTimes(3);
  });

  it("stores raw chunks", async () => {
    const chunks = ["chunk1", "chunk2"];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseTextStream(reader, onChunk);

    expect(result.rawChunks).toEqual(["chunk1", "chunk2"]);
  });

  it("calls onChunk with accumulated output", async () => {
    const chunks = ["A", "B", "C"];
    const reader = createMockReader(chunks);
    const outputs: string[] = [];

    await parseTextStream(reader, (output) => outputs.push(output));

    expect(outputs).toEqual(["A", "AB", "ABC"]);
  });

  it("handles empty stream", async () => {
    const reader = createMockReader([]);
    const onChunk = vi.fn();

    const result = await parseTextStream(reader, onChunk);

    expect(result.output).toBe("");
    expect(result.rawChunks).toEqual([]);
    expect(onChunk).not.toHaveBeenCalled();
  });
});

describe("parseImageStream", () => {
  it("parses partial images", async () => {
    const chunks = [
      '{"type":"partial","value":"base64data1","mimeType":"image/png"}\n',
      '{"type":"partial","value":"base64data2","mimeType":"image/png"}\n',
    ];
    const reader = createMockReader(chunks);
    const images: Array<{ type: string; value: string }> = [];

    await parseImageStream(reader, (data) => images.push(data));

    expect(images).toHaveLength(2);
    expect(images[0].type).toBe("partial");
    expect(images[1].value).toBe("base64data2");
  });

  it("captures final image", async () => {
    const chunks = [
      '{"type":"partial","value":"partial1","mimeType":"image/png"}\n',
      '{"type":"image","value":"finalimage","mimeType":"image/png"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseImageStream(reader, onChunk);

    expect(result.finalImage).not.toBeNull();
    expect(result.finalImage?.type).toBe("image");
    expect(result.finalImage?.value).toBe("finalimage");
  });

  it("returns null when no final image", async () => {
    const chunks = [
      '{"type":"partial","value":"partial1","mimeType":"image/png"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseImageStream(reader, onChunk);

    expect(result.finalImage).toBeNull();
  });

  it("buffers incomplete lines", async () => {
    const chunks = [
      '{"type":"image","value":"complete',
      '","mimeType":"image/png"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseImageStream(reader, onChunk);

    expect(result.finalImage?.value).toBe("complete");
  });

  it("ignores unknown types", async () => {
    const chunks = [
      '{"type":"unknown","value":"ignored"}\n',
      '{"type":"image","value":"final","mimeType":"image/png"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseImageStream(reader, onChunk);

    // Should only call for partial and image types
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(result.finalImage?.value).toBe("final");
  });

  it("handles malformed JSON gracefully", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const chunks = [
      '{"type":"partial","value":"good","mimeType":"image/png"}\n',
      'not valid json\n',
      '{"type":"image","value":"final","mimeType":"image/png"}\n',
    ];
    const reader = createMockReader(chunks);
    const onChunk = vi.fn();

    const result = await parseImageStream(reader, onChunk);

    expect(result.finalImage?.value).toBe("final");
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("parseErrorResponse", () => {
  it("extracts error from JSON response", async () => {
    const response = new Response(JSON.stringify({ error: "API limit exceeded" }), {
      status: 400,
    });

    const error = await parseErrorResponse(response, "Default error");

    expect(error).toBe("API limit exceeded");
  });

  it("returns raw text when not JSON", async () => {
    const response = new Response("Plain text error", { status: 500 });

    const error = await parseErrorResponse(response, "Default error");

    expect(error).toBe("Plain text error");
  });

  it("returns default message when response is empty", async () => {
    const response = new Response("", { status: 500 });

    const error = await parseErrorResponse(response, "Default error");

    expect(error).toBe("Default error");
  });

  it("returns default when JSON has no error field", async () => {
    const response = new Response(JSON.stringify({ message: "Not an error field" }), {
      status: 400,
    });

    const error = await parseErrorResponse(response, "Default error");

    expect(error).toBe("Default error");
  });
});
