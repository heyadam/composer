# OpenAI Realtime SDK Implementation Plan

## Overview

This plan outlines the implementation of OpenAI's Realtime API as a node in Composer, enabling real-time voice-to-voice and text conversations with AI models.

> **Note:** This plan follows the node creation patterns defined in `.claude/skills/node-creation/`.

## Background

The OpenAI Realtime API provides:
- **Speech-to-speech** conversations without intermediate text-to-speech/speech-to-text
- **Text and audio** input/output modalities
- **Function calling** for extending model capabilities
- **Voice Activity Detection (VAD)** for automatic turn-taking
- **WebRTC** connection for browser-based low-latency audio
- **60-minute max session duration**

Available voices: `alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar` (recommended: `marin`, `cedar`)

---

## Audio Data Type

This implementation introduces `audio` as a new port data type alongside the existing types:

| Type | Color | Use for |
|------|-------|---------|
| `string` | cyan | Text data |
| `image` | purple | Image data (base64 JSON) |
| `response` | amber | Terminal output for preview |
| **`audio`** | **emerald** | Audio stream (MediaStream or base64) |

### Audio Port Schema

```typescript
// types/flow.ts - add to PortDataType
export type PortDataType = "string" | "image" | "response" | "audio";
```

### Audio Edge Styling

```typescript
// components/Flow/edges/ColoredEdge.tsx - add emerald for audio
const colorMap = {
  string: "cyan",
  image: "purple",
  response: "amber",
  audio: "emerald",
};
```

### Audio Port Handle Styling

```typescript
// components/Flow/nodes/PortLabel.tsx - add emerald color class

// In the colorClasses object (~line 15):
const colorClasses = {
  cyan: { /* existing */ },
  purple: { /* existing */ },
  amber: { /* existing */ },
  emerald: {
    active: "bg-emerald-400 border-emerald-400",
    inactive: "bg-emerald-500/50 border-emerald-500/50",
    ring: "ring-emerald-400/30",
  },
};
```

---

## Node Architecture

A single **realtime-conversation** node that handles the complete realtime session lifecycle:

```
┌─────────────────────────────────────────────────┐
│              Realtime Conversation              │
├─────────────────────────────────────────────────┤
│  ● System Instructions [input handle + inline]  │
│  ● Voice: [dropdown: marin, cedar, alloy...]    │
│  ● VAD Mode: [semantic | server | disabled]     │
├─────────────────────────────────────────────────┤
│  [🎤 Start Session]  [⏹ End Session]            │
│                                                 │
│  Status: ● Connected (2:34 elapsed)             │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Conversation Transcript (scrollable)     │   │
│  │ You: Hello, how are you?                 │   │
│  │ AI: I'm doing great! How can I help?    │   │
│  └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  instructions ●────────────────● transcript     │
│  audio-in ●────────────────────● audio-out      │
└─────────────────────────────────────────────────┘
```

**Node Category:** Interactive/Processing (has both inputs and outputs, but manages its own lifecycle)

### Port Summary

| Port | Direction | Data Type | Description |
|------|-----------|-----------|-------------|
| `instructions` | Input | string | System prompt (optional) |
| `audio-in` | Input | audio | External audio source (optional, overrides mic) |
| `transcript` | Output | string | Full conversation transcript |
| `audio-out` | Output | audio | AI audio response stream |

---

## Implementation Steps

Following the node creation skill workflow:

| Step | Guide | Deliverable |
|------|-------|-------------|
| 1 | TYPES.md | `RealtimeNodeData` interface, port schema, node definition |
| 2 | COMPONENT.md | `RealtimeNode.tsx` with NodeFrame, session controls |
| 3 | EXECUTION.md | Passthrough execution (transcript output) |
| 4 | AUTOPILOT.md | System prompt docs, config registration |
| 5 | SIDEBAR.md | Icon registration, default data |
| 6 | VALIDATION.md | Manual testing checklist |

---

## Step 1: Type Definitions (`types/flow.ts`)

### Checklist
- [ ] Create `RealtimeNodeData` interface extending ExecutionData
- [ ] Add to `AgentNodeData` union type
- [ ] Create `RealtimeNode` typed alias
- [ ] Add to `AgentNode` union type
- [ ] Add `"realtime-conversation"` to `NodeType`
- [ ] Add port schema to `NODE_PORT_SCHEMAS`
- [ ] Add to `nodeDefinitions` array

### Interface Definition

