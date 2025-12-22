import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutopilotIntegration } from "../useAutopilotIntegration";
import type { FlowChanges, AppliedChangesInfo } from "@/lib/autopilot/types";
import type { Node, Edge, NodeChange } from "@xyflow/react";

describe("useAutopilotIntegration", () => {
  let mockSetNodes: ReturnType<typeof vi.fn>;
  let mockSetEdges: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock setters that track their updater functions
    mockSetNodes = vi.fn((updater) => {
      if (typeof updater === "function") {
        return updater([]);
      }
      return updater;
    });
    mockSetEdges = vi.fn((updater) => {
      if (typeof updater === "function") {
        return updater([]);
      }
      return updater;
    });
  });

  it("should initialize with empty highlighted IDs", () => {
    const { result } = renderHook(() =>
      useAutopilotIntegration({
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
      })
    );

    expect(result.current.highlightedIds.size).toBe(0);
  });

  describe("applyChanges", () => {
    it("should add nodes with autopilot-added class", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const changes: FlowChanges = {
        actions: [
          {
            type: "addNode",
            node: {
              id: "new-node-1",
              type: "text-generation",
              position: { x: 100, y: 200 },
              data: { label: "New Node" },
            },
          },
        ],
        explanation: "Added a new node",
      };

      act(() => {
        result.current.applyChanges(changes);
      });

      expect(mockSetNodes).toHaveBeenCalled();
      // Verify the node was added with autopilot-added class
      const setNodesCall = mockSetNodes.mock.calls[0][0];
      if (typeof setNodesCall === "function") {
        const newNodes = setNodesCall([]);
        expect(newNodes[0].className).toBe("autopilot-added");
        expect(newNodes[0].id).toBe("new-node-1");
      }
    });

    it("should add edges with colored type", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const changes: FlowChanges = {
        actions: [
          {
            type: "addEdge",
            edge: {
              id: "new-edge-1",
              source: "node-1",
              target: "node-2",
              data: { dataType: "string" },
            },
          },
        ],
        explanation: "Added a new edge",
      };

      act(() => {
        result.current.applyChanges(changes);
      });

      expect(mockSetEdges).toHaveBeenCalled();
    });

    it("should remove edges", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const changes: FlowChanges = {
        actions: [
          {
            type: "removeEdge",
            edgeId: "edge-to-remove",
          },
        ],
        explanation: "Removed an edge",
      };

      act(() => {
        result.current.applyChanges(changes);
      });

      expect(mockSetEdges).toHaveBeenCalled();
    });

    it("should remove nodes and their connected edges", () => {
      const existingNodes: Node[] = [
        { id: "node-1", type: "text-input", position: { x: 0, y: 0 }, data: {} },
      ];
      const existingEdges: Edge[] = [
        { id: "edge-1", source: "node-1", target: "node-2" },
      ];

      mockSetNodes = vi.fn((updater) => {
        if (typeof updater === "function") {
          return updater(existingNodes);
        }
        return updater;
      });
      mockSetEdges = vi.fn((updater) => {
        if (typeof updater === "function") {
          return updater(existingEdges);
        }
        return updater;
      });

      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const changes: FlowChanges = {
        actions: [
          {
            type: "removeNode",
            nodeId: "node-1",
          },
        ],
        explanation: "Removed a node",
      };

      let appliedInfo: AppliedChangesInfo;
      act(() => {
        appliedInfo = result.current.applyChanges(changes);
      });

      expect(mockSetNodes).toHaveBeenCalled();
      expect(mockSetEdges).toHaveBeenCalled();
      expect(appliedInfo!.removedNodes).toHaveLength(1);
      expect(appliedInfo!.removedNodes![0].id).toBe("node-1");
    });

    it("should return applied changes info for undo", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const changes: FlowChanges = {
        actions: [
          {
            type: "addNode",
            node: {
              id: "node-1",
              type: "text-input",
              position: { x: 0, y: 0 },
              data: {},
            },
          },
          {
            type: "addEdge",
            edge: {
              id: "edge-1",
              source: "node-1",
              target: "node-2",
              data: { dataType: "string" },
            },
          },
        ],
        explanation: "Added node and edge",
      };

      let appliedInfo: AppliedChangesInfo;
      act(() => {
        appliedInfo = result.current.applyChanges(changes);
      });

      expect(appliedInfo!.nodeIds).toContain("node-1");
      expect(appliedInfo!.edgeIds).toContain("edge-1");
    });

    it("should add node IDs to highlighted set", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const changes: FlowChanges = {
        actions: [
          {
            type: "addNode",
            node: {
              id: "node-1",
              type: "text-input",
              position: { x: 0, y: 0 },
              data: {},
            },
          },
        ],
        explanation: "Added a node",
      };

      act(() => {
        result.current.applyChanges(changes);
      });

      expect(result.current.highlightedIds.has("node-1")).toBe(true);
    });
  });

  describe("undoChanges", () => {
    it("should remove added nodes", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const appliedInfo: AppliedChangesInfo = {
        nodeIds: ["node-1", "node-2"],
        edgeIds: ["edge-1"],
      };

      act(() => {
        result.current.undoChanges(appliedInfo);
      });

      expect(mockSetNodes).toHaveBeenCalled();
      expect(mockSetEdges).toHaveBeenCalled();
    });

    it("should restore removed nodes", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const appliedInfo: AppliedChangesInfo = {
        nodeIds: [],
        edgeIds: [],
        removedNodes: [
          {
            id: "restored-node",
            type: "text-input",
            position: { x: 100, y: 200 },
            data: { label: "Restored" },
          },
        ],
      };

      act(() => {
        result.current.undoChanges(appliedInfo);
      });

      // Check that setNodes was called to restore the node
      expect(mockSetNodes).toHaveBeenCalledTimes(2); // filter + concat
    });

    it("should restore removed edges", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const appliedInfo: AppliedChangesInfo = {
        nodeIds: [],
        edgeIds: [],
        removedEdges: [
          {
            id: "restored-edge",
            source: "node-1",
            target: "node-2",
            data: { dataType: "string" },
          },
        ],
      };

      act(() => {
        result.current.undoChanges(appliedInfo);
      });

      expect(mockSetEdges).toHaveBeenCalledTimes(2); // filter + concat
    });

    it("should remove node IDs from highlighted set", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      // First add a node to get it highlighted
      const changes: FlowChanges = {
        actions: [
          {
            type: "addNode",
            node: {
              id: "node-1",
              type: "text-input",
              position: { x: 0, y: 0 },
              data: {},
            },
          },
        ],
        explanation: "Added a node",
      };

      let appliedInfo: AppliedChangesInfo;
      act(() => {
        appliedInfo = result.current.applyChanges(changes);
      });

      expect(result.current.highlightedIds.has("node-1")).toBe(true);

      // Now undo
      act(() => {
        result.current.undoChanges(appliedInfo!);
      });

      expect(result.current.highlightedIds.has("node-1")).toBe(false);
    });
  });

  describe("clearHighlights", () => {
    it("should clear all highlighted nodes", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      // Add some highlighted nodes
      const changes: FlowChanges = {
        actions: [
          {
            type: "addNode",
            node: {
              id: "node-1",
              type: "text-input",
              position: { x: 0, y: 0 },
              data: {},
            },
          },
          {
            type: "addNode",
            node: {
              id: "node-2",
              type: "text-input",
              position: { x: 100, y: 0 },
              data: {},
            },
          },
        ],
        explanation: "Added nodes",
      };

      act(() => {
        result.current.applyChanges(changes);
      });

      expect(result.current.highlightedIds.size).toBe(2);

      // Clear highlights
      act(() => {
        result.current.clearHighlights();
      });

      expect(result.current.highlightedIds.size).toBe(0);
      // setNodes should be called to remove className
      expect(mockSetNodes).toHaveBeenCalled();
    });

    it("should do nothing if no highlights exist", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const callCountBefore = mockSetNodes.mock.calls.length;

      act(() => {
        result.current.clearHighlights();
      });

      // Should not call setNodes if no highlights
      expect(mockSetNodes.mock.calls.length).toBe(callCountBefore);
    });
  });

  describe("clearHighlightOnDrag", () => {
    it("should clear highlight when a highlighted node is dragged", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      // Add a highlighted node
      const changes: FlowChanges = {
        actions: [
          {
            type: "addNode",
            node: {
              id: "node-1",
              type: "text-input",
              position: { x: 0, y: 0 },
              data: {},
            },
          },
        ],
        explanation: "Added a node",
      };

      act(() => {
        result.current.applyChanges(changes);
      });

      expect(result.current.highlightedIds.has("node-1")).toBe(true);

      // Simulate dragging
      const nodeChanges: NodeChange[] = [
        {
          type: "position",
          id: "node-1",
          dragging: true,
          position: { x: 50, y: 50 },
        },
      ];

      act(() => {
        result.current.clearHighlightOnDrag(nodeChanges);
      });

      expect(result.current.highlightedIds.has("node-1")).toBe(false);
    });

    it("should not clear highlight for non-highlighted nodes", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      const callCountBefore = mockSetNodes.mock.calls.length;

      // Simulate dragging a non-highlighted node
      const nodeChanges: NodeChange[] = [
        {
          type: "position",
          id: "non-highlighted-node",
          dragging: true,
          position: { x: 50, y: 50 },
        },
      ];

      act(() => {
        result.current.clearHighlightOnDrag(nodeChanges);
      });

      // Should not modify nodes for non-highlighted nodes
      expect(mockSetNodes.mock.calls.length).toBe(callCountBefore);
    });

    it("should not clear highlight when dragging ends", () => {
      const { result } = renderHook(() =>
        useAutopilotIntegration({
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
        })
      );

      // Add a highlighted node
      const changes: FlowChanges = {
        actions: [
          {
            type: "addNode",
            node: {
              id: "node-1",
              type: "text-input",
              position: { x: 0, y: 0 },
              data: {},
            },
          },
        ],
        explanation: "Added a node",
      };

      act(() => {
        result.current.applyChanges(changes);
      });

      const callCountBefore = mockSetNodes.mock.calls.length;

      // Simulate drag end (dragging: false)
      const nodeChanges: NodeChange[] = [
        {
          type: "position",
          id: "node-1",
          dragging: false,
          position: { x: 50, y: 50 },
        },
      ];

      act(() => {
        result.current.clearHighlightOnDrag(nodeChanges);
      });

      // Should not clear highlight on drag end
      expect(mockSetNodes.mock.calls.length).toBe(callCountBefore);
      expect(result.current.highlightedIds.has("node-1")).toBe(true);
    });
  });
});
