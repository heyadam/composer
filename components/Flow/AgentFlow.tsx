"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { NodeSidebar } from "./NodeSidebar";
import { initialNodes, initialEdges } from "@/lib/example-flow";
import type { NodeType } from "@/types/flow";
import { executeFlow } from "@/lib/execution/engine";
import type { NodeExecutionState } from "@/lib/execution/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, RotateCcw, Loader2 } from "lucide-react";
import { PreviewModal, type PreviewEntry } from "./PreviewModal";

let id = 0;
const getId = () => `node_${id++}`;

const defaultNodeData: Record<NodeType, Record<string, unknown>> = {
  input: { label: "Input" },
  output: { label: "Response" },
  prompt: { label: "Prompt", prompt: "", model: "gpt-5.2" },
};

export function AgentFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const [userInput, setUserInput] = useState("What is the weather like today?");
  const [isRunning, setIsRunning] = useState(false);
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [previewEntries, setPreviewEntries] = useState<PreviewEntry[]>([]);
  const addedPreviewIds = useRef<Set<string>>(new Set());
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

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

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
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
            });
          }
          // Update preview with streaming output while running
          if (state.output) {
            updatePreviewEntry(nodeId, {
              status: "running",
              output: state.output,
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

    resetExecution();
    setIsRunning(true);

    try {
      const output = await executeFlow(nodes, edges, userInput, updateNodeExecutionState);
      setFinalOutput(output);
    } catch (error) {
      console.error("Flow execution error:", error);
    } finally {
      setIsRunning(false);
    }
  }, [nodes, edges, userInput, isRunning, updateNodeExecutionState, resetExecution]);

  return (
    <div className="relative h-screen w-full">
      <div ref={reactFlowWrapper} className="h-full w-full bg-muted/10">
        <NodeSidebar />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          
          {/* Execution Controls */}
          <Panel
            position="top-center"
            className="flex items-center gap-2 rounded-xl border bg-background/95 backdrop-blur p-2 shadow-sm"
          >
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Enter your input..."
              className="w-[360px]"
              disabled={isRunning}
            />
            <Button onClick={runFlow} disabled={isRunning} className="gap-2">
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Flow
                </>
              )}
            </Button>
            <Button onClick={resetExecution} variant="outline" size="icon" disabled={isRunning}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </Panel>

        </ReactFlow>
        <PreviewModal
          entries={previewEntries}
          onClear={() => setPreviewEntries([])}
        />
      </div>
    </div>
  );
}