```typescript
// types/flow.ts

// Voice options for realtime sessions
export type RealtimeVoice =
  | "alloy" | "ash" | "ballad" | "coral" | "echo"
  | "sage" | "shimmer" | "verse" | "marin" | "cedar";

// VAD (Voice Activity Detection) modes
export type RealtimeVADMode = "semantic_vad" | "server_vad" | "disabled";

// Session connection status
export type RealtimeSessionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

// Transcript entry for conversation history
export interface RealtimeTranscriptEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

// Node data interface
export interface RealtimeNodeData extends Record<string, unknown>, ExecutionData {
  label: string;

  // Configuration (persisted)
  instructions?: string;          // System prompt for the session
  voice: RealtimeVoice;           // Voice for audio output
  vadMode: RealtimeVADMode;       // Voice activity detection mode

  // Runtime state (not persisted, managed by component)
  sessionStatus?: RealtimeSessionStatus;
  transcript?: RealtimeTranscriptEntry[];
  elapsedSeconds?: number;
}
```

### Union Types

```typescript
// Add to AgentNodeData union (~line 156)
export type AgentNodeData =
  | InputNodeData
  | OutputNodeData
  // ... existing types
  | RealtimeNodeData;

// Add to NodeType literal (~line 167)
export type NodeType = "text-input" | "preview-output" | /* ... */ | "realtime-conversation";

// Create typed alias (~line 170)
export type RealtimeNode = Node<RealtimeNodeData, "realtime-conversation">;

// Add to AgentNode union (~line 179)
export type AgentNode =
  | InputNode
  | OutputNode
  // ... existing types
  | RealtimeNode;
```

### Port Schema

```typescript
// Add to NODE_PORT_SCHEMAS (~line 246)
"realtime-conversation": {
  inputs: [
    { id: "instructions", label: "instructions", dataType: "string", required: false },
    { id: "audio-in", label: "audio", dataType: "audio", required: false },
  ],
  outputs: [
    { id: "transcript", label: "transcript", dataType: "string" },
    { id: "audio-out", label: "audio", dataType: "audio" },
  ],
},
```

### Audio Data Format

Audio flowing through edges uses this format:

```typescript
// types/flow.ts - Audio edge data structure
export interface AudioEdgeData {
  type: "stream" | "buffer";
  // For stream type: reference ID to MediaStream in global registry
  streamId?: string;
  // For buffer type: base64-encoded audio
  buffer?: string;
  mimeType?: string;  // e.g., "audio/pcm", "audio/webm"
  sampleRate?: number; // e.g., 24000 for OpenAI Realtime
}
```

### Audio Stream Registry

A global registry manages MediaStream references for audio edges:

```typescript
// lib/audio/registry.ts
class AudioStreamRegistry {
  private streams = new Map<string, MediaStream>();

  register(stream: MediaStream): string {
    const id = crypto.randomUUID();
    this.streams.set(id, stream);
    return id;
  }

  get(id: string): MediaStream | undefined {
    return this.streams.get(id);
  }

  unregister(id: string): void {
    const stream = this.streams.get(id);
    stream?.getTracks().forEach(track => track.stop());
    this.streams.delete(id);
  }

  clear(): void {
    this.streams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.streams.clear();
  }
}

export const audioRegistry = new AudioStreamRegistry();
```

### Node Definition

```typescript
// Add to nodeDefinitions array (~line 200)
{
  type: "realtime-conversation",
  label: "Realtime",
  description: "Real-time voice conversation",
  color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
},
```

---

## Step 2: React Component (`components/Flow/nodes/RealtimeNode.tsx`)

### Checklist
- [ ] Create `RealtimeNode.tsx` component
- [ ] Use `NodeFrame` wrapper for consistent styling
- [ ] Implement `PortRow` for input/output handles
- [ ] Handle connection state for instructions input
- [ ] Add session controls (Start/Stop)
- [ ] Add voice and VAD mode selectors
- [ ] Display transcript with scrolling
- [ ] Show connection status indicator
- [ ] Export from `index.ts`
- [ ] Add to `nodeTypes` mapping

### Component Implementation

