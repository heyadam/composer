"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseAudioOutput,
  getAudioBlobUrl,
  formatAudioDuration,
} from "@/lib/audio-utils";

interface AudioPreviewProps {
  output: string;
  compact?: boolean;
  className?: string;
}

export function AudioPreview({ output, compact = false, className }: AudioPreviewProps) {
  // Memoize audioData to prevent re-parsing on every render
  const audioData = useMemo(() => parseAudioOutput(output), [output]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Initialize audio from buffer - only run when output changes
  useEffect(() => {
    if (!audioData || audioData.type !== "buffer") return;

    // Set duration from audio data if available (more reliable than element metadata)
    if (audioData.duration !== undefined) {
      setDuration(audioData.duration);
    }

    const url = getAudioBlobUrl(audioData);
    if (url) {
      // Clean up previous blob URL if exists
      if (blobUrlRef.current) {
        // Pause audio before revoking to prevent playback errors
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = url;
      setBlobUrl(url);
    }

    return () => {
      // Pause audio before revoking blob URL to prevent playback errors
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [audioData]);

  // Set up Web Audio analyser for visualization
  const setupAudioContext = useCallback((audioElement: HTMLAudioElement) => {
    if (audioContextRef.current) return;

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch {
      // Audio context may fail in some environments
    }
  }, []);

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgba(0, 0, 0, 0)";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient from emerald to cyan
        const hue = 160 + (i / bufferLength) * 20;
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.8)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      drawWaveform();
    }
  }, [isPlaying, drawWaveform]);

  // Handle audio events
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      // Prefer duration from audio data (reliable) over element metadata (often Infinity for WebM)
      const elementDuration = audioRef.current.duration;
      if (audioData?.duration !== undefined) {
        setDuration(audioData.duration);
      } else if (Number.isFinite(elementDuration)) {
        setDuration(elementDuration);
      }
      setupAudioContext(audioRef.current);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    // Resume audio context if suspended (browser autoplay policy)
    if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      await audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  if (!audioData) {
    return null;
  }

  // Compact mode: just show icon + duration
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Volume2 className="h-4 w-4 text-emerald-500" />
        <span>Audio {duration > 0 ? `• ${formatAudioDuration(duration)}` : ""}</span>
      </div>
    );
  }

  // Full mode: waveform + controls
  return (
    <div className={cn("space-y-2", className)}>
      {/* Hidden audio element */}
      {blobUrl && (
        <audio
          ref={audioRef}
          src={blobUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          preload="metadata"
        />
      )}

      {/* Waveform visualization */}
      <div className="relative w-full h-16 rounded-md border border-input bg-background/60 dark:bg-muted/40 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          width={400}
          height={64}
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Volume2 className="h-5 w-5 text-emerald-500" />
              <span>Audio ready</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!blobUrl}
          className={cn(
            "p-2 rounded-full transition-colors",
            "bg-emerald-500 hover:bg-emerald-600 text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10 text-right">
            {formatAudioDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={!blobUrl}
            className={cn(
              "flex-1 h-1.5 rounded-full appearance-none cursor-pointer",
              "bg-muted [&::-webkit-slider-thumb]:appearance-none",
              "[&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3",
              "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
            )}
          />
          <span className="text-xs text-muted-foreground w-10">
            {formatAudioDuration(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
