"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
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
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges/ColoredEdge";
import { ConnectionContext } from "./ConnectionContext";
import { NodeToolbar } from "./NodeToolbar";
import { AutopilotSidebar } from "./AutopilotSidebar";
import { ActionBar } from "./ActionBar";
import { AvyLogo } from "./AvyLogo";
import { SaveFlowDialog, type SaveMode } from "./SaveFlowDialog";
import { MyFlowsDialog } from "./MyFlowsDialog";
import { FlowContextMenu } from "./FlowContextMenu";
import { CommentEditContext } from "./CommentEditContext";
// Removed: import { initialNodes, initialEdges, defaultFlow } from "@/lib/example-flow";
// Canvas now starts empty, templates modal offers starter flows
import { useCommentSuggestions } from "@/lib/hooks/useCommentSuggestions";
import { useSuggestions } from "@/lib/hooks/useSuggestions";
import { useClipboard } from "@/lib/hooks/useClipboard";
import { useFlowExecution } from "@/lib/hooks/useFlowExecution";
import { useAutopilotIntegration } from "@/lib/hooks/useAutopilotIntegration";
import { useNodeParenting } from "@/lib/hooks/useNodeParenting";
import { useFlowOperations } from "@/lib/hooks/useFlowOperations";
import { useUndoRedo } from "@/lib/hooks/useUndoRedo";
import type { NodeType, CommentColor } from "@/types/flow";
import { Settings, Folder, FilePlus, FolderOpen, Save, PanelLeft, PanelRight, Cloud } from "lucide-react";
import { SettingsDialogControlled } from "./SettingsDialogControlled";
import { WelcomeDialog, isNuxComplete } from "./WelcomeDialog";
import { TemplatesModal } from "./TemplatesModal";
import {
  useTemplatesModalState,
  shouldShowTemplatesModal,
} from "./TemplatesModal/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// executeFlow and NodeExecutionState now used in useFlowExecution hook
import type { FlowChanges, AddNodeAction, AddEdgeAction, RemoveEdgeAction, RemoveNodeAction, AppliedChangesInfo, RemovedNodeInfo, RemovedEdgeInfo, PendingAutopilotMessage, AutopilotMode, AutopilotModel } from "@/lib/autopilot/types";
import { ResponsesSidebar, type PreviewEntry, type DebugEntry } from "./ResponsesSidebar";
import { useApiKeys, type ProviderId } from "@/lib/api-keys";
import type { FlowMetadata } from "@/lib/flow-storage";
import { useBackgroundSettings } from "@/lib/hooks/useBackgroundSettings";
import { ProfileDropdown } from "./ProfileDropdown";

let id = 0;
const getId = () => `node_${id++}`;
const setIdCounter = (newId: number) => { id = newId; };

// ID counter initialized at 0, updated when loading templates or flows

const defaultNodeData: Record<NodeType, Record<string, unknown>> = {
  "text-input": { label: "Input Text", inputValue: "" },
  "image-input": { label: "Input Image" },
  "preview-output": { label: "Preview Output" },
  "text-generation": { label: "AI Text", prompt: "", provider: "google", model: "gemini-3-flash-preview", googleThinkingConfig: { thinkingLevel: "low" }, googleSafetyPreset: "default" },
  "image-generation": { label: "AI Image", prompt: "", provider: "google", model: "gemini-2.5-flash-image", aspectRatio: "1:1" },
  "ai-logic": { label: "AI Logic", transformPrompt: "", codeExpanded: false },
  "comment": { label: "Comment", description: "", color: "gray" },
  "react-component": { label: "React Component", userPrompt: "", provider: "anthropic", model: "claude-sonnet-4-5", stylePreset: "simple" },
};