```tsx
"use client";

import { useReactFlow, useEdges, type NodeProps, type Node, type Edge } from "@xyflow/react";
import type { RealtimeNodeData, AudioEdgeData } from "@/types/flow";
import { Mic, Square, Loader2 } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
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

const VOICES = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] as const;
const VAD_MODES = ["semantic_vad", "server_vad", "disabled"] as const;

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

export function RealtimeNode({ id, data }: NodeProps<RealtimeNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  // Check connection states
  const isInstructionsConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "instructions"
  );
  const isAudioInConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "audio-in"
  );
  const isTranscriptConnected = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "transcript"
  );
  const isAudioOutConnected = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "audio-out"
  );

  // Realtime session hook (see Step 2.1 for implementation)
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
    audioInStreamId: isAudioInConnected ? getConnectedAudioStreamId(edges, id) : undefined,
    onTranscriptUpdate: (entries) => updateNodeData(id, { transcript: entries }),
    onStatusChange: (newStatus) => updateNodeData(id, { sessionStatus: newStatus }),
    onAudioOutStream: (streamId) => updateNodeData(id, { audioOutStreamId: streamId }),
  });

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
      icon={<Mic className="h-4 w-4" />}
      iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      accentBorderClassName="border-emerald-500"
      status={data.executionStatus}
      className="w-[360px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            input={{ id: "instructions", label: "Instructions", colorClass: "cyan", isConnected: isInstructionsConnected }}
            output={{ id: "transcript", label: "Transcript", colorClass: "cyan", isConnected: isTranscriptConnected }}
          />
          <PortRow
            nodeId={id}
            input={{ id: "audio-in", label: "Audio In", colorClass: "emerald", isConnected: isAudioInConnected }}
            output={{ id: "audio-out", label: "Audio Out", colorClass: "emerald", isConnected: isAudioOutConnected }}
          />
        </>
      }
      footer={
        (data.executionError || errorMessage) ? (
          <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
            {data.executionError || errorMessage}
          </p>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* Instructions input (can be connected or inline) */}
        <InputWithHandle
          id="instructions"
          label="System Instructions"
          colorClass="cyan"
          isConnected={isInstructionsConnected}
        >
          <textarea
            value={isInstructionsConnected ? "" : (data.instructions ?? "")}
            onChange={(e) => updateNodeData(id, { instructions: e.target.value })}
            placeholder={isInstructionsConnected ? "Connected" : "You are a helpful assistant..."}
            disabled={isInstructionsConnected}
            className={cn(
              "nodrag w-full min-h-[60px] resize-y rounded-md border border-input px-3 py-2 text-sm",
              isInstructionsConnected
                ? "bg-muted/50 dark:bg-muted/20 cursor-not-allowed"
                : "bg-background/60 dark:bg-muted/40"
            )}
          />
        </InputWithHandle>

        {/* Voice selector */}
        <div className="flex gap-2">
          <Select
            value={data.voice}
            onValueChange={(v) => updateNodeData(id, { voice: v })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Voice" />
            </SelectTrigger>
            <SelectContent>
              {VOICES.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* VAD mode selector */}
          <Select
            value={data.vadMode}
            onValueChange={(v) => updateNodeData(id, { vadMode: v })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="VAD" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semantic_vad">Semantic VAD</SelectItem>
              <SelectItem value="server_vad">Server VAD</SelectItem>
              <SelectItem value="disabled">Manual (PTT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session controls */}
        <div className="flex items-center gap-2">
          {status === "disconnected" ? (
            <Button onClick={handleStartSession} className="flex-1">
              <Mic className="w-4 h-4 mr-2" />
              Start Session
            </Button>
          ) : status === "connecting" ? (
            <Button disabled className="flex-1">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </Button>
          ) : (
            <Button variant="destructive" onClick={disconnect} className="flex-1">
              <Square className="w-4 h-4 mr-2" />
              End Session
            </Button>
          )}

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              status === "connected" && "bg-green-500 animate-pulse",
              status === "connecting" && "bg-yellow-500 animate-pulse",
              status === "error" && "bg-red-500",
              status === "disconnected" && "bg-gray-500"
            )} />
            {status === "connected" && (
              <span className="text-xs text-muted-foreground">
                {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>

        {/* Push-to-Talk button (when VAD is disabled) */}
        {status === "connected" && data.vadMode === "disabled" && (
          <Button
            variant="outline"
            className="w-full"
            onMouseDown={() => {
              sendEvent({ type: "input_audio_buffer.clear" });
            }}
            onMouseUp={() => {
              sendEvent({ type: "input_audio_buffer.commit" });
              sendEvent({ type: "response.create" });
            }}
            onMouseLeave={() => {
              // Safety: commit if mouse leaves while held
              sendEvent({ type: "input_audio_buffer.commit" });
              sendEvent({ type: "response.create" });
            }}
          >
            <Mic className="w-4 h-4 mr-2" />
            Hold to Talk
          </Button>
        )}

        {/* Transcript display */}
        {transcript && transcript.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-muted/30 rounded-md">
            {transcript.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "text-sm p-2 rounded",
                  entry.role === "user" ? "bg-blue-500/10" : "bg-emerald-500/10"
                )}
              >
                <span className="font-medium">
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
```

