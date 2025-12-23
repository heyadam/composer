import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFlowOperations } from "../useFlowOperations";
import type { Node, Edge } from "@xyflow/react";

// Mock the flow API
vi.mock("@/lib/flows/api", () => ({
  createFlow: vi.fn(),
  updateFlow: vi.fn(),
  loadFlow: vi.fn(),
}));

// Mock flow storage
vi.mock("@/lib/flow-storage", () => ({
  createSavedFlow: vi.fn((nodes, edges, name) => ({
    nodes,
    edges,
    metadata: {
      name,
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      schemaVersion: 1,
    },
  })),
  downloadFlow: vi.fn(),
  openFlowFilePicker: vi.fn(),
}));

import { createFlow, updateFlow, loadFlow } from "@/lib/flows/api";
import { downloadFlow, openFlowFilePicker } from "@/lib/flow-storage";

const mockCreateFlow = vi.mocked(createFlow);
const mockUpdateFlow = vi.mocked(updateFlow);
const mockLoadFlow = vi.mocked(loadFlow);
const mockDownloadFlow = vi.mocked(downloadFlow);
const mockOpenFlowFilePicker = vi.mocked(openFlowFilePicker);

describe("useFlowOperations", () => {
  const mockSetNodes = vi.fn();
  const mockSetEdges = vi.fn();
  const mockResetExecution = vi.fn();
  const mockClearHighlights = vi.fn();
  const mockOnFlowChange = vi.fn();
  const mockSetIdCounter = vi.fn();
  const mockFitView = vi.fn();
  const mockReactFlowInstance = { current: { fitView: mockFitView } };

  const defaultNodes: Node[] = [
    { id: "node_1", type: "text-input", position: { x: 0, y: 0 }, data: {} },
  ];

  const defaultEdges: Edge[] = [
    { id: "edge_1", source: "node_1", target: "node_2" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to default resolved values
    mockCreateFlow.mockResolvedValue({ success: true, flow: { id: "default-id" } });
    mockUpdateFlow.mockResolvedValue({ success: true, flow: { id: "updated-id" } });
    mockLoadFlow.mockResolvedValue({ success: true, flow: { nodes: [], edges: [], metadata: { name: "", description: "", createdAt: "", updatedAt: "", schemaVersion: 1 } } });
    mockOpenFlowFilePicker.mockResolvedValue({ success: false, error: "File selection cancelled" });
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useFlowOperations({
        nodes: defaultNodes,
        edges: defaultEdges,
        setNodes: mockSetNodes,
        setEdges: mockSetEdges,
        resetExecution: mockResetExecution,
        clearHighlights: mockClearHighlights,
        reactFlowInstance: mockReactFlowInstance as any,
        onFlowChange: mockOnFlowChange,
        setIdCounter: mockSetIdCounter,
      })
    );

    expect(result.current.flowMetadata).toBeUndefined();
    expect(result.current.currentFlowId).toBeNull();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveDialogOpen).toBe(false);
    expect(result.current.myFlowsDialogOpen).toBe(false);
  });

  describe("loadBlankCanvas", () => {
    it("should clear nodes and edges", () => {
      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: defaultNodes,
          edges: defaultEdges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      act(() => {
        result.current.loadBlankCanvas();
      });

      expect(mockSetNodes).toHaveBeenCalledWith([]);
      expect(mockSetEdges).toHaveBeenCalledWith([]);
      expect(mockResetExecution).toHaveBeenCalled();
      expect(mockClearHighlights).toHaveBeenCalled();
      expect(mockOnFlowChange).toHaveBeenCalled();
      expect(mockSetIdCounter).toHaveBeenCalledWith(0);
    });

    it("should set default flow metadata", () => {
      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: defaultNodes,
          edges: defaultEdges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      act(() => {
        result.current.loadBlankCanvas();
      });

      expect(result.current.flowMetadata).toEqual(
        expect.objectContaining({
          name: "Untitled Flow",
          description: "",
          schemaVersion: 1,
        })
      );
      expect(result.current.currentFlowId).toBeNull();
    });
  });

  describe("handleNewFlow", () => {
    it("should load blank canvas", () => {
      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: defaultNodes,
          edges: defaultEdges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      act(() => {
        result.current.handleNewFlow();
      });

      expect(mockSetNodes).toHaveBeenCalledWith([]);
      expect(mockSetEdges).toHaveBeenCalledWith([]);
    });

  });

  describe("handleSelectTemplate", () => {
    it("should load template nodes and edges", () => {
      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      const templateFlow = {
        nodes: [{ id: "node_5", type: "text-input", position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        metadata: {
          name: "Template",
          description: "",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          schemaVersion: 1,
        },
      };

      act(() => {
        result.current.handleSelectTemplate(templateFlow);
      });

      expect(mockSetNodes).toHaveBeenCalledWith(templateFlow.nodes);
      expect(mockSetEdges).toHaveBeenCalledWith(templateFlow.edges);
      expect(mockResetExecution).toHaveBeenCalled();
      expect(mockClearHighlights).toHaveBeenCalled();
      expect(mockOnFlowChange).toHaveBeenCalled();
    });
  });

  describe("handleSaveFlow - download", () => {
    it("should download flow and close dialog", async () => {
      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: defaultNodes,
          edges: defaultEdges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      // Open dialog first
      act(() => {
        result.current.setSaveDialogOpen(true);
      });

      expect(result.current.saveDialogOpen).toBe(true);

      await act(async () => {
        await result.current.handleSaveFlow("My Flow", "download");
      });

      expect(mockDownloadFlow).toHaveBeenCalled();
      expect(result.current.saveDialogOpen).toBe(false);
    });
  });

  describe("handleSaveFlow - cloud", () => {
    it("should create new flow in cloud", async () => {
      mockCreateFlow.mockResolvedValue({
        success: true,
        flow: { id: "new-flow-id" },
      });

      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: defaultNodes,
          edges: defaultEdges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      await act(async () => {
        await result.current.handleSaveFlow("My Flow", "cloud");
      });

      expect(mockCreateFlow).toHaveBeenCalled();
      expect(result.current.currentFlowId).toBe("new-flow-id");
      expect(result.current.isSaving).toBe(false);
    });

    it("should reset isSaving after save completes", async () => {
      mockCreateFlow.mockResolvedValue({
        success: true,
        flow: { id: "test-id" },
      });

      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: defaultNodes,
          edges: defaultEdges,
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      // Starts as not saving
      expect(result.current.isSaving).toBe(false);

      await act(async () => {
        await result.current.handleSaveFlow("My Flow", "cloud");
      });

      // After save completes, should not be saving
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe("handleLoadCloudFlow", () => {
    it("should load flow from cloud", async () => {
      const cloudFlow = {
        nodes: [{ id: "node_10", type: "text-input", position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        metadata: { name: "Cloud Flow", description: "", createdAt: "", updatedAt: "", schemaVersion: 1 },
      };

      mockLoadFlow.mockResolvedValue({
        success: true,
        flow: cloudFlow,
      });

      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      await act(async () => {
        await result.current.handleLoadCloudFlow("flow-123");
      });

      expect(mockLoadFlow).toHaveBeenCalledWith("flow-123");
      expect(mockSetNodes).toHaveBeenCalledWith(cloudFlow.nodes);
      expect(mockSetEdges).toHaveBeenCalledWith(cloudFlow.edges);
      expect(result.current.currentFlowId).toBe("flow-123");
      expect(mockResetExecution).toHaveBeenCalled();
      expect(mockClearHighlights).toHaveBeenCalled();
      expect(mockOnFlowChange).toHaveBeenCalled();
    });
  });

  describe("handleOpenFlow", () => {
    it("should load flow from file picker", async () => {
      const fileFlow = {
        nodes: [{ id: "node_20", type: "text-input", position: { x: 0, y: 0 }, data: {} }],
        edges: [],
        metadata: { name: "File Flow", description: "", createdAt: "", updatedAt: "", schemaVersion: 1 },
      };

      mockOpenFlowFilePicker.mockResolvedValue({
        success: true,
        flow: fileFlow,
      });

      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      await act(async () => {
        await result.current.handleOpenFlow();
      });

      expect(mockOpenFlowFilePicker).toHaveBeenCalled();
      expect(mockSetNodes).toHaveBeenCalledWith(fileFlow.nodes);
      expect(mockSetEdges).toHaveBeenCalledWith(fileFlow.edges);
      expect(result.current.currentFlowId).toBeNull(); // File loads don't set cloud ID
      expect(mockResetExecution).toHaveBeenCalled();
      expect(mockClearHighlights).toHaveBeenCalled();
      expect(mockOnFlowChange).toHaveBeenCalled();
    });

    it("should handle cancelled file selection", async () => {
      mockOpenFlowFilePicker.mockResolvedValue({
        success: false,
        error: "File selection cancelled",
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      await act(async () => {
        await result.current.handleOpenFlow();
      });

      // Should not show error for cancelled
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockSetNodes).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("dialog state", () => {
    it("should toggle save dialog", () => {
      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      expect(result.current.saveDialogOpen).toBe(false);

      act(() => {
        result.current.setSaveDialogOpen(true);
      });

      expect(result.current.saveDialogOpen).toBe(true);
    });

    it("should toggle my flows dialog", () => {
      const { result } = renderHook(() =>
        useFlowOperations({
          nodes: [],
          edges: [],
          setNodes: mockSetNodes,
          setEdges: mockSetEdges,
          resetExecution: mockResetExecution,
          clearHighlights: mockClearHighlights,
          reactFlowInstance: mockReactFlowInstance as any,
          onFlowChange: mockOnFlowChange,
          setIdCounter: mockSetIdCounter,
        })
      );

      expect(result.current.myFlowsDialogOpen).toBe(false);

      act(() => {
        result.current.setMyFlowsDialogOpen(true);
      });

      expect(result.current.myFlowsDialogOpen).toBe(true);
    });
  });
});