export function AgentFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // API keys context
  const { keys: apiKeys, hasRequiredKey, getKeyStatuses, isDevMode, isLoaded } = useApiKeys();

  // Flow execution hook
  const {
    isRunning,
    previewEntries,
    debugEntries,
    activeResponseTab,
    setActiveResponseTab,
    keyError,
    runFlow,
    cancelFlow,
    resetExecution,
  } = useFlowExecution({
    nodes,
    edges,
    apiKeys,
    hasRequiredKey,
    setNodes,
  });

  // Track canvas width for responsive label hiding
  useEffect(() => {
    if (!reactFlowWrapper.current) return;

    // Set initial width
    setCanvasWidth(reactFlowWrapper.current.getBoundingClientRect().width);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(reactFlowWrapper.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Sidebar and palette states
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [nodesPaletteOpen, setNodesPaletteOpen] = useState(false);
  const [autopilotClearTrigger, setAutopilotClearTrigger] = useState(0);

  // Autopilot integration hook
  const {
    highlightedIds: autopilotHighlightedIds,
    applyChanges: applyAutopilotChanges,
    undoChanges: undoAutopilotChanges,
    clearHighlights: clearAutopilotHighlights,
    clearHighlightOnDrag,
  } = useAutopilotIntegration({ setNodes, setEdges });

  // Undo/redo hook
  const { takeSnapshot, clearHistory } = useUndoRedo({
    nodes,
    edges,
    setNodes,
    setEdges,
    reactFlowWrapper,
  });

  // Wrap onEdgesChange to snapshot before edge deletions
  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      // Check if any edges are being removed
      const hasRemoval = changes.some((c) => c.type === "remove");
      if (hasRemoval) {
        takeSnapshot();
      }
      onEdgesChange(changes);
    },
    [onEdgesChange, takeSnapshot]
  );

  // Wrap autopilot apply to snapshot before changes
  const handleApplyAutopilotChanges = useCallback(
    (changes: Parameters<typeof applyAutopilotChanges>[0]) => {
      takeSnapshot();
      return applyAutopilotChanges(changes);
    },
    [applyAutopilotChanges, takeSnapshot]
  );

  const [responsesOpen, setResponsesOpen] = useState(false);

  // Templates modal state
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const { dismissPermanently: dismissTemplatesPermanently } = useTemplatesModalState();

  // Flow operations hook
  const {
    flowMetadata,
    currentFlowId,
    isSaving,
    saveDialogOpen,
    setSaveDialogOpen,
    myFlowsDialogOpen,
    setMyFlowsDialogOpen,
    loadBlankCanvas,
    handleNewFlow,
    handleSelectTemplate,
    handleSaveFlow,
    handleLoadCloudFlow,
    handleOpenFlow,
  } = useFlowOperations({
    nodes,
    edges,
    setNodes,
    setEdges,
    resetExecution,
    clearHighlights: clearAutopilotHighlights,
    reactFlowInstance,
    onFlowChange: () => {
      setAutopilotClearTrigger((prev) => prev + 1);
      clearHistory(); // Clear undo history when loading a new flow
    },
    setIdCounter,
    shouldShowTemplatesModal,
    setTemplatesModalOpen,
  });
  
  // Canvas width for responsive label hiding
  const [canvasWidth, setCanvasWidth] = useState<number>(0);

  // Flow ID for future collaboration feature
  const [flowId] = useState(() => Math.floor(Math.random() * 900 + 100).toString());

  const statuses = getKeyStatuses();
  const hasAnyKey = statuses.some((s) => s.hasKey);
  const showSettingsWarning = !isDevMode && !hasAnyKey;

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-open settings dialog when no API keys are configured
  // Only show if NUX is complete (step 2 of NUX guides users to API keys)
  useEffect(() => {
    if (isLoaded && !isDevMode && !hasAnyKey && isNuxComplete()) {
      setSettingsOpen(true);
    }
  }, [isLoaded, isDevMode, hasAnyKey]);

  const [pendingAutopilotMessage, setPendingAutopilotMessage] = useState<PendingAutopilotMessage | null>(null);

  // Auto-open templates modal on app load (after NUX is complete)
  useEffect(() => {
    if (isLoaded && isNuxComplete() && shouldShowTemplatesModal()) {
      setTemplatesModalOpen(true);
    }
  }, [isLoaded, setTemplatesModalOpen]);

  // Dismiss templates modal when node palette opens (user clicks "Add Node")
  const prevNodesPaletteOpen = useRef(nodesPaletteOpen);
  useEffect(() => {
    const wasClosedNowOpen = !prevNodesPaletteOpen.current && nodesPaletteOpen;
    prevNodesPaletteOpen.current = nodesPaletteOpen;

    if (wasClosedNowOpen && templatesModalOpen) {
      setTemplatesModalOpen(false);
    }
  }, [nodesPaletteOpen, templatesModalOpen]);

  // Dismiss templates modal when user sends autopilot message
  const handleAutopilotMessageSent = useCallback(() => {
    if (templatesModalOpen) {
      setTemplatesModalOpen(false);
    }
  }, [templatesModalOpen]);

  // Handle prompt submission from templates modal
  const handleTemplatesPromptSubmit = useCallback((
    prompt: string,
    mode: AutopilotMode,
    model: AutopilotModel,
    thinkingEnabled: boolean
  ) => {
    setPendingAutopilotMessage({ prompt, mode, model, thinkingEnabled });
    setAutopilotOpen(true);
    setTemplatesModalOpen(false);
  }, []);

  // Background settings
  const { settings: bgSettings } = useBackgroundSettings();

  // Comment AI suggestion hook
  const { triggerGeneration, markUserEdited } = useCommentSuggestions({
    nodes,
    setNodes,
  });

  // Node parenting hook (handles auto-parenting into comments)
  const { handleNodesChange, getAbsolutePosition, isInsideComment } = useNodeParenting({
    nodes,
    setNodes,
    onNodesChange,
    triggerGeneration,
    clearHighlightOnDrag,
    onBeforeChange: takeSnapshot,
  });

  // Autopilot prompt suggestions
  const {
    suggestions,
    isLoading: suggestionsLoading,
    refresh: refreshSuggestions,
  } = useSuggestions({ nodes, edges });

  // Clipboard for copy/paste
  useClipboard({
    nodes,
    edges,
    setNodes,
    setEdges,
    reactFlowInstance,
    reactFlowWrapper,
    getId,
    onBeforePaste: takeSnapshot,
  });

  // Connection drag state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);

  // Panning state for logo animation
  const [isPanning, setIsPanning] = useState(false);

  // Clear highlights when clicking on canvas
  const handlePaneClick = useCallback(() => {
    clearAutopilotHighlights();
  }, [clearAutopilotHighlights]);

  // Clear highlights when clicking on any node
  const handleNodeClick = useCallback(() => {
    clearAutopilotHighlights();
  }, [clearAutopilotHighlights]);

  // Determine edge data type based on source node
  const getEdgeDataType = useCallback((sourceNodeId: string): string => {
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return "default";

    switch (sourceNode.type) {
      case "image-generation":
      case "image-input":
        return "image";
      case "text-input":
      case "text-generation":
        return "string";
      case "react-component":
        return "response";
      default:
        return "default";
    }
  }, [nodes]);

  // Allow all connections - replacement is handled in onConnect
  const isValidConnection = useCallback(() => true, []);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      // Take snapshot before adding edge for undo support
      takeSnapshot();

      const dataType = params.source ? getEdgeDataType(params.source) : "default";

      setEdges((eds) => {
        // Remove any existing edge to this target handle (replacement behavior)
        const filtered = eds.filter((edge) => {
          if (edge.target !== params.target) return true;
          // If existing edge has no targetHandle, it connects to the default input
          // and should be replaced by any new connection to the same node
          if (!edge.targetHandle) return false;
          // Otherwise, only filter out if handles match exactly
          return edge.targetHandle !== params.targetHandle;
        });

        // Add the new edge
        return addEdge(
          {
            ...params,
            type: "colored",
            data: {
              dataType,
              sourceHandle: params.sourceHandle,
              targetHandle: params.targetHandle,
            },
          },
          filtered
        );
      });
    },
    [setEdges, getEdgeDataType, takeSnapshot]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  const onConnectStart = useCallback((_: unknown, params: { nodeId: string | null }) => {
    setIsConnecting(true);
    setConnectingFromNodeId(params.nodeId);
  }, []);

  const onConnectEnd = useCallback(() => {
    setIsConnecting(false);
    setConnectingFromNodeId(null);
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

      // Take snapshot before adding node for undo support
      takeSnapshot();

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
    [setNodes, takeSnapshot]
  );

  // Get the center of the current viewport in flow coordinates
  const getViewportCenter = useCallback(() => {
    if (!reactFlowInstance.current || !reactFlowWrapper.current) {
      return { x: 0, y: 0 };
    }
    const { width, height } = reactFlowWrapper.current.getBoundingClientRect();
    return reactFlowInstance.current.screenToFlowPosition({
      x: width / 2,
      y: height / 2,
    });
  }, []);

  // Add a node at the center of the viewport (for toolbar click-to-add)
  const handleAddNodeAtCenter = useCallback(
    (nodeType: NodeType) => {
      // Take snapshot before adding node for undo support
      takeSnapshot();

      const position = getViewportCenter();
      const newNode = {
        id: getId(),
        type: nodeType,
        position: {
          x: position.x - 100, // Center horizontally (assuming ~200px node width)
          y: position.y - 50, // Center vertically (assuming ~100px node height)
        },
        data: { ...defaultNodeData[nodeType] },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [getViewportCenter, setNodes, takeSnapshot]
  );

  // Get currently selected nodes (excluding comments when wrapping)
  const getSelectedNodes = useCallback(() => {
    return nodes.filter((n) => n.selected && n.type !== "comment");
  }, [nodes]);

  // Check if any nodes are selected
  const hasSelection = nodes.some((n) => n.selected && n.type !== "comment");

  // Handler to create comment around selected nodes
  const handleCommentAround = useCallback(() => {
    const selectedNodes = getSelectedNodes();
    if (selectedNodes.length === 0) return;

    // Calculate bounding box of selected nodes
    const padding = 40;
    const headerHeight = 60; // Space for the comment header

    const bounds = selectedNodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.position.x),
        minY: Math.min(acc.minY, node.position.y),
        maxX: Math.max(acc.maxX, node.position.x + (node.measured?.width || 280)),
        maxY: Math.max(acc.maxY, node.position.y + (node.measured?.height || 200)),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    const commentId = getId();
    const commentPosition = {
      x: bounds.minX - padding,
      y: bounds.minY - padding - headerHeight,
    };

    // Create comment node with default values
    const commentNode: Node = {
      id: commentId,
      type: "comment",
      position: commentPosition,
      style: {
        width: bounds.maxX - bounds.minX + padding * 2,
        height: bounds.maxY - bounds.minY + padding * 2 + headerHeight,
        zIndex: -1, // Render behind other nodes
      },
      data: {
        label: "Comment",
        description: "",
        color: "gray" as CommentColor,
      },
    };

    // Update selected nodes to be children of comment
    setNodes((nds) => [
      commentNode,
      ...nds.map((node) =>
        selectedNodes.some((sn) => sn.id === node.id)
          ? {
              ...node,
              parentId: commentId,
              // Convert absolute position to relative within parent
              position: {
                x: node.position.x - commentPosition.x,
                y: node.position.y - commentPosition.y,
              },
            }
          : node
      ),
    ]);

    // Trigger AI generation for the new comment's title/description
    triggerGeneration(commentId);
  }, [getSelectedNodes, setNodes, triggerGeneration]);

  return (
    <div className="flex h-screen w-full">
      {/* Autopilot Sidebar (left) */}
      <AutopilotSidebar
        nodes={nodes}
        edges={edges}
        onApplyChanges={handleApplyAutopilotChanges}
        onUndoChanges={undoAutopilotChanges}
        isOpen={autopilotOpen}
        onToggle={() => setAutopilotOpen(!autopilotOpen)}
        suggestions={suggestions}
        suggestionsLoading={suggestionsLoading}
        onRefreshSuggestions={refreshSuggestions}
        onMessageSent={handleAutopilotMessageSent}
        pendingMessage={pendingAutopilotMessage ?? undefined}
        onPendingMessageConsumed={() => setPendingAutopilotMessage(null)}
        clearHistoryTrigger={autopilotClearTrigger}
      />
      <div ref={reactFlowWrapper} className="flex-1 h-full bg-muted/10 relative">
        <NodeToolbar
          isOpen={nodesPaletteOpen}
          onClose={() => setNodesPaletteOpen(false)}
          onAddNode={handleAddNodeAtCenter}
        />
        <CommentEditContext.Provider value={{ markUserEdited }}>
          <ConnectionContext.Provider value={{ isConnecting, connectingFromNodeId }}>
            <FlowContextMenu
              hasSelection={hasSelection}
              onCommentAround={handleCommentAround}
            >
              <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              isValidConnection={isValidConnection}
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
              onMoveStart={() => setIsPanning(true)}
              onMoveEnd={() => setIsPanning(false)}
              onPaneClick={handlePaneClick}
              onNodeClick={handleNodeClick}
            >
              <Background
                variant={bgSettings.variant}
                color={bgSettings.color}
                gap={bgSettings.gap}
                size={bgSettings.size}
                style={{ backgroundColor: bgSettings.bgColor }}
              />
              <Controls />
            </ReactFlow>
            </FlowContextMenu>
          </ConnectionContext.Provider>
        </CommentEditContext.Provider>
        {/* Top center branding */}
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-4 pb-8 bg-gradient-to-b from-black/90 to-transparent">
          <AvyLogo isPanning={isPanning} canvasWidth={canvasWidth} />
        </div>
        {/* Autopilot and Flow (top left) */}
        <TooltipProvider delayDuration={200}>
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            {/* Autopilot */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setAutopilotOpen(!autopilotOpen)}
                  className={`flex items-center px-2.5 py-2 transition-colors rounded-full border bg-background/50 backdrop-blur-sm text-sm cursor-pointer ${
                    canvasWidth > 800 ? "gap-1.5" : ""
                  } ${
                    autopilotOpen
                      ? "text-foreground border-muted-foreground/40"
                      : "text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-muted-foreground/40"
                  }`}
                >
                  <PanelLeft className="w-4 h-4 shrink-0" />
                  {canvasWidth > 800 && <span>AI</span>}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-neutral-800 text-white border-neutral-700">
                Composer AI
              </TooltipContent>
            </Tooltip>
            {/* Flow dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center px-2.5 py-2 text-muted-foreground/60 hover:text-foreground transition-colors rounded-full border border-muted-foreground/20 hover:border-muted-foreground/40 bg-background/50 backdrop-blur-sm text-sm cursor-pointer ${
                    canvasWidth > 800 ? "gap-1.5" : ""
                  }`}
                  title="Files"
                >
                  <Folder className="w-4 h-4 shrink-0" />
                  {canvasWidth > 800 && (
                    <>
                      <span>Flow</span>
                      <span className="w-px h-4 bg-muted-foreground/30 mx-1 shrink-0" />
                      <span className="font-mono">{flowId}</span>
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="bg-neutral-900 border-neutral-700 text-white min-w-[160px]"
              >
                <DropdownMenuItem
                  onClick={handleNewFlow}
                  className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
                >
                  <FilePlus className="h-4 w-4 mr-2" />
                  New Flow
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-neutral-700" />
                <DropdownMenuItem
                  onClick={() => setMyFlowsDialogOpen(true)}
                  className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  My Flows
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleOpenFlow}
                  className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open from file...
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSaveDialogOpen(true)}
                  className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>
        {/* Settings, Profile, and Preview icons (top right, left of responses sidebar) */}
        <TooltipProvider delayDuration={200}>
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSettingsOpen(true)}
                  className={`p-2 transition-colors rounded-full border bg-background/50 backdrop-blur-sm relative cursor-pointer ${
                    showSettingsWarning
                      ? "text-amber-400 hover:text-amber-300 border-amber-500/50 hover:border-amber-400/50"
                      : "text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-muted-foreground/40"
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  {showSettingsWarning && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-neutral-800 text-white border-neutral-700">
                {showSettingsWarning ? "Configure API Keys" : "Settings"}
              </TooltipContent>
            </Tooltip>
            {/* Profile */}
            <ProfileDropdown />
            {/* Preview Sidebar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setResponsesOpen(!responsesOpen)}
                  className={`flex items-center px-2.5 py-2 transition-colors rounded-full border bg-background/50 backdrop-blur-sm text-sm cursor-pointer ${
                    canvasWidth > 800 ? "gap-1.5" : ""
                  } ${
                    responsesOpen
                      ? "text-foreground border-muted-foreground/40"
                      : "text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-muted-foreground/40"
                  }`}
                >
                  {canvasWidth > 800 && <span>Preview</span>}
                  <PanelRight className="w-4 h-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-neutral-800 text-white border-neutral-700">
                Preview
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
        <ActionBar
          onToggleNodes={() => setNodesPaletteOpen(!nodesPaletteOpen)}
          onCommentAround={handleCommentAround}
          onRun={runFlow}
          onCancel={cancelFlow}
          onReset={resetExecution}
          nodesPaletteOpen={nodesPaletteOpen}
          isRunning={isRunning}
          hasSelection={hasSelection}
        />
      </div>
      <ResponsesSidebar
        entries={previewEntries}
        debugEntries={debugEntries}
        activeTab={activeResponseTab}
        onTabChange={setActiveResponseTab}
        keyError={keyError}
        isOpen={responsesOpen}
      />
      <SaveFlowDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveFlow}
        defaultName={flowMetadata?.name || "My Flow"}
        isSaving={isSaving}
        existingFlowId={currentFlowId}
      />
      <MyFlowsDialog
        open={myFlowsDialogOpen}
        onOpenChange={setMyFlowsDialogOpen}
        onLoadFlow={handleLoadCloudFlow}
      />
      <SettingsDialogControlled
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <TemplatesModal
        open={templatesModalOpen}
        onOpenChange={setTemplatesModalOpen}
        onSelectTemplate={handleSelectTemplate}
        onDismiss={loadBlankCanvas}
        onDismissPermanently={dismissTemplatesPermanently}
        onSubmitPrompt={handleTemplatesPromptSubmit}
      />
      <WelcomeDialog onOpenSettings={() => setSettingsOpen(true)} />
    </div>
  );
}
