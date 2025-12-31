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
    audioInStreamId,
    onTranscriptUpdate,
    onStatusChange,
    onAudioOutStream,
    shareToken,
    runId,
  } = options;
  const { keys: apiKeys } = useApiKeys();

  // Use refs for callbacks to avoid infinite loops when callbacks trigger re-renders
  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  const onStatusChangeRef = useRef(onStatusChange);
  const onAudioOutStreamRef = useRef(onAudioOutStream);

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onTranscriptUpdateRef.current = onTranscriptUpdate;
    onStatusChangeRef.current = onStatusChange;
    onAudioOutStreamRef.current = onAudioOutStream;
  });

  const [status, setStatus] = useState<RealtimeSessionStatus>("disconnected");
  const [transcript, setTranscript] = useState<RealtimeTranscriptEntry[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);  // Track mic stream for cleanup
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update parent when status changes
  useEffect(() => {
    onStatusChangeRef.current(status);
  }, [status]);

  // Update parent when transcript changes
  useEffect(() => {
    onTranscriptUpdateRef.current(transcript);
  }, [transcript]);

  // Memoized server event handler
  const handleServerEvent = useCallback((event: { type: string; [key: string]: unknown }) => {
    switch (event.type) {
      case "session.created":
      case "session.updated":
        // Session lifecycle events - no action needed
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
        // Rate limit info available in event.rate_limits if needed
        break;

      case "error":
        console.error("Realtime API error:", event);
        const errorMsg = (event.error as { message?: string })?.message || "Unknown error";
        setErrorMessage(errorMsg);
        setStatus("error");
        break;
    }
  }, []);

  const disconnect = useCallback(() => {
    // Stop microphone stream to release the device
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    // Clean up audio element
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
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

      // Monitor WebRTC connection state for errors
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          setErrorMessage("WebRTC connection failed");
          setStatus("error");
        }
        // "disconnected" state may recover automatically
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          setErrorMessage("ICE connection failed - check network connectivity");
          setStatus("error");
        }
      };

      // 3. Set up remote audio playback and register output stream
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        // Register the output stream for downstream nodes
        if (onAudioOutStreamRef.current && e.streams[0]) {
          const streamId = audioRegistry.register(e.streams[0]);
          onAudioOutStreamRef.current(streamId);
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
      const audioTrack = audioStream.getTracks()[0];
      if (!audioTrack) {
        throw new Error("No audio track available from audio source");
      }
      pc.addTrack(audioTrack);

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
        disconnect();
      }, MAX_SESSION_SECONDS * 1000);

    } catch (error) {
      console.error("Realtime connection error:", error);
      const msg = error instanceof Error ? error.message : "Connection failed";
      setErrorMessage(msg);
      setStatus("error");
    }
  }, [apiKeys, audioInStreamId, handleServerEvent, shareToken, runId, disconnect]);

  const sendEvent = useCallback((event: object) => {
    dcRef.current?.send(JSON.stringify(event));
  }, []);

  // Clear transcript (used when flow is reset)
  const clearTranscript = useCallback(() => {
    setTranscript([]);
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
    clearTranscript,
  };
}
