import { useCallback, useEffect, useRef, useState } from "react";
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { PerfectCursor } from "perfect-cursors";
import { recordToNode, recordToEdge, nodeToRecord, edgeToRecord } from "@/lib/flows/transform";
import { updateLiveFlow, type LiveFlowChanges } from "@/lib/flows/api";
import type { FlowNodeRecord, FlowEdgeRecord, LiveFlowData } from "@/lib/flows/types";

type SetNodes = React.Dispatch<React.SetStateAction<Node[]>>;
type SetEdges = React.Dispatch<React.SetStateAction<Edge[]>>;

// Broadcast message types for realtime sync
type BroadcastMessage =
  | { type: "nodes_updated"; nodes: NodePayload[]; senderId: string }
  | { type: "positions_updated"; positions: PositionPayload[]; senderId: string }
  | { type: "edges_updated"; edges: EdgePayload[]; senderId: string }
  | { type: "nodes_deleted"; nodeIds: string[]; senderId: string }
  | { type: "edges_deleted"; edgeIds: string[]; senderId: string }
  | { type: "cursor_moved"; userId: string; position: { x: number; y: number } }
  | { type: "user_joined"; userId: string; name?: string; isOwner?: boolean }
  | { type: "user_left"; userId: string };

interface NodePayload {
  id: string;
  type: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  data: Record<string, unknown>;
  parentId?: string;
}

type PositionUpdate = Pick<NodePayload, "id" | "position">;
type PositionPayload = PositionUpdate & { version: number };

