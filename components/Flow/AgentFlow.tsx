"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  SelectionMode,
  type OnConnect,
  type ReactFlowInstance,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges/ColoredEdge";
import { NodeSidebar } from "./NodeSidebar";
import { AutopilotSidebar } from "./AutopilotSidebar";
import { ActionBar } from "./ActionBar";
import { SaveFlowDialog } from "./SaveFlowDialog";
import { initialNodes, initialEdges, defaultFlow } from "@/lib/example-flow";
import type { NodeType } from "@/types/flow";
import { executeFlow } from "@/lib/execution/engine";
import type { NodeExecutionState } from "@/lib/execution/types";
import type { FlowChanges, AddNodeAction, AddEdgeAction, RemoveEdgeAction, AppliedChangesInfo } from "@/lib/autopilot/types";
import { ResponsesSidebar, type PreviewEntry } from "./ResponsesSidebar";
import { useApiKeys, type ProviderId } from "@/lib/api-keys";
import {
  createSavedFlow,
  downloadFlow,
  openFlowFilePicker,
  type FlowMetadata,
} from "@/lib/flow-storage";

let id = 0;
const getId = () => `node_${id++}`;

const defaultNodeData: Record<NodeType, Record<string, unknown>> = {
  input: { label: "Input", inputValue: "" },
  output: { label: "Response" },
  prompt: { label: "Text", prompt: "", provider: "openai", model: "gpt-5" },
  image: { label: "Image Generator", prompt: "", outputFormat: "webp", size: "1024x1024", quality: "low", partialImages: 3 },
};