### Register Component

```typescript
// components/Flow/nodes/index.ts
import { RealtimeNode } from "./RealtimeNode";

export const nodeTypes: NodeTypes = {
  // ...existing types
  "realtime-conversation": RealtimeNode,
};

export { RealtimeNode };
```

---

## Step 2.1: Supporting Hook (`lib/hooks/useRealtimeSession.ts`)

This hook manages the WebRTC connection and session state.

```typescript
import { useState, useRef, useCallback, useEffect } from "react";
import type { RealtimeSessionStatus, RealtimeTranscriptEntry, RealtimeVADMode, RealtimeVoice } from "@/types/flow";
import { useApiKeys } from "@/lib/api-keys/context";
import { audioRegistry } from "@/lib/audio/registry";

interface UseRealtimeSessionOptions {
  nodeId: string;
  audioInStreamId?: string;  // Optional external audio source (overrides mic)
  onTranscriptUpdate: (entries: RealtimeTranscriptEntry[]) => void;
  onStatusChange: (status: RealtimeSessionStatus) => void;
  onAudioOutStream?: (streamId: string) => void;  // Callback when audio output stream is available
  shareToken?: string;  // For owner-funded execution
  runId?: string;       // For owner-funded execution
}

interface SessionConfig {
  instructions?: string;
  voice: RealtimeVoice;
  vadMode: RealtimeVADMode;
}

const MAX_SESSION_SECONDS = 60 * 60; // 60 minutes

export function useRealtimeSession(options: UseRealtimeSessionOptions) {
  const {
    nodeId,
    audioInStreamId,
    onTranscriptUpdate,
    onStatusChange,
    onAudioOutStream,
    shareToken,
    runId,
  } = options;
  const { apiKeys } = useApiKeys();

  const [status, setStatus] = useState<RealtimeSessionStatus>("disconnected");
  const [transcript, setTranscript] = useState<RealtimeTranscriptEntry[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);  // Track mic stream for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxSessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update parent when status changes
  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);

  // Update parent when transcript changes
  useEffect(() => {
    onTranscriptUpdate(transcript);
  }, [transcript, onTranscriptUpdate]);

  // Memoized server event handler
  const handleServerEvent = useCallback((event: { type: string; [key: string]: unknown }) => {
    switch (event.type) {
      case "session.created":
        console.log("Realtime session created:", event.session);
        break;

      case "session.updated":
        console.log("Realtime session updated:", event.session);
        break;

      case "input_audio_buffer.speech_started":
        // User started speaking - could add visual indicator
        break;

      case "input_audio_buffer.speech_stopped":
        // User stopped speaking
        break;

      case "response.audio_transcript.done":
        // AI finished speaking
        setTranscript((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: event.transcript as string,
            timestamp: Date.now(),
          },
        ]);
        break;

      case "conversation.item.input_audio_transcription.completed":
        // User speech transcribed
        setTranscript((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "user",
            text: event.transcript as string,
            timestamp: Date.now(),
          },
        ]);
        break;

      case "rate_limits.updated":
        // Rate limit info - could display to user
        console.log("Rate limits:", event.rate_limits);
        break;

      case "error":
        console.error("Realtime API error:", event);
        const errorMsg = (event.error as { message?: string })?.message || "Unknown error";
        setErrorMessage(errorMsg);
        setStatus("error");
        break;
    }
  }, []);

  const connect = useCallback(async (config: SessionConfig) => {
    try {
      setStatus("connecting");
      setErrorMessage(null);

      // 1. Get ephemeral token from backend (supports owner-funded execution)
      const tokenRequestBody = shareToken && runId
        ? { shareToken, runId, voice: config.voice, instructions: config.instructions }
        : { apiKeys, voice: config.voice, instructions: config.instructions };

      const tokenResponse = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokenRequestBody),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get session token");
      }

      const { clientSecret } = await tokenResponse.json();

      // 2. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Set up remote audio playback and register output stream
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        // Register the output stream for downstream nodes
        if (onAudioOutStream && e.streams[0]) {
          const streamId = audioRegistry.register(e.streams[0]);
          onAudioOutStream(streamId);
        }
      };

      // 4. Add audio track (from connected audio-in or microphone)
      let audioStream: MediaStream;
      if (audioInStreamId) {
        // Use external audio source from connected edge
        const externalStream = audioRegistry.get(audioInStreamId);
        if (!externalStream) {
          throw new Error("Connected audio source not available");
        }
        audioStream = externalStream;
      } else {
        // Use local microphone
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = audioStream;  // Track for cleanup
      }
      pc.addTrack(audioStream.getTracks()[0]);

      // 5. Create data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        // Send session.update with config
        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            instructions: config.instructions,
            voice: config.voice,
            turn_detection: config.vadMode === "disabled" ? null : { type: config.vadMode },
            input_audio_transcription: { model: "whisper-1" },
          },
        }));
      };

      dc.onmessage = (e) => {
        const event = JSON.parse(e.data);
        handleServerEvent(event);
      };

      // 6. Create and send SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      if (!sdpResponse.ok) {
        throw new Error("Failed to establish WebRTC connection");
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setStatus("connected");

      // Start elapsed time counter
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);

      // Enforce 60-minute max session limit
      maxSessionTimerRef.current = setTimeout(() => {
        console.log("Realtime session reached 60-minute limit, disconnecting");
        disconnect();
      }, MAX_SESSION_SECONDS * 1000);

    } catch (error) {
      console.error("Realtime connection error:", error);
      const msg = error instanceof Error ? error.message : "Connection failed";
      setErrorMessage(msg);
      setStatus("error");
    }
  }, [apiKeys, audioInStreamId, handleServerEvent, onAudioOutStream, shareToken, runId]);

  const disconnect = useCallback(() => {
    // Stop microphone stream to release the device
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (maxSessionTimerRef.current) {
      clearTimeout(maxSessionTimerRef.current);
      maxSessionTimerRef.current = null;
    }

    setStatus("disconnected");
    setElapsedSeconds(0);
    setErrorMessage(null);
  }, []);

  const sendEvent = useCallback((event: object) => {
    dcRef.current?.send(JSON.stringify(event));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    transcript,
    elapsedSeconds,
    errorMessage,
    connect,
    disconnect,
    sendEvent,
  };
}
```

