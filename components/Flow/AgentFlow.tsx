"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
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
import { FlowHeader } from "./FlowHeader";
import { SaveFlowDialog, type SaveMode } from "./SaveFlowDialog";
import { MyFlowsDialog } from "./MyFlowsDialog";
import { FlowContextMenu } from "./FlowContextMenu";
import { CommentEditContext } from "./CommentEditContext";
import { CollaboratorCursors } from "./CollaboratorCursors";
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
import { useCommentAround } from "@/lib/hooks/useCommentAround";
import type { NodeType } from "@/types/flow";
import { SettingsDialogControlled } from "./SettingsDialogControlled";
import { WelcomeDialog, isNuxComplete } from "./WelcomeDialog";
import { TemplatesModal } from "./TemplatesModal";
import { useTemplatesModal } from "./TemplatesModal/hooks";
// executeFlow and NodeExecutionState now used in useFlowExecution hook
import type { FlowChanges, AddNodeAction, AddEdgeAction, RemoveEdgeAction, RemoveNodeAction, AppliedChangesInfo, RemovedNodeInfo, RemovedEdgeInfo, PendingAutopilotMessage, AutopilotMode, AutopilotModel } from "@/lib/autopilot/types";
import { ResponsesSidebar, type PreviewEntry, type DebugEntry } from "./ResponsesSidebar";
import { useApiKeys, type ProviderId } from "@/lib/api-keys";
import type { FlowMetadata } from "@/lib/flow-storage";
import { useBackgroundSettings, getBackgroundStyle } from "@/lib/hooks/useBackgroundSettings";
import { ShareDialog } from "./ShareDialog";
import { useCollaboration, type CollaborationModeProps } from "@/lib/hooks/useCollaboration";
import { loadFlow } from "@/lib/flows/api";

let id = 0;
const getId = () => `node_${id++}`;
const setIdCounter = (newId: number) => { id = newId; };
const CURSOR_BROADCAST_THROTTLE_MS = 50;

// ID counter initialized at 0, updated when loading templates or flows

export interface AgentFlowProps {
  collaborationMode?: CollaborationModeProps;
}

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

