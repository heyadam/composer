import { describe, it, expect } from "vitest";
import type { Node } from "@xyflow/react";
import type { ExecutionContext } from "../executors/types";

import { textInputExecutor } from "../executors/text-input";
import { imageInputExecutor } from "../executors/image-input";
import { audioInputExecutor } from "../executors/audio-input";
import { previewOutputExecutor } from "../executors/preview-output";
import { commentExecutor } from "../executors/comment";

function createMockContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    node: {
      id: "test-node",
      type: "test",
      position: { x: 0, y: 0 },
      data: {},
    } as Node,
    inputs: {},
    context: {},
    ...overrides,
  };
}

describe("text-input executor", () => {
  it("has correct type", () => {
    expect(textInputExecutor.type).toBe("text-input");
  });

  it("returns inputValue from node data", async () => {
    const ctx = createMockContext({
      node: {
        id: "text-1",
        type: "text-input",
        position: { x: 0, y: 0 },
        data: { inputValue: "Hello, world!" },
      } as Node,
    });

    const result = await textInputExecutor.execute(ctx);

    expect(result.output).toBe("Hello, world!");
  });

  it("returns empty string when inputValue is not set", async () => {
    const ctx = createMockContext({
      node: {
        id: "text-1",
        type: "text-input",
        position: { x: 0, y: 0 },
        data: {},
      } as Node,
    });

    const result = await textInputExecutor.execute(ctx);

    expect(result.output).toBe("");
  });

  it("returns empty string when inputValue is not a string", async () => {
    const ctx = createMockContext({
      node: {
        id: "text-1",
        type: "text-input",
        position: { x: 0, y: 0 },
        data: { inputValue: 123 },
      } as Node,
    });

    const result = await textInputExecutor.execute(ctx);

    expect(result.output).toBe("");
  });

  it("stores input in context", async () => {
    const context: Record<string, unknown> = {};
    const ctx = createMockContext({
      node: {
        id: "text-abc",
        type: "text-input",
        position: { x: 0, y: 0 },
        data: { inputValue: "stored value" },
      } as Node,
      context,
    });

    await textInputExecutor.execute(ctx);

    expect(context["userInput_text-abc"]).toBe("stored value");
  });
});

describe("image-input executor", () => {
  it("has correct type", () => {
    expect(imageInputExecutor.type).toBe("image-input");
  });

  it("returns uploadedImage from node data", async () => {
    const ctx = createMockContext({
      node: {
        id: "img-1",
        type: "image-input",
        position: { x: 0, y: 0 },
        data: { uploadedImage: "data:image/png;base64,abc123" },
      } as Node,
    });

    const result = await imageInputExecutor.execute(ctx);

    expect(result.output).toBe("data:image/png;base64,abc123");
  });

  it("returns empty string when uploadedImage is not set", async () => {
    const ctx = createMockContext({
      node: {
        id: "img-1",
        type: "image-input",
        position: { x: 0, y: 0 },
        data: {},
      } as Node,
    });

    const result = await imageInputExecutor.execute(ctx);

    expect(result.output).toBe("");
  });

  it("coerces non-string uploadedImage to output (no type validation)", async () => {
    // Note: The executor uses type assertion, not runtime validation
    const ctx = createMockContext({
      node: {
        id: "img-1",
        type: "image-input",
        position: { x: 0, y: 0 },
        data: { uploadedImage: 12345 },
      } as Node,
    });

    const result = await imageInputExecutor.execute(ctx);

    // Returns the value as-is since it's truthy (no string type check)
    expect(result.output).toBe(12345);
  });
});

