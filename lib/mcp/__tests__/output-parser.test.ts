import { describe, it, expect } from "vitest";
import {
  parseRawOutput,
  transformOutputs,
  transformToResourceLink,
  transformOutputsToResourceLinks,
} from "../output-parser";
import { isResourceLink, isStructuredOutput } from "../types";

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

// ============================================================================
// Resource Link Transformation Tests
// ============================================================================

describe("transformToResourceLink", () => {
  const jobId = "job_abc123def456ghi7";
  const baseUrl = "https://composer.design";

  it("should convert image output to resource link", () => {
    const output = {
      type: "image" as const,
      value: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      mimeType: "image/png",
    };

    const result = transformToResourceLink("My Image", output, jobId, baseUrl);

    expect(isResourceLink(result)).toBe(true);
    if (isResourceLink(result)) {
      expect(result.type).toBe("resource_link");
      expect(result.uri).toBe(`${baseUrl}/api/mcp/outputs/${jobId}/My%20Image`);
      expect(result.name).toBe("My Image.png");
      expect(result.mimeType).toBe("image/png");
      expect(result.size_bytes).toBeGreaterThan(0);
    }
  });

  it("should convert audio output to resource link", () => {
    const output = {
      type: "audio" as const,
      value: "SGVsbG8gV29ybGQ=", // "Hello World" in base64
      mimeType: "audio/webm",
    };

    const result = transformToResourceLink("Recording", output, jobId, baseUrl);

    expect(isResourceLink(result)).toBe(true);
    if (isResourceLink(result)) {
      expect(result.uri).toBe(`${baseUrl}/api/mcp/outputs/${jobId}/Recording`);
      expect(result.name).toBe("Recording.webm");
      expect(result.mimeType).toBe("audio/webm");
    }
  });

  it("should keep small text output inline", () => {
    const output = {
      type: "text" as const,
      value: "Hello, this is a short text output.",
    };

    const result = transformToResourceLink("Short Text", output, jobId, baseUrl);

    expect(isStructuredOutput(result)).toBe(true);
    expect(result).toEqual(output);
  });

  it("should convert large text output to resource link", () => {
    const longText = "A".repeat(3000); // Over 2000 char threshold
    const output = {
      type: "text" as const,
      value: longText,
    };

    const result = transformToResourceLink("Long Text", output, jobId, baseUrl);

    expect(isResourceLink(result)).toBe(true);
    if (isResourceLink(result)) {
      expect(result.uri).toBe(`${baseUrl}/api/mcp/outputs/${jobId}/Long%20Text`);
      expect(result.name).toBe("Long Text.txt");
      expect(result.description).toContain("3000 chars");
    }
  });

  it("should keep small code output inline", () => {
    const output = {
      type: "code" as const,
      value: "export default function App() { return <div>Hello</div>; }",
      mimeType: "text/jsx",
    };

    const result = transformToResourceLink("Component", output, jobId, baseUrl);

    expect(isStructuredOutput(result)).toBe(true);
    expect(result).toEqual(output);
  });

  it("should convert large code output to resource link", () => {
    const longCode = "// Component code\n".repeat(200); // Over 2000 char threshold
    const output = {
      type: "code" as const,
      value: longCode,
      mimeType: "text/jsx",
    };

    const result = transformToResourceLink("Large Component", output, jobId, baseUrl);

    expect(isResourceLink(result)).toBe(true);
    if (isResourceLink(result)) {
      expect(result.name).toBe("Large Component.jsx");
      expect(result.mimeType).toBe("text/jsx");
      expect(result.description).toContain("Code output");
    }
  });

  it("should URL-encode special characters in output key", () => {
    const output = {
      type: "image" as const,
      value: "base64data...",
      mimeType: "image/png",
    };

    const result = transformToResourceLink(
      "Image with spaces & symbols!",
      output,
      jobId,
      baseUrl
    );

    expect(isResourceLink(result)).toBe(true);
    if (isResourceLink(result)) {
      expect(result.uri).toBe(
        `${baseUrl}/api/mcp/outputs/${jobId}/Image%20with%20spaces%20%26%20symbols!`
      );
    }
  });

  it("should default to image/png for image without mimeType", () => {
    const output = {
      type: "image" as const,
      value: "base64data...",
    };

    const result = transformToResourceLink("Image", output, jobId, baseUrl);

    expect(isResourceLink(result)).toBe(true);
    if (isResourceLink(result)) {
      expect(result.mimeType).toBe("image/png");
      expect(result.name).toBe("Image.png");
    }
  });
});

describe("transformOutputsToResourceLinks", () => {
  const jobId = "job_xyz789abc123def4";
  const baseUrl = "https://example.com";

  it("should transform mixed outputs correctly", () => {
    const outputs = {
      "Small Text": { type: "text" as const, value: "Hello" },
      "Generated Image": {
        type: "image" as const,
        value: "base64imagedata...",
        mimeType: "image/webp",
      },
      "Audio Recording": {
        type: "audio" as const,
        value: "base64audiodata...",
        mimeType: "audio/mp4",
      },
    };

    const result = transformOutputsToResourceLinks(outputs, jobId, baseUrl);

    // Small text stays inline
    expect(isStructuredOutput(result["Small Text"])).toBe(true);
    expect(result["Small Text"]).toEqual(outputs["Small Text"]);

    // Image becomes resource link
    expect(isResourceLink(result["Generated Image"])).toBe(true);

    // Audio becomes resource link
    expect(isResourceLink(result["Audio Recording"])).toBe(true);
  });

  it("should handle empty outputs", () => {
    const result = transformOutputsToResourceLinks({}, jobId, baseUrl);
    expect(result).toEqual({});
  });

  it("should preserve all output keys", () => {
    const outputs = {
      "Output A": { type: "text" as const, value: "A" },
      "Output B": { type: "text" as const, value: "B" },
      "Output C": { type: "image" as const, value: "img...", mimeType: "image/png" },
    };

    const result = transformOutputsToResourceLinks(outputs, jobId, baseUrl);

    expect(Object.keys(result)).toEqual(["Output A", "Output B", "Output C"]);
  });
});

describe("isResourceLink type guard", () => {
  it("should return true for valid resource link", () => {
    const link = {
      type: "resource_link",
      uri: "https://example.com/api/mcp/outputs/job_123/test",
      name: "test.png",
      mimeType: "image/png",
      size_bytes: 1024,
    };
    expect(isResourceLink(link)).toBe(true);
  });

  it("should return false for structured output", () => {
    const output = {
      type: "text",
      value: "Hello",
    };
    expect(isResourceLink(output)).toBe(false);
  });

  it("should return false for null/undefined", () => {
    expect(isResourceLink(null)).toBe(false);
    expect(isResourceLink(undefined)).toBe(false);
  });

  it("should return false for resource link missing required fields", () => {
    expect(isResourceLink({ type: "resource_link" })).toBe(false);
    expect(
      isResourceLink({ type: "resource_link", uri: "https://example.com" })
    ).toBe(false);
  });
});