interface EdgePayload {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface Collaborator {
  userId: string;
  name?: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
  isOwner?: boolean;
}

// Generate a unique session ID for this client
const generateSessionId = () => `user_${Math.random().toString(36).substring(2, 11)}`;

export interface CollaborationModeProps {
  shareToken: string;
  liveId: string;
  initialFlow: {
    flow: LiveFlowData["flow"];
    nodes: FlowNodeRecord[];
    edges: FlowEdgeRecord[];
  } | null;
  /** True when the current user is the owner of the flow (editing at /) */
  isOwner?: boolean;
}

export interface UseCollaborationOptions {
  collaborationMode?: CollaborationModeProps;
  nodes: Node[];
  edges: Edge[];
  setNodes: SetNodes;
  setEdges: SetEdges;
  reactFlowInstance: React.MutableRefObject<ReactFlowInstance | null>;
  setIdCounter: (id: number) => void;
}

export interface UseCollaborationReturn {
  isCollaborating: boolean;
  shareToken: string | null;
  liveId: string | null;
  flowName: string | null;
  isSaving: boolean;
  lastSaveError: string | null;
  // Triggers a save (debounced internally)
  triggerSave: () => void;
  // Force immediate save
  saveNow: () => Promise<void>;
  // Realtime sync status
  isRealtimeConnected: boolean;
  collaborators: Collaborator[];
  // Broadcast cursor position for presence
  broadcastCursor: (position: { x: number; y: number }) => void;
  // True if current user is the flow owner
  isOwner: boolean;
}

// Update ID counter based on existing nodes
const updateIdCounter = (nodes: Node[], setIdCounter: (id: number) => void) => {
  const maxId = nodes.reduce((max, node) => {
    const match = node.id.match(/node_(\d+)/);
    if (match) {
      return Math.max(max, parseInt(match[1], 10));
    }
    return max;
  }, -1);
  setIdCounter(maxId + 1);
};

// Initialize Supabase client for realtime
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

const BROADCAST_THROTTLE_MS = 50;

/**
 * Hook for collaboration mode - handles live flow initialization, debounced saving, and realtime sync
 */
export function useCollaboration({
  collaborationMode,
  nodes,
  edges,
  setNodes,
  setEdges,
  reactFlowInstance,
  setIdCounter,
}: UseCollaborationOptions): UseCollaborationReturn {
  const isCollaborating = !!collaborationMode;
  const shareToken = collaborationMode?.shareToken ?? null;
  const liveId = collaborationMode?.liveId ?? null;
  const isOwner = collaborationMode?.isOwner ?? false;

  const [flowName, setFlowName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Realtime sync state
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const sessionIdRef = useRef<string>(generateSessionId());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isApplyingRemoteRef = useRef(false); // Flag to prevent re-broadcasting received changes
  const skipInitialBroadcastRef = useRef(false); // Skip first broadcast in owner mode

  // Track previous state for diffing
  const prevNodesRef = useRef<Node[]>([]);
  const prevEdgesRef = useRef<Edge[]>([]);
  const lastBroadcastTimeRef = useRef<number>(0);
  const lastBroadcastNodesRef = useRef<Node[]>([]);
  const lastBroadcastEdgesRef = useRef<Edge[]>([]);
  const positionVersionRef = useRef<Map<string, number>>(new Map());
  const lastAppliedPositionVersionRef = useRef<Map<string, number>>(new Map());
  // Track nodes we're actively dragging - ignore incoming updates for these
  const draggingNodesRef = useRef<Set<string>>(new Set());
  // PerfectCursor instances for smooth position interpolation (one per node)
  const nodeCursorsRef = useRef<Map<string, PerfectCursor>>(new Map());

  // Debounce timer
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getNodeChangeSummary = useCallback(
    (prevNodes: Node[], newNodes: Node[]):
    | { type: "none" }
    | { type: "position"; positions: PositionUpdate[] }
    | { type: "full" } => {
      if (prevNodes.length !== newNodes.length) return { type: "full" };

      const prevById = new Map(prevNodes.map((node) => [node.id, node]));
      const positions: PositionUpdate[] = [];

      for (const current of newNodes) {
        const previous = prevById.get(current.id);
        if (!previous) return { type: "full" };

        const posChanged =
          previous.position.x !== current.position.x ||
          previous.position.y !== current.position.y;
        const dataChanged = previous.data !== current.data;
        const sizeChanged =
          previous.width !== current.width || previous.height !== current.height;
        const typeChanged = previous.type !== current.type;
        const parentChanged = previous.parentId !== current.parentId;

        if (dataChanged || sizeChanged || typeChanged || parentChanged) return { type: "full" };
        if (posChanged) {
          positions.push({ id: current.id, position: current.position });
        }
      }

      if (positions.length === 0) return { type: "none" };
      return { type: "position", positions };
    },
    []
  );

  const buildPositionPayloads = useCallback((positions: PositionUpdate[]): PositionPayload[] => {
    return positions.map((position) => {
      const currentVersion = positionVersionRef.current.get(position.id) ?? 0;
      const nextVersion = currentVersion + 1;
      positionVersionRef.current.set(position.id, nextVersion);
      return { ...position, version: nextVersion };
    });
  }, []);

  const areEdgesEquivalent = useCallback((prevEdges: Edge[], nextEdges: Edge[]): boolean => {
    if (prevEdges.length !== nextEdges.length) return false;

    const prevById = new Map(prevEdges.map((edge) => [edge.id, edge]));
    for (const current of nextEdges) {
      const previous = prevById.get(current.id);
      if (!previous) return false;

      if (
        previous.source !== current.source ||
        previous.target !== current.target ||
        previous.sourceHandle !== current.sourceHandle ||
        previous.targetHandle !== current.targetHandle ||
        previous.type !== current.type ||
        previous.data !== current.data
      ) {
        return false;
      }
    }

    return true;
  }, []);

  // Initialize flow from collaboration data
  useEffect(() => {
    if (!collaborationMode || initialized) return;

    // Owner mode: initialFlow is null, owner already has the flow loaded
    // Initialize refs with current state to prevent spurious initial broadcast
    if (collaborationMode.isOwner && !collaborationMode.initialFlow) {
      // Capture current state as baseline - any future changes will be diffed against this
      prevNodesRef.current = nodes;
      prevEdgesRef.current = edges;
      lastBroadcastNodesRef.current = nodes;
      lastBroadcastEdgesRef.current = edges;
      // Skip the first broadcast to avoid sync conflicts on join
      // The owner's state is already loaded; wait for remote updates first
      skipInitialBroadcastRef.current = true;
      setInitialized(true);
      return;
    }

    // Collaborator mode: load flow from initialFlow data
    if (!collaborationMode.initialFlow) return;

    const { flow, nodes: nodeRecords, edges: edgeRecords } = collaborationMode.initialFlow;

    // Convert DB records to React Flow format
    const convertedNodes = nodeRecords.map(recordToNode);
    const convertedEdges = edgeRecords.map(recordToEdge);

    setNodes(convertedNodes);
    setEdges(convertedEdges);
    setFlowName(flow?.name || "Untitled Flow");

    // Update refs to track initial state
    prevNodesRef.current = convertedNodes;
    prevEdgesRef.current = convertedEdges;

    // Update ID counter to avoid collisions
    updateIdCounter(convertedNodes, setIdCounter);

    setInitialized(true);

    // Fit view after a short delay
    setTimeout(() => {
      reactFlowInstance.current?.fitView({ padding: 0.2 });
    }, 100);
  }, [collaborationMode, initialized, nodes, edges, setNodes, setEdges, setIdCounter, reactFlowInstance]);

  // Save changes to live flow
  const performSave = useCallback(async () => {
    if (!shareToken || !isCollaborating) return;

    // Calculate diff
    const prevNodeIds = new Set(prevNodesRef.current.map((n) => n.id));
    const prevEdgeIds = new Set(prevEdgesRef.current.map((e) => e.id));
    const currentNodeIds = new Set(nodes.map((n) => n.id));
    const currentEdgeIds = new Set(edges.map((e) => e.id));

    // Find deleted nodes and edges
    const deletedNodeIds = [...prevNodeIds].filter((id) => !currentNodeIds.has(id));
    const deletedEdgeIds = [...prevEdgeIds].filter((id) => !currentEdgeIds.has(id));

    // Find added or modified nodes (we send all current nodes for simplicity)
    // In a more optimized version, we'd track which nodes actually changed
    const nodeRecords = nodes
      .filter((n) => n.type !== "comment" || n.data) // Include all valid nodes
      .map((n) => nodeToRecord(n, ""));

    const edgeRecords = edges.map((e) => edgeToRecord(e, ""));

    // Build changes object
    const changes: LiveFlowChanges = {};

    if (nodeRecords.length > 0) {
      changes.nodes = nodeRecords;
    }
    if (edgeRecords.length > 0) {
      changes.edges = edgeRecords;
    }
    if (deletedNodeIds.length > 0) {
      changes.deletedNodeIds = deletedNodeIds;
    }
    if (deletedEdgeIds.length > 0) {
      changes.deletedEdgeIds = deletedEdgeIds;
    }

    // Skip save if no changes
    if (
      !changes.nodes &&
      !changes.edges &&
      !changes.deletedNodeIds &&
      !changes.deletedEdgeIds
    ) {
      return;
    }

    setIsSaving(true);
    setLastSaveError(null);

    try {
      const result = await updateLiveFlow(shareToken, changes);
      if (!result.success) {
        setLastSaveError(result.error || "Failed to save");
        console.error("Failed to save live flow:", result.error);
      } else {
        // Update refs to current state after successful save
        prevNodesRef.current = [...nodes];
        prevEdgesRef.current = [...edges];
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      setLastSaveError(message);
      console.error("Error saving live flow:", error);
    } finally {
      setIsSaving(false);
    }
  }, [shareToken, isCollaborating, nodes, edges]);

  // Trigger a debounced save
  const triggerSave = useCallback(() => {
    if (!isCollaborating) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout (500ms debounce)
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
      saveTimeoutRef.current = null;
    }, 500);
  }, [isCollaborating, performSave]);

  // Force immediate save
  const saveNow = useCallback(async () => {
    if (!isCollaborating) return;

    // Clear pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    await performSave();
  }, [isCollaborating, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Dispose all PerfectCursor instances
      for (const cursor of nodeCursorsRef.current.values()) {
        cursor.dispose();
      }
      nodeCursorsRef.current.clear();
    };
  }, []);

