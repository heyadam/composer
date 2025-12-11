"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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

let id = 0;
const getId = () => `node_${id++}`;

const defaultNodeData: Record<NodeType, Record<string, unknown>> = {
  input: { label: "Input" },
  output: { label: "Output" },
  prompt: { label: "Prompt", prompt: "", model: "gpt-4o" },
  tool: { label: "Tool", toolName: "custom_tool", description: "Tool description" },
  condition: { label: "Condition", condition: "value === true" },
};

export function AgentFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const [userInput, setUserInput] = useState("What is the weather like today?");
  const [isRunning, setIsRunning] = useState(false);
  const [finalOutput, setFinalOutput] = useState<string | null>(null);

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
    },
    [setNodes]
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
    <div className="flex h-screen w-full">
      <NodeSidebar />
      <div ref={reactFlowWrapper} className="flex-1 bg-muted/10">
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
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case "input":
                  return "#22c55e";
                case "output":
                  return "#ef4444";
                case "prompt":
                  return "#3b82f6";
                case "tool":
                  return "#a855f7";
                case "condition":
                  return "#eab308";
                default:
                  return "#6b7280";
              }
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />

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

          {/* Final Output */}
          {finalOutput && (
            <Panel
              position="bottom-center"
              className="rounded-xl border bg-background/95 backdrop-blur p-4 shadow-sm max-w-xl"
            >
              <h3 className="text-sm font-medium mb-2">Final Output</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto">
                {finalOutput}
              </p>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
