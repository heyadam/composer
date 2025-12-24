import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFlowExecution } from "../useFlowExecution";
import type { Node, Edge } from "@xyflow/react";
import type { ApiKeys } from "@/lib/api-keys/types";

// Mock the execution engine
vi.mock("@/lib/execution/engine", () => ({
  executeFlow: vi.fn(),
}));

import { executeFlow } from "@/lib/execution/engine";

const mockExecuteFlow = vi.mocked(executeFlow);

describe("useFlowExecution", () => {
  const mockSetNodes = vi.fn();
  const mockHasRequiredKey = vi.fn().mockReturnValue(true);

  const defaultNodes: Node[] = [
    {
      id: "node_1",
      type: "text-input",
      position: { x: 0, y: 0 },
      data: { label: "Input", inputValue: "Hello" },
    },
    {
      id: "node_2",
      type: "text-generation",
      position: { x: 200, y: 0 },
      data: { label: "Prompt", provider: "openai", model: "gpt-4" },
    },
    {
      id: "node_3",
      type: "preview-output",
      position: { x: 400, y: 0 },
      data: { label: "Output" },
    },
  ];

  const defaultEdges: Edge[] = [
    { id: "edge_1", source: "node_1", target: "node_2" },
    { id: "edge_2", source: "node_2", target: "node_3" },
  ];

  const defaultApiKeys: ApiKeys = {
    openai: "test-key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteFlow.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: defaultApiKeys,
        hasRequiredKey: mockHasRequiredKey,
        setNodes: mockSetNodes,
      })
    );

    expect(result.current.isRunning).toBe(false);
    expect(result.current.previewEntries).toEqual([]);
    expect(result.current.debugEntries).toEqual([]);
    expect(result.current.activeResponseTab).toBe("responses");
    expect(result.current.keyError).toBeNull();
  });

  it("should set isRunning to true during execution", async () => {
    // Create a promise that we can control
    let resolveExecution: () => void;
    const executionPromise = new Promise<void>((resolve) => {
      resolveExecution = resolve;
    });
    mockExecuteFlow.mockReturnValue(executionPromise);

    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: defaultApiKeys,
        hasRequiredKey: mockHasRequiredKey,
        setNodes: mockSetNodes,
      })
    );

    // Start the flow
    act(() => {
      result.current.runFlow();
    });

    // Should be running
    expect(result.current.isRunning).toBe(true);

    // Complete the execution
    await act(async () => {
      resolveExecution!();
      await executionPromise;
    });

    // Should no longer be running
    expect(result.current.isRunning).toBe(false);
  });

  it("should not start if already running", async () => {
    let resolveExecution: () => void;
    const executionPromise = new Promise<void>((resolve) => {
      resolveExecution = resolve;
    });
    mockExecuteFlow.mockReturnValue(executionPromise);

    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: defaultApiKeys,
        hasRequiredKey: mockHasRequiredKey,
        setNodes: mockSetNodes,
      })
    );

    // Start the flow
    act(() => {
      result.current.runFlow();
    });

    // Try to start again
    act(() => {
      result.current.runFlow();
    });

    // executeFlow should only be called once
    expect(mockExecuteFlow).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => {
      resolveExecution!();
    });
  });

  it("should set keyError if required keys are missing", async () => {
    const mockHasKeyMissing = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: {},
        hasRequiredKey: mockHasKeyMissing,
        setNodes: mockSetNodes,
      })
    );

    await act(async () => {
      await result.current.runFlow();
    });

    expect(result.current.keyError).toContain("Missing API keys");
    expect(result.current.isRunning).toBe(false);
    expect(mockExecuteFlow).not.toHaveBeenCalled();
  });

  it("should reset execution state", () => {
    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: defaultApiKeys,
        hasRequiredKey: mockHasRequiredKey,
        setNodes: mockSetNodes,
      })
    );

    act(() => {
      result.current.resetExecution();
    });

    expect(mockSetNodes).toHaveBeenCalled();
    expect(result.current.previewEntries).toEqual([]);
    expect(result.current.debugEntries).toEqual([]);
  });

  it("should cancel execution via abort controller", async () => {
    let rejectExecution: (reason: Error) => void;
    const executionPromise = new Promise<void>((_, reject) => {
      rejectExecution = reject;
    });
    mockExecuteFlow.mockReturnValue(executionPromise);

    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: defaultApiKeys,
        hasRequiredKey: mockHasRequiredKey,
        setNodes: mockSetNodes,
      })
    );

    // Start the flow
    act(() => {
      result.current.runFlow();
    });

    expect(result.current.isRunning).toBe(true);

    // Cancel the flow
    act(() => {
      result.current.cancelFlow();
      // Simulate the abort
      rejectExecution!(new Error("Execution cancelled"));
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });
  });

  it("should call executeFlow with correct parameters", async () => {
    mockExecuteFlow.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: defaultApiKeys,
        hasRequiredKey: mockHasRequiredKey,
        setNodes: mockSetNodes,
      })
    );

    await act(async () => {
      await result.current.runFlow();
    });

    expect(mockExecuteFlow).toHaveBeenCalledWith(
      defaultNodes,
      defaultEdges,
      expect.any(Function), // updateNodeExecutionState
      defaultApiKeys,
      expect.any(AbortSignal),
      { shareToken: undefined, runId: undefined } // owner-funded execution options
    );
  });

  it("should change activeResponseTab", () => {
    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: defaultApiKeys,
        hasRequiredKey: mockHasRequiredKey,
        setNodes: mockSetNodes,
      })
    );

    expect(result.current.activeResponseTab).toBe("responses");

    act(() => {
      result.current.setActiveResponseTab("debug");
    });

    expect(result.current.activeResponseTab).toBe("debug");
  });

  it("should handle execution errors gracefully", async () => {
    mockExecuteFlow.mockRejectedValue(new Error("Network error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useFlowExecution({
        nodes: defaultNodes,
        edges: defaultEdges,
        apiKeys: defaultApiKeys,
        hasRequiredKey: mockHasRequiredKey,
        setNodes: mockSetNodes,
      })
    );

    await act(async () => {
      await result.current.runFlow();
    });

    expect(result.current.isRunning).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Flow execution error:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("should clear keyError when execution starts successfully", async () => {
    const mockHasKeyMissing = vi.fn().mockReturnValue(false);

    const { result, rerender } = renderHook(
      ({ hasRequiredKey }) =>
        useFlowExecution({
          nodes: defaultNodes,
          edges: defaultEdges,
          apiKeys: defaultApiKeys,
          hasRequiredKey,
          setNodes: mockSetNodes,
        }),
      { initialProps: { hasRequiredKey: mockHasKeyMissing } }
    );

    // First try - should fail
    await act(async () => {
      await result.current.runFlow();
    });
    expect(result.current.keyError).not.toBeNull();

    // Now fix the keys
    rerender({ hasRequiredKey: mockHasRequiredKey });

    // Second try - should succeed and clear error
    mockExecuteFlow.mockResolvedValue(undefined);
    await act(async () => {
      await result.current.runFlow();
    });

    expect(result.current.keyError).toBeNull();
  });
});
