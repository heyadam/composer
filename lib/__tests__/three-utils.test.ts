import { describe, it, expect } from "vitest";
import {
  isThreejsOutput,
  parseThreejsOutput,
  extractThreejsCode,
} from "../three-utils";

describe("isThreejsOutput", () => {
  it("should return true for valid Three.js JSON output", () => {
    const validOutput = JSON.stringify({
      type: "threejs",
      code: 'export default function Scene() { return <Canvas />; }',
    });
    expect(isThreejsOutput(validOutput)).toBe(true);
  });

  it("should return false for undefined", () => {
    expect(isThreejsOutput(undefined)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isThreejsOutput("")).toBe(false);
  });

  it("should return false for non-JSON string", () => {
    expect(isThreejsOutput("just plain text")).toBe(false);
  });

  it("should return false for JSON with wrong type", () => {
    const wrongType = JSON.stringify({
      type: "react",
      code: 'export default function Component() { return <div />; }',
    });
    expect(isThreejsOutput(wrongType)).toBe(false);
  });

  it("should return false for JSON with missing code field", () => {
    const missingCode = JSON.stringify({
      type: "threejs",
    });
    expect(isThreejsOutput(missingCode)).toBe(false);
  });

  it("should return false for JSON with non-string code field", () => {
    const nonStringCode = JSON.stringify({
      type: "threejs",
      code: 123,
    });
    expect(isThreejsOutput(nonStringCode)).toBe(false);
  });

  it("should return false for malformed JSON", () => {
    expect(isThreejsOutput("{ not valid json }")).toBe(false);
  });

  it("should return false for other JSON structures", () => {
    const imageOutput = JSON.stringify({
      type: "image",
      value: "base64data...",
      mimeType: "image/png",
    });
    expect(isThreejsOutput(imageOutput)).toBe(false);
  });
});

describe("parseThreejsOutput", () => {
  it("should parse valid Three.js JSON output", () => {
    const code = 'export default function Scene() { return <Canvas><Box /></Canvas>; }';
    const validOutput = JSON.stringify({
      type: "threejs",
      code,
    });

    const result = parseThreejsOutput(validOutput);
    expect(result).toEqual({
      type: "threejs",
      code,
    });
  });

  it("should return null for invalid JSON", () => {
    expect(parseThreejsOutput("{ not valid json }")).toBeNull();
  });

  it("should return null for wrong type", () => {
    const wrongType = JSON.stringify({
      type: "react",
      code: 'export default function Component() { return <div />; }',
    });
    expect(parseThreejsOutput(wrongType)).toBeNull();
  });

  it("should return null for missing code field", () => {
    const missingCode = JSON.stringify({
      type: "threejs",
    });
    expect(parseThreejsOutput(missingCode)).toBeNull();
  });

  it("should return null for non-string code", () => {
    const nonStringCode = JSON.stringify({
      type: "threejs",
      code: { nested: "object" },
    });
    expect(parseThreejsOutput(nonStringCode)).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseThreejsOutput("")).toBeNull();
  });

  it("should preserve complex code with special characters", () => {
    const complexCode = `
      export default function Scene() {
        const colors = ["#ff0000", "#00ff00"];
        return (
          <Canvas camera={{ position: [0, 2, 5] }}>
            <ambientLight intensity={0.5} />
            <Box />
          </Canvas>
        );
      }
    `;
    const output = JSON.stringify({
      type: "threejs",
      code: complexCode,
    });

    const result = parseThreejsOutput(output);
    expect(result?.code).toBe(complexCode);
  });
});

describe("extractThreejsCode", () => {
  it("should extract code from valid Three.js output", () => {
    const code = 'export default function Scene() { return <Canvas />; }';
    const output = JSON.stringify({
      type: "threejs",
      code,
    });

    expect(extractThreejsCode(output)).toBe(code);
  });

  it("should return undefined for invalid output", () => {
    expect(extractThreejsCode("not json")).toBeUndefined();
  });

  it("should return undefined for wrong type", () => {
    const wrongType = JSON.stringify({
      type: "react",
      code: 'export default function Component() {}',
    });
    expect(extractThreejsCode(wrongType)).toBeUndefined();
  });

  it("should return undefined for missing code", () => {
    const missingCode = JSON.stringify({
      type: "threejs",
    });
    expect(extractThreejsCode(missingCode)).toBeUndefined();
  });

  it("should extract code with markdown fences", () => {
    // The code itself may contain markdown - that's handled by cleanThreejsCode in ThreePreview
    // extractThreejsCode just extracts the raw code string
    const codeWithFences = '```jsx\nexport default function Scene() {}\n```';
    const output = JSON.stringify({
      type: "threejs",
      code: codeWithFences,
    });

    expect(extractThreejsCode(output)).toBe(codeWithFences);
  });
});