describe("audio-input executor", () => {
  it("has correct type", () => {
    expect(audioInputExecutor.type).toBe("audio-input");
  });

  it("has pulse output metadata", () => {
    expect(audioInputExecutor.hasPulseOutput).toBe(true);
  });

  it("returns AudioEdgeData format when audioBuffer is present", async () => {
    const ctx = createMockContext({
      node: {
        id: "audio-1",
        type: "audio-input",
        position: { x: 0, y: 0 },
        data: {
          audioBuffer: "base64audiodata",
          audioMimeType: "audio/webm",
          recordingDuration: 5.5,
        },
      } as Node,
    });

    const result = await audioInputExecutor.execute(ctx);

    const parsed = JSON.parse(result.output);
    expect(parsed.type).toBe("buffer");
    expect(parsed.buffer).toBe("base64audiodata");
    expect(parsed.mimeType).toBe("audio/webm");
    expect(parsed.duration).toBe(5.5);
  });

  it("uses default mime type when not specified", async () => {
    const ctx = createMockContext({
      node: {
        id: "audio-1",
        type: "audio-input",
        position: { x: 0, y: 0 },
        data: { audioBuffer: "somedata" },
      } as Node,
    });

    const result = await audioInputExecutor.execute(ctx);

    const parsed = JSON.parse(result.output);
    expect(parsed.mimeType).toBe("audio/webm");
  });

  it("throws error when no audioBuffer and not wired", async () => {
    const ctx = createMockContext({
      node: {
        id: "audio-1",
        type: "audio-input",
        position: { x: 0, y: 0 },
        data: {},
      } as Node,
    });

    await expect(audioInputExecutor.execute(ctx)).rejects.toThrow(
      "No audio recorded. Please record audio before running."
    );
  });
});

describe("preview-output executor", () => {
  it("has correct type", () => {
    expect(previewOutputExecutor.type).toBe("preview-output");
  });

  it("returns string input as output", async () => {
    const ctx = createMockContext({
      inputs: { string: "Text output" },
    });

    const result = await previewOutputExecutor.execute(ctx);

    expect(result.output).toBe("Text output");
    expect(result.stringOutput).toBe("Text output");
  });

  it("returns image input as primary output", async () => {
    const ctx = createMockContext({
      inputs: { image: "data:image/png;base64,abc123" },
    });

    const result = await previewOutputExecutor.execute(ctx);

    expect(result.output).toBe("data:image/png;base64,abc123");
    expect(result.imageOutput).toBe("data:image/png;base64,abc123");
  });

  it("returns audio input as primary output", async () => {
    const ctx = createMockContext({
      inputs: { audio: "audio-data" },
    });

    const result = await previewOutputExecutor.execute(ctx);

    expect(result.output).toBe("audio-data");
    expect(result.audioOutput).toBe("audio-data");
  });

  it("prioritizes image over string", async () => {
    const ctx = createMockContext({
      inputs: { string: "text", image: "image-data" },
    });

    const result = await previewOutputExecutor.execute(ctx);

    expect(result.output).toBe("image-data");
    expect(result.stringOutput).toBe("text");
    expect(result.imageOutput).toBe("image-data");
  });

  it("prioritizes audio over string", async () => {
    const ctx = createMockContext({
      inputs: { string: "text", audio: "audio-data" },
    });

    const result = await previewOutputExecutor.execute(ctx);

    expect(result.output).toBe("audio-data");
    expect(result.stringOutput).toBe("text");
    expect(result.audioOutput).toBe("audio-data");
  });

  it("returns empty string when no inputs", async () => {
    const ctx = createMockContext({
      inputs: {},
    });

    const result = await previewOutputExecutor.execute(ctx);

    expect(result.output).toBe("");
    expect(result.stringOutput).toBe("");
    expect(result.imageOutput).toBe("");
    expect(result.audioOutput).toBe("");
  });
});

describe("comment executor", () => {
  it("has correct type", () => {
    expect(commentExecutor.type).toBe("comment");
  });

  it("passes through prompt input", async () => {
    const ctx = createMockContext({
      inputs: { prompt: "Passthrough text" },
    });

    const result = await commentExecutor.execute(ctx);

    expect(result.output).toBe("Passthrough text");
  });

  it("falls back to input key", async () => {
    const ctx = createMockContext({
      inputs: { input: "Input fallback" },
    });

    const result = await commentExecutor.execute(ctx);

    expect(result.output).toBe("Input fallback");
  });

  it("returns empty string when no inputs", async () => {
    const ctx = createMockContext({
      inputs: {},
    });

    const result = await commentExecutor.execute(ctx);

    expect(result.output).toBe("");
  });
});
