import { describe, it, expect, beforeEach } from "vitest";
import {
  registerExecutor,
  getExecutor,
  hasExecutor,
  getRegisteredTypes,
  hasPulseOutput,
  shouldTrackDownstream,
  clearExecutors,
} from "../executor-registry";
import type { NodeExecutor } from "../executors/types";

describe("executor-registry", () => {
  beforeEach(() => {
    clearExecutors();
  });

  describe("registerExecutor", () => {
    it("registers an executor successfully", () => {
      const executor: NodeExecutor = {
        type: "test-node",
        async execute() {
          return { output: "test" };
        },
      };

      registerExecutor(executor);

      expect(hasExecutor("test-node")).toBe(true);
    });

    it("throws error when registering duplicate executor", () => {
      const executor: NodeExecutor = {
        type: "duplicate-node",
        async execute() {
          return { output: "test" };
        },
      };

      registerExecutor(executor);

      expect(() => registerExecutor(executor)).toThrow(
        'Executor for type "duplicate-node" is already registered'
      );
    });

    it("allows registering multiple different executors", () => {
      const executor1: NodeExecutor = {
        type: "node-type-1",
        async execute() {
          return { output: "1" };
        },
      };
      const executor2: NodeExecutor = {
        type: "node-type-2",
        async execute() {
          return { output: "2" };
        },
      };

      registerExecutor(executor1);
      registerExecutor(executor2);

      expect(hasExecutor("node-type-1")).toBe(true);
      expect(hasExecutor("node-type-2")).toBe(true);
    });
  });

  describe("getExecutor", () => {
    it("returns registered executor", () => {
      const executor: NodeExecutor = {
        type: "get-test",
        async execute() {
          return { output: "found" };
        },
      };
      registerExecutor(executor);

      const result = getExecutor("get-test");

      expect(result).toBe(executor);
    });

    it("returns undefined for unregistered type", () => {
      const result = getExecutor("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("hasExecutor", () => {
    it("returns true for registered executor", () => {
      const executor: NodeExecutor = {
        type: "has-test",
        async execute() {
          return { output: "test" };
        },
      };
      registerExecutor(executor);

      expect(hasExecutor("has-test")).toBe(true);
    });

    it("returns false for unregistered type", () => {
      expect(hasExecutor("not-registered")).toBe(false);
    });
  });

  describe("getRegisteredTypes", () => {
    it("returns empty array when no executors registered", () => {
      expect(getRegisteredTypes()).toEqual([]);
    });

    it("returns all registered type names", () => {
      registerExecutor({
        type: "type-a",
        async execute() {
          return { output: "" };
        },
      });
      registerExecutor({
        type: "type-b",
        async execute() {
          return { output: "" };
        },
      });

      const types = getRegisteredTypes();

      expect(types).toContain("type-a");
      expect(types).toContain("type-b");
      expect(types).toHaveLength(2);
    });
  });

  describe("hasPulseOutput", () => {
    it("returns true when executor has hasPulseOutput: true", () => {
      registerExecutor({
        type: "pulse-node",
        hasPulseOutput: true,
        async execute() {
          return { output: "" };
        },
      });

      expect(hasPulseOutput("pulse-node")).toBe(true);
    });

    it("returns false when executor has hasPulseOutput: false", () => {
      registerExecutor({
        type: "no-pulse-node",
        hasPulseOutput: false,
        async execute() {
          return { output: "" };
        },
      });

      expect(hasPulseOutput("no-pulse-node")).toBe(false);
    });

    it("returns false when hasPulseOutput is not set", () => {
      registerExecutor({
        type: "default-node",
        async execute() {
          return { output: "" };
        },
      });

      expect(hasPulseOutput("default-node")).toBe(false);
    });

    it("returns false for unregistered type", () => {
      expect(hasPulseOutput("nonexistent")).toBe(false);
    });
  });

  describe("shouldTrackDownstream", () => {
    it("returns true when executor has shouldTrackDownstream: true", () => {
      registerExecutor({
        type: "streaming-node",
        shouldTrackDownstream: true,
        async execute() {
          return { output: "" };
        },
      });

      expect(shouldTrackDownstream("streaming-node")).toBe(true);
    });

    it("returns false when executor has shouldTrackDownstream: false", () => {
      registerExecutor({
        type: "non-streaming-node",
        shouldTrackDownstream: false,
        async execute() {
          return { output: "" };
        },
      });

      expect(shouldTrackDownstream("non-streaming-node")).toBe(false);
    });

    it("returns false when shouldTrackDownstream is not set", () => {
      registerExecutor({
        type: "default-tracking-node",
        async execute() {
          return { output: "" };
        },
      });

      expect(shouldTrackDownstream("default-tracking-node")).toBe(false);
    });

    it("returns false for unregistered type", () => {
      expect(shouldTrackDownstream("nonexistent")).toBe(false);
    });
  });

  describe("clearExecutors", () => {
    it("removes all registered executors", () => {
      registerExecutor({
        type: "to-clear-1",
        async execute() {
          return { output: "" };
        },
      });
      registerExecutor({
        type: "to-clear-2",
        async execute() {
          return { output: "" };
        },
      });

      clearExecutors();

      expect(getRegisteredTypes()).toEqual([]);
      expect(hasExecutor("to-clear-1")).toBe(false);
      expect(hasExecutor("to-clear-2")).toBe(false);
    });
  });
});
