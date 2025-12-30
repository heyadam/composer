"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { AudioInputNodeData } from "@/types/flow";
import { Mic, Square } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { cn } from "@/lib/utils";
import { formatAudioDuration } from "@/lib/audio-utils";
import { pendingInputRegistry } from "@/lib/execution/pending-input-registry";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type AudioInputNodeType = Node<AudioInputNodeData, "audio-input">;

export function AudioInputNode({ id, data }: NodeProps<AudioInputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isOutputConnected } = useEdgeConnections(id);

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
      icon={<Mic />}
      accentColor="teal"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            output={{ id: "output", label: "Audio", colorClass: "emerald", isConnected: isOutputConnected("output", true) }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
        </>
      }
    >
      <div className="space-y-2.5">
        {/* Waveform visualization / Status display */}
        <div
          className={cn(
            "relative w-full h-14 rounded-lg overflow-hidden",
            "bg-white/[0.02] border",
            isRecording ? "border-emerald-500/50" : "border-white/[0.06]"
          )}
        >
          {isRecording ? (
            <>
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                width={248}
                height={56}
              />
              {/* Recording indicator */}
              <div className="absolute top-2 left-2.5 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                </span>
                <span className="text-[11px] text-white/65">
                  {formatAudioDuration(duration)}
                </span>
              </div>
            </>
          ) : hasRecording ? (
            <div className="flex items-center justify-center h-full gap-2 text-[12px] text-white/65">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Ready • {formatAudioDuration(duration)}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[12px] text-white/50">
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
                "nodrag flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg",
                "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[12px] font-medium",
                "border border-rose-500/30 transition-colors"
              )}
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          ) : (
            <>
              <button
                onClick={startRecording}
                className={cn(
                  "nodrag flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg",
                  "bg-white/[0.08] hover:bg-white/[0.12] text-white/90 text-[12px] font-medium",
                  "border border-white/[0.08] transition-colors"
                )}
              >
                <Mic className="h-3.5 w-3.5" />
                {hasRecording ? "Re-record" : "Record"}
              </button>
              {hasRecording && (
                <button
                  onClick={clearRecording}
                  className={cn(
                    "nodrag px-3 py-2 rounded-lg text-[12px]",
                    "border border-white/[0.06] bg-transparent hover:bg-white/[0.04]",
                    "text-white/65 transition-colors"
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
          <p className="text-[11px] text-rose-400">{error}</p>
        )}
      </div>
    </NodeFrame>
  );
}