---

## Step 2.2: API Route (`app/api/realtime/session/route.ts`)

Generates ephemeral tokens for WebRTC connections. Supports both user-provided API keys and owner-funded execution.

```typescript
import { NextResponse } from "next/server";
import { getOwnerKeysForExecution, checkAndLogRun } from "@/lib/supabase/service";

// In-memory rate limiting (should use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;  // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;      // 10 sessions per minute per IP/token

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKeys, voice, instructions, shareToken, runId } = body;

    // Rate limit by IP or share token
    const clientId = shareToken || request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before starting another session." },
        { status: 429 }
      );
    }

    let openaiKey: string | undefined;

    // Owner-funded execution path
    if (shareToken && runId) {
      // Check rate limits and log run (uses database function)
      const canRun = await checkAndLogRun(shareToken, runId, "realtime-conversation");
      if (!canRun.success) {
        return NextResponse.json(
          { error: canRun.error || "Rate limit exceeded for this flow" },
          { status: 429 }
        );
      }

      // Get owner's encrypted keys
      const ownerKeys = await getOwnerKeysForExecution(shareToken);
      if (!ownerKeys?.openai) {
        return NextResponse.json(
          { error: "Flow owner has not configured OpenAI API key" },
          { status: 400 }
        );
      }
      openaiKey = ownerKeys.openai;
    } else {
      // User-provided API key path
      openaiKey = apiKeys?.openai;
    }

    if (!openaiKey) {
      return NextResponse.json(
        { error: "OpenAI API key required" },
        { status: 400 }
      );
    }

    // Request ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: voice || "marin",
        instructions: instructions || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI Realtime API error:", error);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      clientSecret: data.client_secret.value,
      expiresAt: data.client_secret.expires_at,
    });
  } catch (error) {
    console.error("Realtime session error:", error);
    return NextResponse.json(
      { error: "Failed to create realtime session" },
      { status: 500 }
    );
  }
}
```

> **Note:** The `getOwnerKeysForExecution` and `checkAndLogRun` functions already exist in `lib/supabase/service.ts` for the existing owner-funded execution feature. The realtime session route reuses the same infrastructure.

---

## Step 3: Execution Engine (`lib/execution/engine.ts`)

### Checklist
- [ ] Add case to `executeNode` switch statement
- [ ] Return transcript as output for downstream nodes
- [ ] Handle when session is not active

### Execution Logic