export function AgentFlow({ collaborationMode }: AgentFlowProps) {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const lastCursorBroadcastRef = useRef<number>(0);
  const lastCursorPositionRef = useRef<{ x: number; y: number } | null>(null);

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
    shareToken: collaborationMode?.shareToken,
    useOwnerKeys: collaborationMode?.useOwnerKeys,
  });

  // Canvas width for responsive sizing (labels, logo)
  const [canvasWidth, setCanvasWidth] = useState<number>(0);

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
  // Initialize from localStorage to match sidebar's stored width (avoids animation mismatch)
  const [autopilotWidth, setAutopilotWidth] = useState(() => {
    if (typeof window === "undefined") return 380;
    const saved = localStorage.getItem("autopilot-sidebar-width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 320 && parsed <= 600) return parsed;
    }
    return 380;
  });
  // Responses sidebar width (initialize from localStorage like autopilot)
  const [responsesWidth, setResponsesWidth] = useState(() => {
    if (typeof window === "undefined") return 340;
    const saved = localStorage.getItem("responses-sidebar-width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 240 && parsed <= 800) return parsed;
    }
    return 340;
  });
  // Track resize state from both sidebars for synchronized header animations
  const [leftResizing, setLeftResizing] = useState(false);
  const [rightResizing, setRightResizing] = useState(false);
  const isAnyResizing = leftResizing || rightResizing;

  // Width change handlers for sidebars
  const handleAutopilotWidthChange = useCallback((width: number, isResizing: boolean) => {
    setAutopilotWidth(width);
    setLeftResizing(isResizing);
  }, []);

  const handleResponsesWidthChange = useCallback((width: number, isResizing: boolean) => {
    setResponsesWidth(width);
    setRightResizing(isResizing);
  }, []);

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
      const result = applyAutopilotChanges(changes);
      // Fit view after autopilot changes (with delay for DOM update)
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.2 });
      }, 50);
      return result;
    },
    [applyAutopilotChanges, takeSnapshot]
  );

  const [responsesOpen, setResponsesOpen] = useState(false);

  // Flow operations hook
  const {
    flowMetadata,
    currentFlowId,
    isSaving,
    saveDialogOpen,
    setSaveDialogOpen,
    myFlowsDialogOpen,
    setMyFlowsDialogOpen,
    handleNewFlow,
    handleSelectTemplate,
    handleSaveFlow,
    saveFlowToCloud,
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
  });

  // Published flow info state (for owner collaboration mode and ShareDialog)
  const [publishedFlowInfo, setPublishedFlowInfo] = useState<{
    flowId: string;
    liveId: string;
    shareToken: string;
    useOwnerKeys: boolean;
  } | null>(null);

  // Build owner collaboration mode when flow is published and we're not already in collaborator mode
  const ownerCollaborationMode = useMemo(() => {
    if (collaborationMode || !publishedFlowInfo?.shareToken) return undefined;
    return {
      shareToken: publishedFlowInfo.shareToken,
      liveId: publishedFlowInfo.liveId,
      initialFlow: null, // Owner already has flow loaded
      isOwner: true,
    };
  }, [collaborationMode, publishedFlowInfo]);

  // Use prop-based collaboration mode (for /[code]/[token] route) or owner mode (for / route with published flow)
  const effectiveCollaborationMode = collaborationMode ?? ownerCollaborationMode;

  // Collaboration mode hook
  const {
    isCollaborating,
    liveId,
    shareToken,
    flowName: collaborationFlowName,
    isSaving: isCollaborationSaving,
    isRealtimeConnected,
    collaborators,
    broadcastCursor,
    isOwner,
  } = useCollaboration({
    collaborationMode: effectiveCollaborationMode,
    nodes,
    edges,
    setNodes,
    setEdges,
    reactFlowInstance,
    setIdCounter,
  });

  const liveSession = useMemo(() => {
    if (publishedFlowInfo && currentFlowId) {
      return {
        flowId: currentFlowId,
        liveId: publishedFlowInfo.liveId,
        shareToken: publishedFlowInfo.shareToken,
        useOwnerKeys: publishedFlowInfo.useOwnerKeys,
      };
    }

    if (isCollaborating && liveId && shareToken) {
      return {
        flowId: undefined,
        liveId,
        shareToken,
        useOwnerKeys: collaborationMode?.initialFlow?.flow.use_owner_keys ?? false,
      };
    }

    return null;
  }, [publishedFlowInfo, currentFlowId, isCollaborating, liveId, shareToken, collaborationMode]);

  // Templates modal hook (after useCollaboration so we have isCollaborating)
  const {
    isOpen: templatesModalOpen,
    open: openTemplatesModal,
    close: closeTemplatesModal,
    dismissPermanently: dismissTemplatesPermanently,
  } = useTemplatesModal({
    isLoaded,
    isCollaborating,
    nodes,
    edges,
    flowMetadata,
  });

  // Calculate available space between sidebars for responsive labels
  // Only subtract autopilot width (overlay) - responses sidebar is a flex sibling,
  // so canvasWidth already reflects its presence via ResizeObserver
  const availableWidth = useMemo(() => {
    const leftOffset = autopilotOpen ? autopilotWidth : 0;
    return canvasWidth - leftOffset;
  }, [canvasWidth, autopilotOpen, autopilotWidth]);

  const showLabels = availableWidth > 600;

  const statuses = getKeyStatuses();
  const hasAnyKey = statuses.some((s) => s.hasKey);
  const showSettingsWarning = !isDevMode && !hasAnyKey;

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Live settings popover state
  const [livePopoverOpen, setLivePopoverOpen] = useState(false);

  const handleDisconnect = useCallback(() => {
    setLivePopoverOpen(false);
    router.replace("/");
  }, [router]);

  // Fetch published state when flow loads
  useEffect(() => {
    if (!currentFlowId) {
      setPublishedFlowInfo(null);
      return;
    }

    let isActive = true;
    const flowId = currentFlowId;

    loadFlow(flowId).then((result) => {
      if (!isActive) return;
      // Access result.metadata (FlowRecord), not result.flow (SavedFlow)
      if (result.success && result.metadata) {
        const record = result.metadata;
        if (record.live_id && record.share_token) {
          setPublishedFlowInfo({
            flowId,
            liveId: record.live_id,
            shareToken: record.share_token,
            useOwnerKeys: record.use_owner_keys,
          });
        } else {
          setPublishedFlowInfo((prev) => (prev?.flowId === flowId ? prev : null));
        }
      } else {
        setPublishedFlowInfo((prev) => (prev?.flowId === flowId ? prev : null));
      }
    });

    return () => {
      isActive = false;
    };
  }, [currentFlowId]);

  // Unpublish flow when owner leaves the page
  useEffect(() => {
    if (!isOwner || !currentFlowId || !publishedFlowInfo) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery during page unload
      navigator.sendBeacon(
        `/api/flows/${currentFlowId}/publish`,
        new Blob([JSON.stringify({ _method: "DELETE" })], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isOwner, currentFlowId, publishedFlowInfo]);

  // Auto-open settings dialog when no API keys are configured
  // Only show if NUX is complete (step 2 of NUX guides users to API keys)
  // Skip in collaboration mode - collaborators may use owner's keys
  useEffect(() => {
    if (isLoaded && !isDevMode && !hasAnyKey && isNuxComplete() && !isCollaborating) {
      setSettingsOpen(true);
    }
  }, [isLoaded, isDevMode, hasAnyKey, isCollaborating]);

  const [pendingAutopilotMessage, setPendingAutopilotMessage] = useState<PendingAutopilotMessage | null>(null);

  // Dismiss templates modal when node palette opens (user clicks "Add Node")
  const prevNodesPaletteOpen = useRef(nodesPaletteOpen);
  useEffect(() => {
    const wasClosedNowOpen = !prevNodesPaletteOpen.current && nodesPaletteOpen;
    prevNodesPaletteOpen.current = nodesPaletteOpen;

    if (wasClosedNowOpen && templatesModalOpen) {
      closeTemplatesModal();
    }
  }, [nodesPaletteOpen, templatesModalOpen, closeTemplatesModal]);

  // Dismiss templates modal when user sends autopilot message
  const handleAutopilotMessageSent = useCallback(() => {
    if (templatesModalOpen) {
      closeTemplatesModal();
    }
  }, [templatesModalOpen, closeTemplatesModal]);

  // Handle prompt submission from templates modal
  const handleTemplatesPromptSubmit = useCallback((
    prompt: string,
    mode: AutopilotMode,
    model: AutopilotModel,
    thinkingEnabled: boolean
  ) => {
    setPendingAutopilotMessage({ prompt, mode, model, thinkingEnabled });
    setAutopilotOpen(true);
  }, []);

  // Background settings
  const { settings: bgSettings } = useBackgroundSettings();

  // Comment AI suggestion hook
  const { triggerGeneration, markUserEdited } = useCommentSuggestions({
    nodes,
    setNodes,
  });

  // Comment-around hook (wraps selected nodes in a comment)
  const { hasSelection, handleCommentAround } = useCommentAround({
    nodes,
    setNodes,
    triggerGeneration,
    getId,
    onBeforeChange: takeSnapshot,
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

  const broadcastCursorFromClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!isCollaborating || !reactFlowInstance.current) return;

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;

      const now = Date.now();
      if (now - lastCursorBroadcastRef.current < CURSOR_BROADCAST_THROTTLE_MS) {
        return;
      }

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      const lastPosition = lastCursorPositionRef.current;
      if (
        lastPosition &&
        Math.abs(lastPosition.x - position.x) < 0.25 &&
        Math.abs(lastPosition.y - position.y) < 0.25
      ) {
        return;
      }

      lastCursorBroadcastRef.current = now;
      lastCursorPositionRef.current = position;
      broadcastCursor(position);
    },
    [broadcastCursor, isCollaborating]
  );

  const handlePaneMouseMove = useCallback(
    (event: MouseEvent) => {
      broadcastCursorFromClient(event.clientX, event.clientY);
    },
    [broadcastCursorFromClient]
  );

  useEffect(() => {
    if (!isCollaborating) return;

    const handlePointerMove = (event: PointerEvent) => {
      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;
      const target = event.target;
      if (target instanceof HTMLElement && !wrapper.contains(target)) return;

      broadcastCursorFromClient(event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [broadcastCursorFromClient, isCollaborating]);

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
        onWidthChange={handleAutopilotWidthChange}
      />
      <div
        ref={reactFlowWrapper}
        className="flex-1 h-full bg-muted/10 relative"
        onMouseMove={handlePaneMouseMove}
      >
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
                style={{ background: getBackgroundStyle(bgSettings) }}
              />
              <Controls />
              <CollaboratorCursors collaborators={collaborators} />
            </ReactFlow>
            </FlowContextMenu>
          </ConnectionContext.Provider>
        </CommentEditContext.Provider>
        <FlowHeader
          autopilotOpen={autopilotOpen}
          autopilotWidth={autopilotWidth}
          responsesOpen={responsesOpen}
          responsesWidth={responsesWidth}
          isResizing={isAnyResizing}
          onAutopilotToggle={() => setAutopilotOpen(!autopilotOpen)}
          onResponsesToggle={() => setResponsesOpen(!responsesOpen)}
          onSettingsOpen={() => setSettingsOpen(true)}
          liveSession={liveSession}
          isCollaborating={isCollaborating}
          isOwner={isOwner}
          collaborators={collaborators}
          isRealtimeConnected={isRealtimeConnected}
          collaborationFlowName={collaborationFlowName}
          isCollaborationSaving={isCollaborationSaving}
          showLabels={showLabels}
          showSettingsWarning={showSettingsWarning}
          livePopoverOpen={livePopoverOpen}
          onLivePopoverChange={setLivePopoverOpen}
          shareDialogOpen={shareDialogOpen}
          onShareDialogChange={setShareDialogOpen}
          onNewFlow={handleNewFlow}
          onOpenTemplates={openTemplatesModal}
          onOpenMyFlows={() => setMyFlowsDialogOpen(true)}
          onOpenFlow={handleOpenFlow}
          onSaveFlow={() => setSaveDialogOpen(true)}
          onDisconnect={handleDisconnect}
          onUnpublish={() => setPublishedFlowInfo(null)}
          onOwnerKeysChange={(enabled) => setPublishedFlowInfo(prev => prev ? { ...prev, useOwnerKeys: enabled } : null)}
          isPanning={isPanning}
          canvasWidth={canvasWidth}
        />
        <ActionBar
          onToggleNodes={() => setNodesPaletteOpen(!nodesPaletteOpen)}
          onCommentAround={handleCommentAround}
          onRun={runFlow}
          onCancel={cancelFlow}
          onReset={resetExecution}
          nodesPaletteOpen={nodesPaletteOpen}
          isRunning={isRunning}
          hasSelection={hasSelection}
          autopilotWidth={autopilotWidth}
          autopilotOpen={autopilotOpen}
          isResizing={isAnyResizing}
        />
      </div>
      <ResponsesSidebar
        entries={previewEntries}
        debugEntries={debugEntries}
        activeTab={activeResponseTab}
        onTabChange={setActiveResponseTab}
        keyError={keyError}
        isOpen={responsesOpen}
        onWidthChange={handleResponsesWidthChange}
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
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        flowId={currentFlowId}
        flowName={flowMetadata?.name || "Untitled Flow"}
        initialLiveId={publishedFlowInfo?.liveId}
        initialShareToken={publishedFlowInfo?.shareToken}
        initialUseOwnerKeys={publishedFlowInfo?.useOwnerKeys}
        onPublish={(flowId, liveId, shareToken, useOwnerKeys) => {
          setPublishedFlowInfo({ flowId, liveId, shareToken, useOwnerKeys });
          // Open the live settings popover after a brief delay to let the dialog close
          setTimeout(() => setLivePopoverOpen(true), 100);
        }}
        onSaveFlow={saveFlowToCloud}
        isSaving={isSaving}
      />
      <TemplatesModal
        open={templatesModalOpen}
        onClose={closeTemplatesModal}
        onDismissPermanently={dismissTemplatesPermanently}
        onSelectTemplate={handleSelectTemplate}
        onSubmitPrompt={handleTemplatesPromptSubmit}
      />
      <WelcomeDialog onDone={isCollaborating ? undefined : () => {
        handleNewFlow();
        openTemplatesModal();
      }} />
    </div>
  );
}