  // Auto-save on changes when collaborating
  useEffect(() => {
    if (!isCollaborating || !initialized) return;

    // Trigger save when nodes or edges change
    triggerSave();
  }, [nodes, edges, isCollaborating, initialized, triggerSave]);

  // Convert React Flow Node to broadcast payload
  const nodeToPayload = useCallback((node: Node): NodePayload => ({
    id: node.id,
    type: node.type || "default",
    position: node.position,
    width: node.measured?.width ?? (node.width as number | undefined),
    height: node.measured?.height ?? (node.height as number | undefined),
    data: node.data as Record<string, unknown>,
    parentId: node.parentId,
  }), []);

  // Convert React Flow Edge to broadcast payload
  const edgeToPayload = useCallback((edge: Edge): EdgePayload => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle ?? undefined,
    target: edge.target,
    targetHandle: edge.targetHandle ?? undefined,
    type: edge.type,
    data: edge.data as Record<string, unknown> | undefined,
  }), []);

  // Get or create a PerfectCursor for a node
  // The cursor smoothly interpolates positions and calls back with each frame
  const getNodeCursor = useCallback((nodeId: string): PerfectCursor => {
    let cursor = nodeCursorsRef.current.get(nodeId);
    if (!cursor) {
      cursor = new PerfectCursor((point) => {
        // This callback is called by PerfectCursor on each animation frame
        // Update the node position smoothly
        setNodes((currentNodes) => {
          const idx = currentNodes.findIndex((n) => n.id === nodeId);
          if (idx === -1) return currentNodes;

          const node = currentNodes[idx];
          const newPosition = { x: point[0], y: point[1] };

          // Skip if position is unchanged
          if (node.position.x === newPosition.x && node.position.y === newPosition.y) {
            return currentNodes;
          }

          const updated = [...currentNodes];
          updated[idx] = { ...node, position: newPosition };

          // Update refs to prevent re-broadcasting this interpolated position
          prevNodesRef.current = updated;
          lastBroadcastNodesRef.current = updated;

          return updated;
        });
      });
      nodeCursorsRef.current.set(nodeId, cursor);
    }
    return cursor;
  }, [setNodes]);

  // Apply incoming node updates from remote collaborators
  // Uses PerfectCursor for smooth position interpolation
  const applyRemoteNodeUpdates = useCallback((payloads: NodePayload[], senderId: string) => {
    if (senderId === sessionIdRef.current) return;

    isApplyingRemoteRef.current = true;

    setNodes((currentNodes) => {
      const nodeMap = new Map(currentNodes.map((n) => [n.id, n]));

      for (const payload of payloads) {
        const existing = nodeMap.get(payload.id);
        if (existing) {
          // Skip position updates for nodes we're actively dragging
          const isDragging = draggingNodesRef.current.has(payload.id);

          // Check if position changed
          const posChanged =
            existing.position.x !== payload.position.x ||
            existing.position.y !== payload.position.y;

          // Apply non-position properties immediately
          nodeMap.set(payload.id, {
            ...existing,
            // Keep current position - PerfectCursor will handle interpolation
            position: existing.position,
            width: payload.width,
            height: payload.height,
            data: payload.data,
            parentId: payload.parentId,
          });

          // Use PerfectCursor for smooth position interpolation (unless dragging)
          if (posChanged && !isDragging) {
            const cursor = getNodeCursor(payload.id);
            cursor.addPoint([payload.position.x, payload.position.y]);
          }
        } else {
          // New node - apply position immediately (no flicker since it's new)
          nodeMap.set(payload.id, {
            id: payload.id,
            type: payload.type,
            position: payload.position,
            width: payload.width,
            height: payload.height,
            data: payload.data,
            parentId: payload.parentId,
          });
        }
      }

      const result = Array.from(nodeMap.values());
      prevNodesRef.current = result;
      lastBroadcastNodesRef.current = result;
      return result;
    });

    // Reset flag after current event loop
    setTimeout(() => { isApplyingRemoteRef.current = false; }, 0);
  }, [setNodes, getNodeCursor]);

  // Apply incoming position-only updates from remote collaborators
  const applyRemotePositionUpdates = useCallback(
    (positions: PositionPayload[], senderId: string) => {
      if (senderId === sessionIdRef.current) return;
      if (positions.length === 0) return;

      isApplyingRemoteRef.current = true;

      for (const update of positions) {
        // Skip nodes we're actively dragging
        if (draggingNodesRef.current.has(update.id)) {
          continue;
        }

        // Version check to ignore stale updates
        const versionKey = `${senderId}:${update.id}`;
        const lastVersion = lastAppliedPositionVersionRef.current.get(versionKey) ?? 0;
        if (update.version <= lastVersion) {
          continue;
        }
        lastAppliedPositionVersionRef.current.set(versionKey, update.version);

        // Use PerfectCursor for smooth interpolation
        const cursor = getNodeCursor(update.id);
        cursor.addPoint([update.position.x, update.position.y]);
      }

      // Reset flag after current event loop
      setTimeout(() => { isApplyingRemoteRef.current = false; }, 0);
    },
    [getNodeCursor]
  );

  // Apply incoming edge updates from remote collaborators
  const applyRemoteEdgeUpdates = useCallback((payloads: EdgePayload[], senderId: string) => {
    if (senderId === sessionIdRef.current) return;

    isApplyingRemoteRef.current = true;
    setEdges((currentEdges) => {
      const edgeMap = new Map(currentEdges.map((e) => [e.id, e]));

      for (const payload of payloads) {
        const existing = edgeMap.get(payload.id);
        if (existing) {
          edgeMap.set(payload.id, {
            ...existing,
            source: payload.source,
            sourceHandle: payload.sourceHandle,
            target: payload.target,
            targetHandle: payload.targetHandle,
            type: payload.type,
            data: payload.data,
          });
        } else {
          edgeMap.set(payload.id, {
            id: payload.id,
            source: payload.source,
            sourceHandle: payload.sourceHandle ?? null,
            target: payload.target,
            targetHandle: payload.targetHandle ?? null,
            type: payload.type || "colored",
            data: payload.data,
          });
        }
      }

      const result = Array.from(edgeMap.values());
      prevEdgesRef.current = result;
      lastBroadcastEdgesRef.current = result;
      return result;
    });
    setTimeout(() => { isApplyingRemoteRef.current = false; }, 0);
  }, [setEdges]);

  // Apply node deletions from remote collaborators
  const applyRemoteNodeDeletions = useCallback((nodeIds: string[], senderId: string) => {
    if (senderId === sessionIdRef.current) return;

    isApplyingRemoteRef.current = true;

    // Clean up PerfectCursor instances for deleted nodes
    for (const nodeId of nodeIds) {
      const cursor = nodeCursorsRef.current.get(nodeId);
      if (cursor) {
        cursor.dispose();
        nodeCursorsRef.current.delete(nodeId);
      }
      draggingNodesRef.current.delete(nodeId);
    }

    setNodes((currentNodes) => {
      const result = currentNodes.filter((n) => !nodeIds.includes(n.id));
      prevNodesRef.current = result;
      lastBroadcastNodesRef.current = result;
      return result;
    });
    setEdges((currentEdges) => {
      const result = currentEdges.filter(
        (e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
      );
      prevEdgesRef.current = result;
      lastBroadcastEdgesRef.current = result;
      return result;
    });
    setTimeout(() => { isApplyingRemoteRef.current = false; }, 0);
  }, [setNodes, setEdges]);

  // Apply edge deletions from remote collaborators
  const applyRemoteEdgeDeletions = useCallback((edgeIds: string[], senderId: string) => {
    if (senderId === sessionIdRef.current) return;

    isApplyingRemoteRef.current = true;
    setEdges((currentEdges) => {
      const result = currentEdges.filter((e) => !edgeIds.includes(e.id));
      prevEdgesRef.current = result;
      lastBroadcastEdgesRef.current = result;
      return result;
    });
    setTimeout(() => { isApplyingRemoteRef.current = false; }, 0);
  }, [setEdges]);

  // Handle collaborator cursor update
  const handleRemoteCursor = useCallback((userId: string, position: { x: number; y: number }) => {
    if (userId === sessionIdRef.current) return;

    setCollaborators((current) => {
      const existing = current.find((c) => c.userId === userId);
      if (existing) {
        return current.map((c) =>
          c.userId === userId ? { ...c, cursor: position, lastSeen: Date.now() } : c
        );
      }
      return [...current, { userId, cursor: position, lastSeen: Date.now() }];
    });
  }, []);

  // Handle user joined
  const handleUserJoined = useCallback((userId: string, name?: string, userIsOwner?: boolean) => {
    if (userId === sessionIdRef.current) return;

    setCollaborators((current) => {
      if (current.find((c) => c.userId === userId)) {
        return current.map((c) =>
          c.userId === userId ? { ...c, name, isOwner: userIsOwner, lastSeen: Date.now() } : c
        );
      }
      return [...current, { userId, name, isOwner: userIsOwner, lastSeen: Date.now() }];
    });
  }, []);

  // Handle user left
  const handleUserLeft = useCallback((userId: string) => {
    setCollaborators((current) => current.filter((c) => c.userId !== userId));
  }, []);

  // Set up realtime channel
  useEffect(() => {
    if (!shareToken || !isCollaborating || !initialized) return;

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn("Supabase client not available for realtime sync");
      return;
    }

    const channelName = `flow:${shareToken}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // Listen for all broadcast events
    channel.on("broadcast", { event: "*" }, (payload) => {
      const message = payload.payload as BroadcastMessage;

      switch (message.type) {
        case "nodes_updated":
          applyRemoteNodeUpdates(message.nodes, message.senderId);
          break;
        case "positions_updated":
          applyRemotePositionUpdates(message.positions, message.senderId);
          break;
        case "edges_updated":
          applyRemoteEdgeUpdates(message.edges, message.senderId);
          break;
        case "nodes_deleted":
          applyRemoteNodeDeletions(message.nodeIds, message.senderId);
          break;
        case "edges_deleted":
          applyRemoteEdgeDeletions(message.edgeIds, message.senderId);
          break;
        case "cursor_moved":
          handleRemoteCursor(message.userId, message.position);
          break;
        case "user_joined":
          handleUserJoined(message.userId, message.name, message.isOwner);
          break;
        case "user_left":
          handleUserLeft(message.userId);
          break;
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsRealtimeConnected(true);
        // Announce presence with owner status
        channel.send({
          type: "broadcast",
          event: "presence",
          payload: { type: "user_joined", userId: sessionIdRef.current, isOwner } as BroadcastMessage,
        });
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setIsRealtimeConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      // Announce we're leaving
      channel.send({
        type: "broadcast",
        event: "presence",
        payload: { type: "user_left", userId: sessionIdRef.current } as BroadcastMessage,
      });
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsRealtimeConnected(false);
      setCollaborators([]);
    };
  }, [
    shareToken,
    isCollaborating,
    initialized,
    isOwner,
    applyRemoteNodeUpdates,
    applyRemotePositionUpdates,
    applyRemoteEdgeUpdates,
    applyRemoteNodeDeletions,
    applyRemoteEdgeDeletions,
    handleRemoteCursor,
    handleUserJoined,
    handleUserLeft,
  ]);

  // Broadcast local changes to other collaborators
  useEffect(() => {
    if (!isCollaborating || !initialized || !isRealtimeConnected) {
      return;
    }
    if (isApplyingRemoteRef.current) return;
    if (!channelRef.current) return;

    // Skip initial broadcast in owner mode to avoid sync conflicts
    if (skipInitialBroadcastRef.current) {
      skipInitialBroadcastRef.current = false;
      lastBroadcastNodesRef.current = nodes;
      lastBroadcastEdgesRef.current = edges;
      prevNodesRef.current = nodes;
      prevEdgesRef.current = edges;
      return;
    }

    const prevNodes = lastBroadcastNodesRef.current;
    const prevEdges = lastBroadcastEdgesRef.current;

    // Calculate what changed
    const prevNodeIds = new Set(prevNodes.map((n) => n.id));
    const prevEdgeIds = new Set(prevEdges.map((e) => e.id));
    const currentNodeIds = new Set(nodes.map((n) => n.id));
    const currentEdgeIds = new Set(edges.map((e) => e.id));

    const deletedNodeIds = [...prevNodeIds].filter((id) => !currentNodeIds.has(id));
    const deletedEdgeIds = [...prevEdgeIds].filter((id) => !currentEdgeIds.has(id));

    const nodeChange = getNodeChangeSummary(prevNodes, nodes);
    const positionOnly = nodeChange.type === "position";
    const nodesChanged = nodeChange.type !== "none";
    const edgesChanged = !areEdgesEquivalent(prevEdges, edges);
    const now = Date.now();
    const timeSinceLastBroadcast = now - lastBroadcastTimeRef.current;

    if (
      positionOnly &&
      nodeChange.type === "position" &&
      deletedNodeIds.length === 0 &&
      deletedEdgeIds.length === 0 &&
      !edgesChanged &&
      timeSinceLastBroadcast < BROADCAST_THROTTLE_MS
    ) {
      const pendingPositions = nodeChange.positions;
      const timeoutId = setTimeout(() => {
        if (!channelRef.current || pendingPositions.length === 0) return;
        const positionPayloads = buildPositionPayloads(pendingPositions);
        if (positionPayloads.length === 0) return;

        lastBroadcastTimeRef.current = Date.now();
        lastBroadcastNodesRef.current = nodes;
        channelRef.current.send({
          type: "broadcast",
          event: "sync",
          payload: {
            type: "positions_updated",
            positions: positionPayloads,
            senderId: sessionIdRef.current,
          } as BroadcastMessage,
        });
      }, BROADCAST_THROTTLE_MS - timeSinceLastBroadcast);

      return () => clearTimeout(timeoutId);
    }

    lastBroadcastTimeRef.current = now;
    lastBroadcastNodesRef.current = nodes;
    lastBroadcastEdgesRef.current = edges;

    // Broadcast deletions
    if (deletedNodeIds.length > 0) {
      channelRef.current.send({
        type: "broadcast",
        event: "sync",
        payload: {
          type: "nodes_deleted",
          nodeIds: deletedNodeIds,
          senderId: sessionIdRef.current,
        } as BroadcastMessage,
      });
    }

    if (deletedEdgeIds.length > 0) {
      channelRef.current.send({
        type: "broadcast",
        event: "sync",
        payload: {
          type: "edges_deleted",
          edgeIds: deletedEdgeIds,
          senderId: sessionIdRef.current,
        } as BroadcastMessage,
      });
    }

    // Broadcast node updates
    if (nodes.length > 0 && nodesChanged) {
      if (positionOnly && nodeChange.type === "position") {
        const positionPayloads = buildPositionPayloads(nodeChange.positions);
        if (positionPayloads.length === 0) return;

        // Update dragging set - only nodes being moved right now
        const movingNodeIds = new Set(positionPayloads.map((p) => p.id));
        // Remove nodes that stopped moving
        for (const nodeId of draggingNodesRef.current) {
          if (!movingNodeIds.has(nodeId)) {
            draggingNodesRef.current.delete(nodeId);
          }
        }
        // Add currently moving nodes
        for (const pos of positionPayloads) {
          draggingNodesRef.current.add(pos.id);
        }

        channelRef.current.send({
          type: "broadcast",
          event: "sync",
          payload: {
            type: "positions_updated",
            positions: positionPayloads,
            senderId: sessionIdRef.current,
          } as BroadcastMessage,
        });
      } else {
        // Full node update - clear dragging state
        draggingNodesRef.current.clear();

        channelRef.current.send({
          type: "broadcast",
          event: "sync",
          payload: {
            type: "nodes_updated",
            nodes: nodes.map(nodeToPayload),
            senderId: sessionIdRef.current,
          } as BroadcastMessage,
        });
      }
    } else if (!nodesChanged) {
      // No position changes - clear dragging state
      draggingNodesRef.current.clear();
    }

    // Broadcast edge updates
    if (edges.length > 0 && edgesChanged) {
      channelRef.current.send({
        type: "broadcast",
        event: "sync",
        payload: {
          type: "edges_updated",
          edges: edges.map(edgeToPayload),
          senderId: sessionIdRef.current,
        } as BroadcastMessage,
      });
    }
  }, [
    nodes,
    edges,
    isCollaborating,
    initialized,
    isRealtimeConnected,
    nodeToPayload,
    edgeToPayload,
    getNodeChangeSummary,
    areEdgesEquivalent,
    buildPositionPayloads,
  ]);

  // Clean up stale collaborators
  useEffect(() => {
    if (!isCollaborating) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setCollaborators((current) => current.filter((c) => now - c.lastSeen < 30000));
    }, 10000);

    return () => clearInterval(interval);
  }, [isCollaborating]);

  // Broadcast cursor position
  const broadcastCursor = useCallback((position: { x: number; y: number }) => {
    if (!channelRef.current || !isRealtimeConnected) return;

    channelRef.current.send({
      type: "broadcast",
      event: "cursor",
      payload: {
        type: "cursor_moved",
        userId: sessionIdRef.current,
        position,
      } as BroadcastMessage,
    });
  }, [isRealtimeConnected]);

  return {
    isCollaborating,
    shareToken,
    liveId,
    flowName,
    isSaving,
    lastSaveError,
    triggerSave,
    saveNow,
    isRealtimeConnected,
    collaborators,
    broadcastCursor,
    isOwner,
  };
}