The RealtimeNode is **interactive** and manages its own lifecycle. During flow execution, it passes through the current transcript.

```typescript
// lib/execution/engine.ts - add to executeNode switch

case "realtime-conversation": {
  // Realtime node is interactive - execution passes through current transcript
  const transcriptEntries = (node.data.transcript as RealtimeTranscriptEntry[]) || [];

  const fullTranscript = transcriptEntries
    .map((e) => `${e.role === "user" ? "User" : "AI"}: ${e.text}`)
    .join("\n");

  return {
    output: fullTranscript || "(No conversation yet)",
    debugInfo: {
      startTime: Date.now(),
      endTime: Date.now(),
      request: { type: "realtime-conversation" },
    },
  };
}
```

---

## Step 4: Autopilot Integration

### Checklist
- [ ] Add to `VALID_NODE_TYPES` in `lib/autopilot/config.ts`
- [ ] Add required fields to `NODE_REQUIRED_FIELDS`
- [ ] Document node in `lib/autopilot/system-prompt.ts`

### config.ts Updates

```typescript
// lib/autopilot/config.ts

export const VALID_NODE_TYPES = [
  "text-input",
  "image-input",
  "text-generation",
  "image-generation",
  "ai-logic",
  "preview-output",
  "react-component",
  "comment",
  "realtime-conversation",  // Add here
] as const;

export const NODE_REQUIRED_FIELDS: Record<ValidNodeType, string[]> = {
  // ...existing entries
  "realtime-conversation": ["label", "voice", "vadMode"],
};
```

### evaluator.ts Updates

Add the node's input handles to the programmatic validator:

```typescript
// lib/autopilot/evaluator.ts (~line 15)

const NODE_INPUT_HANDLES: Record<string, string[]> = {
  "text-generation": ["prompt", "system", "image"],
  "image-generation": ["prompt"],
  "ai-logic": ["transform"],
  "react-component": ["prompt"],
  "preview-output": ["input"],
  "realtime-conversation": ["instructions", "audio-in"],  // Add here
};
```

### system-prompt.ts Updates

Add a new numbered section under `## Available Node Types`:

```markdown
### N. realtime-conversation (Realtime Conversation)
Real-time voice conversation with OpenAI's Realtime API. Users can have
speech-to-speech conversations with the AI model. The node is interactive
and manages its own session lifecycle (not triggered by flow execution).
**Default: voice="marin", vadMode="semantic_vad"**

\`\`\`typescript
{
  type: "realtime-conversation",
  data: {
    label: string,              // Required: Display name
    instructions?: string,      // System prompt for the conversation
    voice: "marin" | "cedar" | "alloy" | "ash" | "ballad" | "coral" | "echo" | "sage" | "shimmer" | "verse",
    vadMode: "semantic_vad" | "server_vad" | "disabled"
  }
}
\`\`\`

**Input Handles:**
- \`instructions\` - System prompt for the session (dataType: "string")
- \`audio-in\` - External audio source, overrides microphone (dataType: "audio")

**Output Handles:**
- \`transcript\` - Full conversation transcript (dataType: "string")
- \`audio-out\` - AI audio response stream (dataType: "audio")

When connecting to this node, use \`targetHandle\` to specify the input:
- To connect system prompt: \`targetHandle: "instructions"\`
- To connect external audio: \`targetHandle: "audio-in"\`

Example - creating a realtime conversation node:
\`\`\`json
{
  "actions": [
    {
      "type": "addNode",
      "node": {
        "id": "autopilot-realtime-1234",
        "type": "realtime-conversation",
        "position": { "x": 400, "y": 200 },
        "data": {
          "label": "Voice Chat",
          "instructions": "You are a helpful customer service agent.",
          "voice": "marin",
          "vadMode": "semantic_vad"
        }
      }
    }
  ],
  "explanation": "Added realtime conversation node for voice interaction"
}
\`\`\`
```

---

## Step 5: Sidebar Registration

### Checklist
- [ ] Add icon to `iconMap` in `NodeSidebar.tsx`
- [ ] Add default data to `defaultNodeData` in `AgentFlow.tsx`

### NodeSidebar.tsx

```typescript
// components/Flow/NodeSidebar.tsx
import { Mic } from "lucide-react";

const iconMap = {
  // ...existing icons
  "realtime-conversation": Mic,
};
```

### AgentFlow.tsx

```typescript
// components/Flow/AgentFlow.tsx
const defaultNodeData = {
  // ...existing defaults
  "realtime-conversation": {
    label: "Realtime",
    voice: "marin",
    vadMode: "semantic_vad",
  },
};
```

