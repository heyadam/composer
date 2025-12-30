"use client";

import { useState, useEffect, useCallback } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node, type Edge } from "@xyflow/react";
import type { RealtimeNodeData, AudioEdgeData, RealtimeTranscriptEntry } from "@/types/flow";
import { Mic, Square, Loader2 } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { NodeFooter } from "./NodeFooter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRealtimeSession } from "@/lib/hooks/useRealtimeSession";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

const VOICES = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] as const;

type RealtimeNodeType = Node<RealtimeNodeData, "realtime-conversation">;

// Helper to get audio stream ID from connected edge
function getConnectedAudioStreamId(edges: Edge[], nodeId: string): string | undefined {
  const audioEdge = edges.find(
    (edge) => edge.target === nodeId && edge.targetHandle === "audio-in"
  );
  if (!audioEdge) return undefined;
  // The streamId is stored in edge.data by the source audio node
  return (audioEdge.data as AudioEdgeData | undefined)?.streamId;
}

// Helper to format transcript entries as text
function formatTranscript(entries: RealtimeTranscriptEntry[]): string {
  if (!entries || entries.length === 0) return "";
  return entries
    .map((e) => `${e.role === "user" ? "User" : "AI"}: ${e.text}`)
    .join("\n\n");
}

export function RealtimeNode({ id, data }: NodeProps<RealtimeNodeType>) {
  const { updateNodeData, getEdges } = useReactFlow();
  const edges = useEdges(); // Still needed for getConnectedAudioStreamId
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);
  const [isPttHeld, setIsPttHeld] = useState(false);

  // Check if any output is connected (for auto-start behavior)
  const hasOutputConnection = isOutputConnected("transcript") || isOutputConnected("audio-out");

  // Push transcript to connected nodes in real-time
  const pushTranscriptToConnectedNodes = useCallback((entries: RealtimeTranscriptEntry[]) => {
    const currentEdges = getEdges();
    const transcriptEdges = currentEdges.filter(
      (edge) => edge.source === id && edge.sourceHandle === "transcript"
    );

    const formattedTranscript = formatTranscript(entries);

    // Update each connected node's executionOutput
    transcriptEdges.forEach((edge) => {
      updateNodeData(edge.target, {
        executionOutput: formattedTranscript || "(No conversation yet)",
        executionStatus: entries.length > 0 ? "success" : undefined,
      });
    });
  }, [id, getEdges, updateNodeData]);

  // Realtime session hook
  const {
    status,
    transcript,
    elapsedSeconds,
    errorMessage,
    connect,
    disconnect,
    sendEvent,
  } = useRealtimeSession({
    nodeId: id,
    audioInStreamId: isInputConnected("audio-in") ? getConnectedAudioStreamId(edges, id) : undefined,
    onTranscriptUpdate: (entries) => {
      updateNodeData(id, { transcript: entries });
      // Push to connected nodes in real-time
      pushTranscriptToConnectedNodes(entries);
    },
    onStatusChange: (newStatus) => updateNodeData(id, { sessionStatus: newStatus }),
    onAudioOutStream: (streamId) => updateNodeData(id, { audioOutStreamId: streamId }),
  });

  // Also push when edges change (in case user connects during active session)
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      pushTranscriptToConnectedNodes(transcript);
    }
  }, [edges, transcript, pushTranscriptToConnectedNodes]);

  // Auto-start session when flow execution begins (if connected to output)
  useEffect(() => {
    // Only auto-start if:
    // 1. Execution just started (status is "running")
    // 2. Session is not already active
    // 3. Node has an output connection
    if (
      data.executionStatus === "running" &&
      status === "disconnected" &&
      hasOutputConnection
    ) {
      connect({
        instructions: data.instructions,
        voice: data.voice,
        vadMode: data.vadMode,
      });
    }
  }, [data.executionStatus, status, hasOutputConnection, data.instructions, data.voice, data.vadMode, connect]);

  // Handler to start session with current config
  const handleStartSession = () => {
    connect({
      instructions: data.instructions,
      voice: data.voice,
      vadMode: data.vadMode,
    });
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Mic />}
      accentColor="teal"
      status={data.executionStatus}
      className="w-[360px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            output={{ id: "transcript", label: "Transcript", colorClass: "cyan", isConnected: isOutputConnected("transcript") }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
        </>
      }
      footer={<NodeFooter error={data.executionError || errorMessage || undefined} />}
    >
      <div className="space-y-3">
        {/* System instructions (can be connected or inline) */}
        <InputWithHandle
          id="instructions"
          label="System Instructions"
          colorClass="cyan"
          isConnected={isInputConnected("instructions")}
        >
          <textarea
            value={isInputConnected("instructions") ? "" : (data.instructions ?? "")}
            onChange={(e) => updateNodeData(id, { instructions: e.target.value })}
            placeholder={isInputConnected("instructions") ? "Connected" : "You are a helpful assistant..."}
            disabled={isInputConnected("instructions")}
            className={cn(
              "nodrag node-input min-h-[60px] resize-y",
              isInputConnected("instructions") && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Voice and VAD mode selectors */}
        <div className="flex gap-2">
          <Select
            value={data.voice}
            onValueChange={(v) => updateNodeData(id, { voice: v })}
          >
            <SelectTrigger className="flex-1 nodrag h-8 text-xs">
              <SelectValue placeholder="Voice" />
            </SelectTrigger>
            <SelectContent>
              {VOICES.map((v) => (
                <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={data.vadMode}
            onValueChange={(v) => updateNodeData(id, { vadMode: v })}
          >
            <SelectTrigger className="flex-1 nodrag h-8 text-xs">
              <SelectValue placeholder="VAD" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semantic_vad" className="text-xs">Semantic VAD</SelectItem>
              <SelectItem value="server_vad" className="text-xs">Server VAD</SelectItem>
              <SelectItem value="disabled" className="text-xs">Manual (PTT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session controls */}
        <div className="flex items-center gap-2">
          {status === "disconnected" ? (
            <Button onClick={handleStartSession} size="sm" className="flex-1 nodrag h-8">
              <Mic className="w-3.5 h-3.5 mr-1.5" />
              Start Session
            </Button>
          ) : status === "connecting" ? (
            <Button disabled size="sm" className="flex-1 nodrag h-8">
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Connecting...
            </Button>
          ) : (
            <Button variant="destructive" onClick={disconnect} size="sm" className="flex-1 nodrag h-8">
              <Square className="w-3.5 h-3.5 mr-1.5" />
              End Session
            </Button>
          )}

          {/* Status indicator - only show when active */}
          {status !== "disconnected" && (
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === "connected" && "bg-emerald-400 animate-pulse",
                status === "connecting" && "bg-amber-400 animate-pulse",
                status === "error" && "bg-rose-400"
              )} />
              {status === "connected" && (
                <span className="text-[11px] text-white/65">
                  {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Push-to-Talk button (when VAD is disabled) */}
        {status === "connected" && data.vadMode === "disabled" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full nodrag h-8"
            onMouseDown={() => {
              setIsPttHeld(true);
              sendEvent({ type: "input_audio_buffer.clear" });
            }}
            onMouseUp={() => {
              if (isPttHeld) {
                setIsPttHeld(false);
                sendEvent({ type: "input_audio_buffer.commit" });
                sendEvent({ type: "response.create" });
              }
            }}
            onMouseLeave={() => {
              // Only commit if mouse leaves while button is held down
              if (isPttHeld) {
                setIsPttHeld(false);
                sendEvent({ type: "input_audio_buffer.commit" });
                sendEvent({ type: "response.create" });
              }
            }}
          >
            <Mic className="w-3.5 h-3.5 mr-1.5" />
            Hold to Talk
          </Button>
        )}

        {/* Transcript display */}
        {transcript && transcript.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-white/[0.02] rounded-lg border border-white/[0.03]">
            {transcript.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "text-[12px] p-2 rounded-md",
                  entry.role === "user" ? "bg-blue-500/10 text-white/85" : "bg-emerald-500/10 text-white/85"
                )}
              >
                <span className="font-medium text-white/90">
                  {entry.role === "user" ? "You" : "AI"}:
                </span>{" "}
                {entry.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </NodeFrame>
  );
}