export function AgentFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Flow metadata state
  const [flowMetadata, setFlowMetadata] = useState<FlowMetadata | undefined>(
    defaultFlow.metadata as FlowMetadata
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [previewEntries, setPreviewEntries] = useState<PreviewEntry[]>([]);
  const addedPreviewIds = useRef<Set<string>>(new Set());
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Sidebar and palette states
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [autopilotHighlightedIds, setAutopilotHighlightedIds] = useState<Set<string>>(new Set());
  const [nodesPaletteOpen, setNodesPaletteOpen] = useState(false);
  const [responsesOpen, setResponsesOpen] = useState(true);

  // API keys context
  const { keys: apiKeys, hasRequiredKey } = useApiKeys();
  const [keyError, setKeyError] = useState<string | null>(null);

  // Apply changes from autopilot
  const applyAutopilotChanges = useCallback(
    (changes: FlowChanges): AppliedChangesInfo => {
      const nodeIds: string[] = [];
      const edgeIds: string[] = [];

      for (const action of changes.actions) {
        if (action.type === "addNode") {
          const nodeAction = action as AddNodeAction;
          nodeIds.push(nodeAction.node.id);
          setNodes((nds) =>
            nds.concat({
              id: nodeAction.node.id,
              type: nodeAction.node.type,
              position: nodeAction.node.position,
              data: nodeAction.node.data,
              className: "autopilot-added",
            })
          );
        } else if (action.type === "addEdge") {
          const edgeAction = action as AddEdgeAction;
          edgeIds.push(edgeAction.edge.id);
          setEdges((eds) =>
            addEdge(
              {
                id: edgeAction.edge.id,
                source: edgeAction.edge.source,
                target: edgeAction.edge.target,
                type: "colored",
                data: edgeAction.edge.data,
              },
              eds
            )
          );
        } else if (action.type === "removeEdge") {
          const removeAction = action as RemoveEdgeAction;
          setEdges((eds) => eds.filter((e) => e.id !== removeAction.edgeId));
        }
      }

      // Track highlighted nodes
      setAutopilotHighlightedIds((prev) => new Set([...prev, ...nodeIds]));

      return { nodeIds, edgeIds };
    },
    [setNodes, setEdges]
  );

  // Undo changes from autopilot
  const undoAutopilotChanges = useCallback(
    (applied: AppliedChangesInfo) => {
      setNodes((nds) => nds.filter((n) => !applied.nodeIds.includes(n.id)));
      setEdges((eds) => eds.filter((e) => !applied.edgeIds.includes(e.id)));
      // Remove from highlighted set
      setAutopilotHighlightedIds((prev) => {
        const next = new Set(prev);
        applied.nodeIds.forEach((id) => next.delete(id));
        return next;
      });
    },
    [setNodes, setEdges]
  );

  // Wrap onNodesChange to clear autopilot highlight when nodes are dragged
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      // Clear highlight for any nodes being dragged
      for (const change of changes) {
        if (change.type === "position" && change.dragging && autopilotHighlightedIds.has(change.id)) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === change.id ? { ...n, className: undefined } : n
            )
          );
          setAutopilotHighlightedIds((prev) => {
            const next = new Set(prev);
            next.delete(change.id);
            return next;
          });
        }
      }
      onNodesChange(changes);
    },
    [onNodesChange, autopilotHighlightedIds, setNodes]
  );

  const addPreviewEntry = useCallback(
    (entry: Omit<PreviewEntry, "id" | "timestamp">) => {
      setPreviewEntries((prev) => [
        ...prev,
        {
          ...entry,
          id: `${entry.nodeId}-${Date.now()}`,
          timestamp: Date.now(),
        },
      ]);
    },
    []
  );

  const updatePreviewEntry = useCallback(
    (nodeId: string, updates: Partial<PreviewEntry>) => {
      setPreviewEntries((prev) =>
        prev.map((entry) =>
          entry.nodeId === nodeId ? { ...entry, ...updates } : entry
        )
      );
    },
    []
  );

  // Determine edge data type based on source node
  const getEdgeDataType = useCallback((sourceNodeId: string): string => {
    const sourceNode = nodesRef.current.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return "default";

    switch (sourceNode.type) {
      case "image":
        return "image";
      case "input":
      case "prompt":
        return "string";
      default:
        return "default";
    }
  }, []);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const dataType = params.source ? getEdgeDataType(params.source) : "default";
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "colored",
            data: { dataType },
          },
          eds
        )
      );
    },
    [setEdges, getEdgeDataType]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow") as NodeType;

      if (!type || !reactFlowInstance.current || !reactFlowWrapper.current) {
        return;
      }

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { ...defaultNodeData[type] },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const updateNodeExecutionState = useCallback(
    (nodeId: string, state: NodeExecutionState) => {
      // Update node state
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  executionStatus: state.status,
                  executionOutput: state.output,
                  executionError: state.error,
                },
              }
            : node
        )
      );

      // Handle preview for output/response nodes
      const targetNode = nodesRef.current.find((n) => n.id === nodeId);
      if (targetNode?.type === "output") {
        const nodeLabel = (targetNode.data as { label?: string }).label || "Response";

        if (state.status === "running") {
          // Add to preview immediately when running (dedupe by nodeId)
          if (!addedPreviewIds.current.has(nodeId)) {
            addedPreviewIds.current.add(nodeId);
            addPreviewEntry({
              nodeId,
              nodeLabel,
              nodeType: "output",
              status: "running",
              sourceType: state.sourceType as "prompt" | "image" | undefined,
            });
          }
          // Update preview with streaming output while running
          if (state.output) {
            updatePreviewEntry(nodeId, {
              status: "running",
              output: state.output,
            });
          } else if (state.sourceType) {
            // Update source type if provided (for loading state)
            updatePreviewEntry(nodeId, {
              status: "running",
              sourceType: state.sourceType as "prompt" | "image" | undefined,
            });
          }
        } else {
          // Update existing entry when complete
          updatePreviewEntry(nodeId, {
            status: state.status,
            output: state.output,
            error: state.error,
          });
        }
      }
    },
    [setNodes, addPreviewEntry, updatePreviewEntry]
  );

  const resetExecution = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          executionStatus: undefined,
          executionOutput: undefined,
          executionError: undefined,
        },
      }))
    );
    setFinalOutput(null);
    setPreviewEntries([]);
    addedPreviewIds.current.clear();
  }, [setNodes]);

  const runFlow = useCallback(async () => {
    if (isRunning) return;

    // Check which providers are needed based on nodes
    const providersUsed = new Set<ProviderId>();
    nodes.forEach((node) => {
      if (node.type === "prompt" || node.type === "image") {
        const provider = (node.data as { provider?: string }).provider || "openai";
        providersUsed.add(provider as ProviderId);
      }
    });

    // Validate required keys
    const missingProviders: string[] = [];
    for (const provider of providersUsed) {
      if (!hasRequiredKey(provider)) {
        missingProviders.push(provider);
      }
    }

    if (missingProviders.length > 0) {
      setKeyError(`Missing API keys: ${missingProviders.join(", ")}. Open Settings to configure.`);
      return;
    }

    setKeyError(null);
    resetExecution();
    setIsRunning(true);

    try {
      const output = await executeFlow(nodes, edges, updateNodeExecutionState, apiKeys);
      setFinalOutput(output);
    } catch (error) {
      console.error("Flow execution error:", error);
    } finally {
      setIsRunning(false);
    }
  }, [nodes, edges, isRunning, updateNodeExecutionState, resetExecution, hasRequiredKey, apiKeys]);

  // Flow file operations
  const handleNewFlow = useCallback(() => {
    // Reset to default flow
    setNodes(initialNodes);
    setEdges(initialEdges);
    setFlowMetadata(defaultFlow.metadata as FlowMetadata);
    resetExecution();
    setAutopilotHighlightedIds(new Set());
  }, [setNodes, setEdges, resetExecution]);

  const handleSaveFlow = useCallback((name: string) => {
    const flow = createSavedFlow(nodes, edges, name, flowMetadata);
    setFlowMetadata(flow.metadata);
    downloadFlow(flow);
  }, [nodes, edges, flowMetadata]);

  const handleOpenFlow = useCallback(async () => {
    const result = await openFlowFilePicker();
    if (result.success && result.flow) {
      setNodes(result.flow.nodes);
      setEdges(result.flow.edges);
      setFlowMetadata(result.flow.metadata);
      resetExecution();
      setAutopilotHighlightedIds(new Set());

      // Update node ID counter to avoid collisions
      const maxId = result.flow.nodes.reduce((max, node) => {
        const match = node.id.match(/node_(\d+)/);
        if (match) {
          return Math.max(max, parseInt(match[1], 10));
        }
        return max;
      }, 0);
      id = maxId + 1;

      // Fit view to show loaded flow (with small delay for state to settle)
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2 });
      }, 50);

      // Show warnings if any
      if (result.validation?.warnings.length) {
        console.warn("Flow loaded with warnings:", result.validation.warnings);
      }
    } else if (result.error && result.error !== "File selection cancelled") {
      console.error("Failed to open flow:", result.error);
      alert(`Failed to open flow: ${result.error}`);
    }
  }, [setNodes, setEdges, resetExecution]);

  return (
    <div className="flex h-screen w-full">
      {/* Autopilot Sidebar (left) */}
      <AutopilotSidebar
        nodes={nodes}
        edges={edges}
        onApplyChanges={applyAutopilotChanges}
        onUndoChanges={undoAutopilotChanges}
        isOpen={autopilotOpen}
        onToggle={() => setAutopilotOpen(!autopilotOpen)}
      />
      <div ref={reactFlowWrapper} className="flex-1 h-full bg-muted/10 relative">
        <NodeSidebar isOpen={nodesPaletteOpen} onClose={() => setNodesPaletteOpen(false)} />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "colored" }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
          // Pan by default, hold space to enable selection box
          panOnDrag
          selectionOnDrag={false}
          selectionKeyCode="Space"
          selectionMode={SelectionMode.Partial}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <ActionBar
          onToggleNodes={() => setNodesPaletteOpen(!nodesPaletteOpen)}
          onToggleAutopilot={() => setAutopilotOpen(!autopilotOpen)}
          onToggleResponses={() => setResponsesOpen(!responsesOpen)}
          onRun={runFlow}
          onReset={resetExecution}
          onNewFlow={handleNewFlow}
          onSaveFlow={() => setSaveDialogOpen(true)}
          onOpenFlow={handleOpenFlow}
          nodesPaletteOpen={nodesPaletteOpen}
          autopilotOpen={autopilotOpen}
          responsesOpen={responsesOpen}
          isRunning={isRunning}
        />
      </div>
      <ResponsesSidebar
        entries={previewEntries}
        keyError={keyError}
        isOpen={responsesOpen}
      />
      <SaveFlowDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveFlow}
        defaultName={flowMetadata?.name || "My Flow"}
      />
    </div>
  );
}