---

## Step 6: Validation

### Manual Testing Checklist

- [ ] Node appears in sidebar with correct icon
- [ ] Node can be dragged onto canvas
- [ ] NodeFrame renders with emerald accent color
- [ ] Instructions textarea works (inline and disabled when connected)
- [ ] Voice dropdown shows all 10 voice options
- [ ] VAD mode dropdown shows all 3 options
- [ ] "Start Session" button visible when disconnected
- [ ] Microphone permission request triggers on start
- [ ] Status indicator changes color appropriately
- [ ] Timer counts up when connected
- [ ] "End Session" button visible when connected
- [ ] Transcript displays user and AI messages
- [ ] Audio output plays through speakers
- [ ] Flow execution outputs transcript text
- [ ] Autopilot can create the node via chat
- [ ] Edges connect correctly to instructions handle

### Audio Port Testing

- [ ] Audio edges render with emerald color
- [ ] Audio-in port accepts connections from audio sources
- [ ] Audio-out port can connect to audio consumers
- [ ] When audio-in is connected, uses external source instead of mic
- [ ] Audio-out streams to connected nodes during session

### Edge Cases to Test

- [ ] Session timeout (60 min limit)
- [ ] Network disconnection during session
- [ ] Microphone permission denied
- [ ] Missing OpenAI API key error
- [ ] Multiple realtime nodes on same canvas
- [ ] Node deletion during active session
- [ ] Audio source disconnected mid-session

---

## File Changes Summary

| Order | File | Action | Description |
|-------|------|--------|-------------|
| 0 | `types/flow.ts` | Modify | Add `"audio"` to `PortDataType`, `AudioEdgeData` interface |
| 0 | `components/Flow/edges/ColoredEdge.tsx` | Modify | Add emerald color for audio edges |
| 0 | `components/Flow/nodes/PortLabel.tsx` | Modify | Add emerald color class for audio handles |
| 0 | `lib/audio/registry.ts` | Create | Audio stream registry for managing MediaStream refs |
| 1 | `types/flow.ts` | Modify | Add interface, union types, port schema, node definition |
| 2 | `components/Flow/nodes/RealtimeNode.tsx` | Create | Main node component |
| 2 | `components/Flow/nodes/index.ts` | Modify | Export new node |
| 2 | `lib/hooks/useRealtimeSession.ts` | Create | WebRTC connection + session hook |
| 2 | `app/api/realtime/session/route.ts` | Create | Ephemeral token endpoint with rate limiting |
| 3 | `lib/execution/engine.ts` | Modify | Add switch case for transcript passthrough |
| 4 | `lib/autopilot/config.ts` | Modify | Add to VALID_NODE_TYPES, NODE_REQUIRED_FIELDS |
| 4 | `lib/autopilot/evaluator.ts` | Modify | Add to NODE_INPUT_HANDLES |
| 4 | `lib/autopilot/system-prompt.ts` | Modify | Document node with all handles for LLM |
| 5 | `components/Flow/NodeSidebar.tsx` | Modify | Add Mic icon |
| 5 | `components/Flow/AgentFlow.tsx` | Modify | Add default node data |
| — | `docs/AI_MODELS.md` | Modify | Add gpt-4o-realtime-preview model |

---

## Node Creation Skill Updates

The `.claude/skills/node-creation/` skill has been updated to document the new `audio` port data type:

| File | Changes |
|------|---------|
| `SKILL.md` | Added `audio \| emerald` to Port Data Types table, added "Interactive" node category |
| `TYPES.md` | Added `audio` to Port Data Types table and validation checklist |
| `COMPONENT.md` | Added `emerald` to Color Classes table and Port Properties |
| `VALIDATION.md` | Added `emerald` to edge colors and port colors troubleshooting |

These updates ensure future node implementations can properly use the `audio` data type.

---

## Dependencies

```bash
npm install @openai/realtime-api-beta  # Optional: for easier event handling
```

The WebRTC implementation uses native browser APIs, so no additional WebRTC packages are required.

---

## Security Considerations

1. **Ephemeral tokens only** - Never expose the main OpenAI API key to the browser
2. **Token TTL** - Ephemeral tokens expire after 10 minutes by default
3. **Rate limiting** - Apply rate limits to the session creation endpoint
4. **Owner-funded execution** - Extend existing pattern for realtime sessions

---

## Testing Plan

