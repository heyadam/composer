import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUndoRedo } from "../useUndoRedo";
import type { Node, Edge } from "@xyflow/react";

describe("useUndoRedo", () => {
  const mockSetNodes = vi.fn();
  const mockSetEdges = vi.fn();
  const mockReactFlowWrapper = { current: document.createElement("div") };

  const initialNodes: Node[] = [
    {
      id: "node_1",
      type: "text-input",
      position: { x: 0, y: 0 },
      data: { label: "Input" },
    },
  ];

  const initialEdges: Edge[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with empty history", () => {
    const { result } = renderHook(() =>
      useUndoRedo({
        nodes: initialNodes,
        edges: initialEdges,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        reactFlowWrapper: mockReactFlowWrapper,
      })
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("should enable undo after taking a snapshot", () => {
    const { result } = renderHook(() =>
      useUndoRedo({
        nodes: initialNodes,
        edges: initialEdges,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        reactFlowWrapper: mockReactFlowWrapper,
      })
    );

    act(() => {
      result.current.takeSnapshot();
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("should restore previous state on undo", () => {
    const modifiedNodes: Node[] = [
      {
        id: "node_1",
        type: "text-input",
        position: { x: 100, y: 100 }, // Moved
        data: { label: "Input" },
      },
    ];

    const { result, rerender } = renderHook(
      ({ nodes }) =>
        useUndoRedo({
          nodes,
          edges: initialEdges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          reactFlowWrapper: mockReactFlowWrapper,
        }),
      { initialProps: { nodes: initialNodes } }
    );

    // Take snapshot of initial state
    act(() => {
      result.current.takeSnapshot();
    });

    // Simulate nodes being modified
    rerender({ nodes: modifiedNodes });

    // Undo should restore initial state
    act(() => {
      result.current.undo();
    });

    expect(mockSetNodes).toHaveBeenCalledWith(initialNodes);
    expect(mockSetEdges).toHaveBeenCalledWith(initialEdges);
  });

  it("should enable redo after undo", () => {
    const modifiedNodes: Node[] = [
      {
        id: "node_1",
        type: "text-input",
        position: { x: 100, y: 100 },
        data: { label: "Input" },
      },
    ];

    const { result, rerender } = renderHook(
      ({ nodes }) =>
        useUndoRedo({
          nodes,
          edges: initialEdges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          reactFlowWrapper: mockReactFlowWrapper,
        }),
      { initialProps: { nodes: initialNodes } }
    );

    // Take snapshot and modify
    act(() => {
      result.current.takeSnapshot();
    });
    rerender({ nodes: modifiedNodes });

    // Undo
    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);
  });

  it("should restore forward state on redo", () => {
    const modifiedNodes: Node[] = [
      {
        id: "node_1",
        type: "text-input",
        position: { x: 100, y: 100 },
        data: { label: "Input" },
      },
    ];

    const { result, rerender } = renderHook(
      ({ nodes }) =>
        useUndoRedo({
          nodes,
          edges: initialEdges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          reactFlowWrapper: mockReactFlowWrapper,
        }),
      { initialProps: { nodes: initialNodes } }
    );

    // Take snapshot of initial state
    act(() => {
      result.current.takeSnapshot();
    });

    // Simulate modification
    rerender({ nodes: modifiedNodes });

    // Undo, then redo
    act(() => {
      result.current.undo();
    });

    mockSetNodes.mockClear();
    mockSetEdges.mockClear();

    act(() => {
      result.current.redo();
    });

    // Redo should restore the modified state
    expect(mockSetNodes).toHaveBeenCalledWith(modifiedNodes);
  });

  it("should clear redo stack when taking new snapshot", () => {
    const { result, rerender } = renderHook(
      ({ nodes }) =>
        useUndoRedo({
          nodes,
          edges: initialEdges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          reactFlowWrapper: mockReactFlowWrapper,
        }),
      { initialProps: { nodes: initialNodes } }
    );

    // Take snapshot and undo
    act(() => {
      result.current.takeSnapshot();
    });

    const modifiedNodes: Node[] = [
      {
        id: "node_1",
        type: "text-input",
        position: { x: 100, y: 100 },
        data: { label: "Input" },
      },
    ];
    rerender({ nodes: modifiedNodes });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    // Take a new snapshot - should clear redo stack
    act(() => {
      result.current.takeSnapshot();
    });

    expect(result.current.canRedo).toBe(false);
  });

  it("should respect max history limit", () => {
    const { result } = renderHook(() =>
      useUndoRedo({
        nodes: initialNodes,
        edges: initialEdges,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        reactFlowWrapper: mockReactFlowWrapper,
        maxHistory: 3,
      })
    );

    // Take more snapshots than the limit
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.takeSnapshot();
      });
    }

    // Should still be able to undo (limited by maxHistory)
    expect(result.current.canUndo).toBe(true);

    // Count how many undos we can do (should be maxHistory = 3)
    let undoCount = 0;
    while (result.current.canUndo) {
      act(() => {
        result.current.undo();
      });
      undoCount++;
    }

    expect(undoCount).toBe(3);
  });

  it("should clear all history when clearHistory is called", () => {
    const { result } = renderHook(() =>
      useUndoRedo({
        nodes: initialNodes,
        edges: initialEdges,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        reactFlowWrapper: mockReactFlowWrapper,
      })
    );

    // Take snapshots
    act(() => {
      result.current.takeSnapshot();
      result.current.takeSnapshot();
    });

    expect(result.current.canUndo).toBe(true);

    // Clear history
    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("should do nothing when undoing with empty history", () => {
    const { result } = renderHook(() =>
      useUndoRedo({
        nodes: initialNodes,
        edges: initialEdges,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        reactFlowWrapper: mockReactFlowWrapper,
      })
    );

    // Try to undo with no history
    act(() => {
      result.current.undo();
    });

    expect(mockSetNodes).not.toHaveBeenCalled();
    expect(mockSetEdges).not.toHaveBeenCalled();
  });

  it("should do nothing when redoing with empty future", () => {
    const { result } = renderHook(() =>
      useUndoRedo({
        nodes: initialNodes,
        edges: initialEdges,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        reactFlowWrapper: mockReactFlowWrapper,
      })
    );

    // Try to redo with no future
    act(() => {
      result.current.redo();
    });

    expect(mockSetNodes).not.toHaveBeenCalled();
    expect(mockSetEdges).not.toHaveBeenCalled();
  });

  it("should handle multiple undo/redo operations", () => {
    const nodes1: Node[] = [
      { id: "1", type: "text-input", position: { x: 0, y: 0 }, data: {} },
    ];
    const nodes2: Node[] = [
      { id: "1", type: "text-input", position: { x: 100, y: 0 }, data: {} },
    ];
    const nodes3: Node[] = [
      { id: "1", type: "text-input", position: { x: 200, y: 0 }, data: {} },
    ];

    const { result, rerender } = renderHook(
      ({ nodes }) =>
        useUndoRedo({
          nodes,
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          reactFlowWrapper: mockReactFlowWrapper,
        }),
      { initialProps: { nodes: nodes1 } }
    );

    // Snapshot 1
    act(() => {
      result.current.takeSnapshot();
    });
    rerender({ nodes: nodes2 });

    // Snapshot 2
    act(() => {
      result.current.takeSnapshot();
    });
    rerender({ nodes: nodes3 });

    // Undo to nodes2
    act(() => {
      result.current.undo();
    });
    expect(mockSetNodes).toHaveBeenLastCalledWith(nodes2);
    rerender({ nodes: nodes2 }); // Simulate React updating state

    // Undo to nodes1
    act(() => {
      result.current.undo();
    });
    expect(mockSetNodes).toHaveBeenLastCalledWith(nodes1);
    rerender({ nodes: nodes1 }); // Simulate React updating state

    // Redo back to nodes2
    act(() => {
      result.current.redo();
    });
    expect(mockSetNodes).toHaveBeenLastCalledWith(nodes2);
  });
});
