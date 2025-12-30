import { describe, it, expect } from "vitest";
import { parseRawOutput, transformOutputs } from "../output-parser";

describe("parseRawOutput", () => {
  it("should parse plain text as text type", () => {
    const result = parseRawOutput("Hello world");
    expect(result).toEqual({
      type: "text",
      value: "Hello world",
    });
  });

  it("should parse image JSON output", () => {
    const imageJson = JSON.stringify({
      type: "image",
      value: "base64data...",
      mimeType: "image/png",
    });
    const result = parseRawOutput(imageJson);
    expect(result).toEqual({
      type: "image",
      value: "base64data...",
      mimeType: "image/png",
    });
  });

  it("should default image mimeType to image/png when not provided", () => {
    const imageJson = JSON.stringify({
      type: "image",
      value: "base64data...",
    });
    const result = parseRawOutput(imageJson);
    expect(result.type).toBe("image");
    expect(result.mimeType).toBe("image/png");
  });

  it("should parse webp image output", () => {
    const imageJson = JSON.stringify({
      type: "image",
      value: "webpbase64...",
      mimeType: "image/webp",
    });
    const result = parseRawOutput(imageJson);
    expect(result).toEqual({
      type: "image",
      value: "webpbase64...",
      mimeType: "image/webp",
    });
  });

  it("should parse audio buffer output", () => {
    const audioJson = JSON.stringify({
      type: "buffer",
      buffer: "audiobase64...",
      mimeType: "audio/webm",
    });
    const result = parseRawOutput(audioJson);
    expect(result).toEqual({
      type: "audio",
      value: "audiobase64...",
      mimeType: "audio/webm",
    });
  });

  it("should default audio mimeType to audio/webm when not provided", () => {
    const audioJson = JSON.stringify({
      type: "buffer",
      buffer: "audiobase64...",
    });
    const result = parseRawOutput(audioJson);
    expect(result.type).toBe("audio");
    expect(result.mimeType).toBe("audio/webm");
  });

  it("should parse React component output", () => {
    const reactJson = JSON.stringify({
      type: "react",
      code: "export default function App() { return <div>Hello</div>; }",
    });
    const result = parseRawOutput(reactJson);
    expect(result).toEqual({
      type: "code",
      value: "export default function App() { return <div>Hello</div>; }",
      mimeType: "text/jsx",
    });
  });

  it("should treat unknown JSON structure as text", () => {
    const unknownJson = JSON.stringify({ foo: "bar", baz: 123 });
    const result = parseRawOutput(unknownJson);
    expect(result.type).toBe("text");
    expect(result.value).toBe(unknownJson);
  });

  it("should treat malformed JSON as text", () => {
    const malformed = "{ this is not valid json }";
    const result = parseRawOutput(malformed);
    expect(result).toEqual({
      type: "text",
      value: malformed,
    });
  });

  it("should treat empty string as text", () => {
    const result = parseRawOutput("");
    expect(result).toEqual({
      type: "text",
      value: "",
    });
  });

  it("should handle image with missing value field as text", () => {
    const invalidImage = JSON.stringify({
      type: "image",
      mimeType: "image/png",
      // missing value field
    });
    const result = parseRawOutput(invalidImage);
    expect(result.type).toBe("text");
  });

  it("should handle audio with missing buffer field as text", () => {
    const invalidAudio = JSON.stringify({
      type: "buffer",
      mimeType: "audio/webm",
      // missing buffer field
    });
    const result = parseRawOutput(invalidAudio);
    expect(result.type).toBe("text");
  });
});

describe("transformOutputs", () => {
  it("should transform multiple outputs of different types", () => {
    const rawOutputs = {
      "Text Output": "Hello world",
      "Image Output": JSON.stringify({
        type: "image",
        value: "imgbase64...",
        mimeType: "image/jpeg",
      }),
      "Audio Output": JSON.stringify({
        type: "buffer",
        buffer: "audiobase64...",
        mimeType: "audio/mp4",
      }),
    };

    const result = transformOutputs(rawOutputs);

    expect(result["Text Output"]).toEqual({
      type: "text",
      value: "Hello world",
    });
    expect(result["Image Output"]).toEqual({
      type: "image",
      value: "imgbase64...",
      mimeType: "image/jpeg",
    });
    expect(result["Audio Output"]).toEqual({
      type: "audio",
      value: "audiobase64...",
      mimeType: "audio/mp4",
    });
  });

  it("should handle empty outputs object", () => {
    const result = transformOutputs({});
    expect(result).toEqual({});
  });

  it("should handle empty string output values", () => {
    const result = transformOutputs({ "Empty Output": "" });
    expect(result["Empty Output"]).toEqual({
      type: "text",
      value: "",
    });
  });

  it("should preserve output labels", () => {
    const rawOutputs = {
      "My Custom Label": "some text",
      output_node_123: "more text",
    };

    const result = transformOutputs(rawOutputs);

    expect(Object.keys(result)).toEqual(["My Custom Label", "output_node_123"]);
  });
});