1. **Unit tests**: Hook logic, event parsing
2. **Integration tests**: Session creation API route
3. **Manual testing**:
   - Voice input/output quality
   - Transcript accuracy
   - Interruption handling
   - Network disconnection recovery

---

## Future Enhancements

1. **Multi-user sessions** - Share realtime sessions with collaborators
2. **Recording** - Save conversation audio for playback
3. **Transcription-only mode** - Use realtime API for live transcription
4. **Custom voices** - Support for OpenAI voice cloning when available
5. **SIP integration** - Phone call integration via OpenAI's SIP support

---

## Future Audio Nodes

The `audio` data type enables future nodes for audio pipelines:

### audio-input (Microphone/File)
Entry point for audio data. Captures from microphone or uploads audio file.

```
┌────────────────────────┐
│     Audio Input        │
├────────────────────────┤
│  Source: [Mic | File]  │
│  [🎤 Start Capture]    │
├────────────────────────┤
│          ──────● audio │
└────────────────────────┘
```

### audio-output (Speakers)
Terminal node that plays audio through speakers.

```
┌────────────────────────┐
│     Audio Output       │
├────────────────────────┤
│  Volume: [━━━━━●━━━]   │
│  [🔊 Playing...]       │
├────────────────────────┤
│  audio ●──────         │
└────────────────────────┘
```

### transcription (Speech-to-Text)
Converts audio to text using Whisper or similar.

```
┌────────────────────────┐
│     Transcription      │
├────────────────────────┤
│  Model: [whisper-1]    │
├────────────────────────┤
│  audio ●───────● text  │
└────────────────────────┘
```

### text-to-speech
Converts text to audio using TTS models.

```
┌────────────────────────┐
│    Text to Speech      │
├────────────────────────┤
│  Voice: [alloy]        │
│  Speed: [1.0x]         │
├────────────────────────┤
│  text ●────────● audio │
└────────────────────────┘
```

These nodes would enable audio processing pipelines like:

```
[Audio Input] → [Transcription] → [Text Generation] → [TTS] → [Audio Output]
```

---

## Audit Fixes Summary

The following issues from the expert audit have been addressed:

### Critical Issues (5/5 Fixed)

| Issue | Fix |
|-------|-----|
| Audio type underspecified | Added `AudioEdgeData` interface with `streamId`, `buffer`, `mimeType`, `sampleRate`. Created `AudioStreamRegistry` class in `lib/audio/registry.ts` |
| Component doesn't pass config to connect() | Added `handleStartSession()` function that passes `{instructions, voice, vadMode}` to `connect()` |
| Microphone stream leak | Added `micStreamRef` and proper cleanup in `disconnect()` that stops all tracks |
| Missing owner-funded execution | Added `shareToken`/`runId` handling in both hook and API route, reusing existing `getOwnerKeysForExecution` |
| No rate limiting | Added in-memory rate limiting (10 sessions/min) and database-backed `checkAndLogRun` for owner-funded |

### Medium Issues (5/5 Fixed)

| Issue | Fix |
|-------|-----|
| Missing audio handles in Autopilot | Added `audio-in` and `audio-out` handles to system prompt documentation |
| No Push-to-Talk implementation | Added PTT button with `onMouseDown`/`onMouseUp`/`onMouseLeave` handlers when `vadMode === "disabled"` |
| Evaluator not updated | Added `realtime-conversation` to `NODE_INPUT_HANDLES` with `["instructions", "audio-in"]` |
| Missing server events | Added handlers for `session.created`, `session.updated`, `input_audio_buffer.speech_started/stopped`, `rate_limits.updated` |
| Timer doesn't enforce 60-min limit | Added `maxSessionTimerRef` with `setTimeout` that calls `disconnect()` at 60 minutes |

### Minor Issues (4/4 Fixed)

| Issue | Fix |
|-------|-----|
| handleServerEvent not memoized | Wrapped in `useCallback` with empty dependency array |
| No loading state | Added `status === "connecting"` case with `Loader2` spinner and "Connecting..." text |
| Node too narrow (320px) | Increased to `w-[360px]` |
| No error display | Added `errorMessage` state to hook, displayed in `footer` alongside `executionError` |

---

## References

- [OpenAI Realtime API Guide](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Realtime API Reference](https://platform.openai.com/docs/api-reference/realtime)
- [OpenAI Realtime WebRTC Guide](https://platform.openai.com/docs/guides/realtime-webrtc)
- [@openai/realtime-api-beta](https://github.com/openai/openai-realtime-api-beta)
- [WebRTC Samples](https://github.com/webrtc/samples)
