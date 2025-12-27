"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { AudioInputNodeData } from "@/types/flow";
import { Mic, Square } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { cn } from "@/lib/utils";
import { formatAudioDuration } from "@/lib/audio-utils";
import { pendingInputRegistry } from "@/lib/execution/pending-input-registry";

type AudioInputNodeType = Node<AudioInputNodeData, "audio-input">;

export function AudioInputNode({ id, data }: NodeProps<AudioInputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  // Local state for recording UI
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(data.recordingDuration ?? 0);
  const [error, setError] = useState<string | null>(null);

  // Refs for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const isStoppingRef = useRef(false); // Prevents auto-restart during stop

  // Refs for visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  // Pending audio data waiting to be persisted after execution completes
  const pendingAudioRef = useRef<{
    audioBuffer: string;
    audioMimeType: string;
    recordingDuration: number;
  } | null>(null);

  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );
  const isDoneConnected = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "done"
  );

  const hasRecording = !!data.audioBuffer && !isRecording;

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setDuration(0);
      chunksRef.current = [];

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // Set up MediaRecorder with best available format
      // Priority: webm+opus (Chrome/Firefox) > webm (fallback) > mp4 (Safari)
      const getSupportedMimeType = (): string | null => {
        const formats = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/aac",
        ];
        return formats.find((format) => MediaRecorder.isTypeSupported(format)) || null;
      };

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        throw new Error("No supported audio format found. Please use a modern browser.");
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Convert chunks to base64
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        // Calculate final duration
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);

        const audioData = {
          audioBuffer: base64,
          audioMimeType: mimeType,
          recordingDuration: finalDuration,
          isRecording: false,
        };

        // Check if we're in execution mode (awaiting input from engine)
        if (pendingInputRegistry.isWaiting(id)) {
          // Defer persistence until execution completes
          pendingAudioRef.current = audioData;

          // Signal to execution engine that recording is complete
          pendingInputRegistry.resolveInput(id, {
            buffer: base64,
            mimeType,
            duration: finalDuration,
          });
        } else {
          // Manual recording - persist immediately
          updateNodeData(id, audioData);
        }

        setDuration(finalDuration);

        // Clear stopping flag after everything is done
        isStoppingRef.current = false;
      };

      // Set up Web Audio analyser for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setIsRecording(true);
      updateNodeData(id, { isRecording: true });

      // Start duration timer using requestAnimationFrame for smooth updates
      const updateTimer = () => {
        if (startTimeRef.current > 0) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setDuration(elapsed);
          timerIntervalRef.current = window.requestAnimationFrame(updateTimer);
        }
      };
      timerIntervalRef.current = window.requestAnimationFrame(updateTimer);

    } catch (err) {
      // Handle both standard Error and DOMException (for media permission errors)
      const message = err instanceof Error || err instanceof DOMException
        ? err.message
        : "Failed to access microphone";
      setError(message);
    }
  }, [id, updateNodeData]);

  // Stop recording
  const stopRecording = useCallback(() => {
    // Mark as stopping to prevent auto-restart from useEffect
    isStoppingRef.current = true;

    // Stop timer
    if (timerIntervalRef.current) {
      window.cancelAnimationFrame(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Stop media recorder (triggers onstop handler)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsRecording(false);
  }, []);

  // Clear recording
  const clearRecording = useCallback(() => {
    updateNodeData(id, {
      audioBuffer: undefined,
      audioMimeType: undefined,
      recordingDuration: 0,
      isRecording: false,
    });
    setDuration(0);
  }, [id, updateNodeData]);

  // Draw waveform visualization
  useEffect(() => {
    if (!isRecording || !analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgba(0, 0, 0, 0)";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#10b981"; // emerald-500
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.cancelAnimationFrame(timerIntervalRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Sync duration from data when not recording (for re-renders)
  useEffect(() => {
    if (!isRecording && data.recordingDuration !== undefined) {
      setDuration(data.recordingDuration);
    }
  }, [isRecording, data.recordingDuration]);

  // Auto-start recording when execution engine signals awaitingInput
  useEffect(() => {
    // Don't restart if we're in the process of stopping
    if (isStoppingRef.current) return;

    if (data.awaitingInput && !data.audioBuffer && !isRecording) {
      startRecording();
    }
  }, [data.awaitingInput, data.audioBuffer, isRecording, startRecording]);

  // Persist audio data after execution completes (success or error)
  // This ensures we don't update node data before the engine sets executionStatus
  useEffect(() => {
    const pending = pendingAudioRef.current;
    if (!pending) return;

    // Wait for execution to complete (status changes from "running")
    if (data.executionStatus === "success" || data.executionStatus === "error") {
      updateNodeData(id, {
        audioBuffer: pending.audioBuffer,
        audioMimeType: pending.audioMimeType,
        recordingDuration: pending.recordingDuration,
        isRecording: false,
      });
      pendingAudioRef.current = null;
    }
  }, [data.executionStatus, id, updateNodeData]);

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Mic className="h-4 w-4" />}
      iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      accentBorderClassName="border-emerald-500"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            output={{ id: "output", label: "Audio", colorClass: "emerald", isConnected: isOutputConnected }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isDoneConnected }}
          />
        </>
      }
    >
      <div className="space-y-3">
        {/* Waveform visualization / Status display */}
        <div
          className={cn(
            "relative w-full h-16 rounded-md border bg-background/60 dark:bg-muted/40 overflow-hidden",
            isRecording ? "border-emerald-500" : "border-input"
          )}
        >
          {isRecording ? (
            <>
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                width={248}
                height={64}
              />
              {/* Recording indicator */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatAudioDuration(duration)}
                </span>
              </div>
            </>
          ) : hasRecording ? (
            <div className="flex items-center justify-center h-full gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Ready • {formatAudioDuration(duration)}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Press to record
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className={cn(
                "nodrag flex-1 flex items-center justify-center gap-2 py-2 rounded-md",
                "bg-red-500 hover:bg-red-600 text-white text-sm font-medium",
                "transition-colors"
              )}
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          ) : (
            <>
              <button
                onClick={startRecording}
                className={cn(
                  "nodrag flex-1 flex items-center justify-center gap-2 py-2 rounded-md",
                  "bg-white hover:bg-gray-100 text-gray-900 text-sm font-medium",
                  "transition-colors"
                )}
              >
                <Mic className="h-4 w-4" />
                {hasRecording ? "Re-record" : "Record"}
              </button>
              {hasRecording && (
                <button
                  onClick={clearRecording}
                  className={cn(
                    "nodrag px-3 py-2 rounded-md text-sm",
                    "border border-input bg-background hover:bg-muted",
                    "transition-colors"
                  )}
                >
                  Clear
                </button>
              )}
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </NodeFrame>
  );
}
