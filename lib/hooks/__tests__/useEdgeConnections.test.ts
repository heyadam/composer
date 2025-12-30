import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEdgeConnections } from "../useEdgeConnections";
import type { Edge } from "@xyflow/react";

// Mock useEdges from @xyflow/react
const mockEdges: Edge[] = [];
vi.mock("@xyflow/react", () => ({
  useEdges: () => mockEdges,
}));

// Helper to set mock edges
function setMockEdges(edges: Edge[]) {
  mockEdges.length = 0;
  mockEdges.push(...edges);
}

describe("useEdgeConnections", () => {
  it("should return empty sets when no edges exist", () => {
    setMockEdges([]);

    const { result } = renderHook(() => useEdgeConnections("node_1"));

    expect(result.current.isInputConnected("prompt")).toBe(false);
    expect(result.current.isOutputConnected("output")).toBe(false);
    expect(result.current.inputHandles.size).toBe(0);
    expect(result.current.outputHandles.size).toBe(0);
  });

  it("should detect input connections by handle ID", () => {
    setMockEdges([
      { id: "edge_1", source: "node_0", target: "node_1", targetHandle: "prompt" },
    ]);

    const { result } = renderHook(() => useEdgeConnections("node_1"));

    expect(result.current.isInputConnected("prompt")).toBe(true);
    expect(result.current.isInputConnected("system")).toBe(false);
    expect(result.current.inputHandles.has("prompt")).toBe(true);
  });

  it("should detect output connections by handle ID", () => {
    setMockEdges([
      { id: "edge_1", source: "node_1", target: "node_2", sourceHandle: "output" },
      { id: "edge_2", source: "node_1", target: "node_3", sourceHandle: "done" },
    ]);

    const { result } = renderHook(() => useEdgeConnections("node_1"));

    expect(result.current.isOutputConnected("output")).toBe(true);
    expect(result.current.isOutputConnected("done")).toBe(true);
    expect(result.current.isOutputConnected("other")).toBe(false);
  });

  it("should support fallbackToDefault for input connections", () => {
    // Edge with no targetHandle (default/null connection)
    setMockEdges([
      { id: "edge_1", source: "node_0", target: "node_1" },
    ]);

    const { result } = renderHook(() => useEdgeConnections("node_1"));

    // Without fallback, should be false for named handle
    expect(result.current.isInputConnected("prompt")).toBe(false);
    expect(result.current.isInputConnected("prompt", false)).toBe(false);

    // With fallback, should be true (default handle is connected)
    expect(result.current.isInputConnected("prompt", true)).toBe(true);
  });

  it("should support fallbackToDefault for output connections", () => {
    // Edge with no sourceHandle (default/null connection)
    setMockEdges([
      { id: "edge_1", source: "node_1", target: "node_2" },
    ]);

    const { result } = renderHook(() => useEdgeConnections("node_1"));

    // Without fallback, should be false for named handle
    expect(result.current.isOutputConnected("output")).toBe(false);
    expect(result.current.isOutputConnected("output", false)).toBe(false);

    // With fallback, should be true (default handle is connected)
    expect(result.current.isOutputConnected("output", true)).toBe(true);
  });

  it("should only track edges for the specified node", () => {
    setMockEdges([
      { id: "edge_1", source: "node_0", target: "node_1", targetHandle: "prompt" },
      { id: "edge_2", source: "node_2", target: "node_3", targetHandle: "prompt" },
    ]);

    const { result: result1 } = renderHook(() => useEdgeConnections("node_1"));
    const { result: result3 } = renderHook(() => useEdgeConnections("node_3"));

    expect(result1.current.isInputConnected("prompt")).toBe(true);
    expect(result3.current.isInputConnected("prompt")).toBe(true);

    // node_2 has no input edges
    const { result: result2 } = renderHook(() => useEdgeConnections("node_2"));
    expect(result2.current.isInputConnected("prompt")).toBe(false);
  });

  it("should handle multiple edges to same node with different handles", () => {
    setMockEdges([
      { id: "edge_1", source: "node_0", target: "node_1", targetHandle: "prompt" },
      { id: "edge_2", source: "node_2", target: "node_1", targetHandle: "system" },
      { id: "edge_3", source: "node_3", target: "node_1", targetHandle: "image" },
    ]);

    const { result } = renderHook(() => useEdgeConnections("node_1"));

    expect(result.current.isInputConnected("prompt")).toBe(true);
    expect(result.current.isInputConnected("system")).toBe(true);
    expect(result.current.isInputConnected("image")).toBe(true);
    expect(result.current.isInputConnected("audio")).toBe(false);
    expect(result.current.inputHandles.size).toBe(3);
  });

  it("should expose raw handle sets for advanced use cases", () => {
    setMockEdges([
      { id: "edge_1", source: "node_0", target: "node_1", targetHandle: "prompt" },
      { id: "edge_2", source: "node_1", target: "node_2", sourceHandle: "output" },
    ]);

    const { result } = renderHook(() => useEdgeConnections("node_1"));

    expect(result.current.inputHandles).toBeInstanceOf(Set);
    expect(result.current.outputHandles).toBeInstanceOf(Set);
    expect([...result.current.inputHandles]).toEqual(["prompt"]);
    expect([...result.current.outputHandles]).toEqual(["output"]);
  });

  it("should track default (null) handles separately", () => {
    setMockEdges([
      { id: "edge_1", source: "node_0", target: "node_1" }, // default handle
      { id: "edge_2", source: "node_0", target: "node_1", targetHandle: "prompt" }, // named handle
    ]);

    const { result } = renderHook(() => useEdgeConnections("node_1"));

    expect(result.current.inputHandles.has(null)).toBe(true);
    expect(result.current.inputHandles.has("prompt")).toBe(true);
    expect(result.current.inputHandles.size).toBe(2);
  });
});
