import { describe, it, expect } from "vitest";
import { getRegisteredTypes, hasExecutor, getExecutor } from "../executor-registry";

// Import executors to trigger registration
import "../executors";

/**
 * Integration test to ensure all executors are registered at startup.
 * This catches missing registrations before they cause runtime errors.
 */
describe("executor integration", () => {
  const expectedExecutorTypes = [
    "text-input",
    "image-input",
    "audio-input",
    "preview-output",
    "text-generation",
    "image-generation",
    "ai-logic",
    "react-component",
    "audio-transcription",
    "realtime-conversation",
    "comment",
  ];

  it("has all expected executors registered", () => {
    const registeredTypes = getRegisteredTypes();

    for (const type of expectedExecutorTypes) {
      expect(registeredTypes).toContain(type);
    }
  });

  it("has correct number of executors", () => {
    const registeredTypes = getRegisteredTypes();

    expect(registeredTypes.length).toBe(expectedExecutorTypes.length);
  });

  describe("each executor", () => {
    for (const type of expectedExecutorTypes) {
      it(`"${type}" is registered and has execute function`, () => {
        expect(hasExecutor(type)).toBe(true);

        const executor = getExecutor(type);
        expect(executor).toBeDefined();
        expect(executor?.type).toBe(type);
        expect(typeof executor?.execute).toBe("function");
      });
    }
  });

  describe("executor metadata", () => {
    it("text-generation has pulse output and downstream tracking", () => {
      const executor = getExecutor("text-generation");
      expect(executor?.hasPulseOutput).toBe(true);
      expect(executor?.shouldTrackDownstream).toBe(true);
    });

    it("image-generation has pulse output and downstream tracking", () => {
      const executor = getExecutor("image-generation");
      expect(executor?.hasPulseOutput).toBe(true);
      expect(executor?.shouldTrackDownstream).toBe(true);
    });

    it("react-component has pulse output and downstream tracking", () => {
      const executor = getExecutor("react-component");
      expect(executor?.hasPulseOutput).toBe(true);
      expect(executor?.shouldTrackDownstream).toBe(true);
    });

    it("audio-transcription has pulse output", () => {
      const executor = getExecutor("audio-transcription");
      expect(executor?.hasPulseOutput).toBe(true);
    });

    it("ai-logic has pulse output", () => {
      const executor = getExecutor("ai-logic");
      expect(executor?.hasPulseOutput).toBe(true);
    });

    it("text-input and image-input do not have pulse output", () => {
      expect(getExecutor("text-input")?.hasPulseOutput).toBeFalsy();
      expect(getExecutor("image-input")?.hasPulseOutput).toBeFalsy();
    });

    it("audio-input has pulse output", () => {
      expect(getExecutor("audio-input")?.hasPulseOutput).toBe(true);
    });

    it("comment node does not have pulse output", () => {
      expect(getExecutor("comment")?.hasPulseOutput).toBeFalsy();
    });

    it("preview-output does not have pulse output", () => {
      expect(getExecutor("preview-output")?.hasPulseOutput).toBeFalsy();
    });

    it("streaming executors have shouldTrackDownstream", () => {
      expect(getExecutor("text-generation")?.shouldTrackDownstream).toBe(true);
      expect(getExecutor("image-generation")?.shouldTrackDownstream).toBe(true);
      expect(getExecutor("react-component")?.shouldTrackDownstream).toBe(true);
    });

    it("non-streaming executors do not have shouldTrackDownstream", () => {
      expect(getExecutor("text-input")?.shouldTrackDownstream).toBeFalsy();
      expect(getExecutor("image-input")?.shouldTrackDownstream).toBeFalsy();
      expect(getExecutor("audio-input")?.shouldTrackDownstream).toBeFalsy();
      expect(getExecutor("preview-output")?.shouldTrackDownstream).toBeFalsy();
      expect(getExecutor("comment")?.shouldTrackDownstream).toBeFalsy();
      expect(getExecutor("ai-logic")?.shouldTrackDownstream).toBeFalsy();
      expect(getExecutor("audio-transcription")?.shouldTrackDownstream).toBeFalsy();
    });
  });
});
