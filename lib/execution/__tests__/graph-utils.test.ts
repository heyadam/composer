import { describe, it, expect } from "vitest";
import type { Edge } from "@xyflow/react";
import { collectNodeInputs } from "../graph-utils";

describe("collectNodeInputs", () => {
  describe("regular edges (no sourceHandle)", () => {
    it("collects input from executed upstream node", () => {
      const edges: Edge[] = [
        { id: "edge_1", source: "node_1", target: "node_2" },
      ];
      const executedOutputs = {
        node_1: "Hello world",
      };

      const inputs = collectNodeInputs("node_2", edges, executedOutputs);

      expect(inputs).toEqual({ prompt: "Hello world" });
    });

    it("uses targetHandle as key when specified", () => {
      const edges: Edge[] = [
        { id: "edge_1", source: "node_1", target: "node_2", targetHandle: "system" },
      ];
      const executedOutputs = {
        node_1: "You are a helpful assistant",
      };

      const inputs = collectNodeInputs("node_2", edges, executedOutputs);

      expect(inputs).toEqual({ system: "You are a helpful assistant" });
    });

    it("collects multiple inputs from different upstream nodes", () => {
      const edges: Edge[] = [
        { id: "edge_1", source: "node_1", target: "node_3", targetHandle: "prompt" },
        { id: "edge_2", source: "node_2", target: "node_3", targetHandle: "system" },
      ];
      const executedOutputs = {
        node_1: "User message",
        node_2: "System prompt",
      };

      const inputs = collectNodeInputs("node_3", edges, executedOutputs);

      expect(inputs).toEqual({
        prompt: "User message",
        system: "System prompt",
      });
    });
  });

  describe("pulse edges (sourceHandle: done)", () => {
    it("looks up pulse output using node:done key format", () => {
      const edges: Edge[] = [
        { id: "edge_1", source: "prompt_node", target: "next_node", sourceHandle: "done", targetHandle: "trigger" },
      ];
      const executedOutputs = {
        "prompt_node": "The actual output text",
        "prompt_node:done": JSON.stringify({ fired: true, timestamp: 1234567890 }),
      };

      const inputs = collectNodeInputs("next_node", edges, executedOutputs);

      expect(inputs).toEqual({
        trigger: JSON.stringify({ fired: true, timestamp: 1234567890 }),
      });
    });

    it("handles mixed regular and pulse edges", () => {
      const edges: Edge[] = [
        { id: "edge_1", source: "text_node", target: "output_node", targetHandle: "string" },
        { id: "edge_2", source: "prompt_node", target: "output_node", sourceHandle: "done", targetHandle: "trigger" },
      ];
      const executedOutputs = {
        text_node: "Some text",
        prompt_node: "Prompt output",
        "prompt_node:done": JSON.stringify({ fired: true }),
      };

      const inputs = collectNodeInputs("output_node", edges, executedOutputs);

      expect(inputs).toEqual({
        string: "Some text",
        trigger: JSON.stringify({ fired: true }),
      });
    });

    it("does not use :done key for regular output handle", () => {
      const edges: Edge[] = [
        { id: "edge_1", source: "prompt_node", target: "next_node", sourceHandle: "output", targetHandle: "prompt" },
      ];
      const executedOutputs = {
        prompt_node: "Regular output",
        "prompt_node:done": JSON.stringify({ fired: true }),
      };

      const inputs = collectNodeInputs("next_node", edges, executedOutputs);

      // Should get regular output, not the :done pulse
      expect(inputs).toEqual({ prompt: "Regular output" });
    });
  });

  describe("edge cases", () => {
    it("returns empty object when no incoming edges", () => {
      const edges: Edge[] = [
        { id: "edge_1", source: "node_1", target: "node_2" },
      ];
      const executedOutputs = { node_1: "Output" };

      const inputs = collectNodeInputs("node_3", edges, executedOutputs);

      expect(inputs).toEqual({});
    });

    it("skips edges where source has not executed", () => {
      const edges: Edge[] = [
        { id: "edge_1", source: "node_1", target: "node_2" },
        { id: "edge_2", source: "node_unexecuted", target: "node_2", targetHandle: "system" },
      ];
      const executedOutputs = {
        node_1: "Only this executed",
      };

      const inputs = collectNodeInputs("node_2", edges, executedOutputs);

      expect(inputs).toEqual({ prompt: "Only this executed" });
      expect(inputs).not.toHaveProperty("system");
    });

    it("handles null sourceHandle same as undefined", () => {
      const edges: Edge[] = [
        { id: "edge_1", source: "node_1", target: "node_2", sourceHandle: null },
      ];
      const executedOutputs = { node_1: "Output" };

      const inputs = collectNodeInputs("node_2", edges, executedOutputs);

      expect(inputs).toEqual({ prompt: "Output" });
    });
  });
});
