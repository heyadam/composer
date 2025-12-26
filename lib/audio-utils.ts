/**
 * Audio output utility functions
 *
 * Centralized utilities for handling audio output data from audio nodes.
 * Used by OutputNode, AudioInputNode, and ResponsesContent components.
 */

import type { AudioEdgeData } from "@/types/flow";

/**
 * Audio data structure for JSON output
 */
export interface AudioData {
  type: "stream" | "buffer";
  streamId?: string;
  buffer?: string; // base64-encoded audio
  mimeType?: string; // e.g., "audio/webm", "audio/wav"
  sampleRate?: number;
  duration?: number; // Duration in seconds (if known)
}

/**
 * Check if output string contains JSON audio data
 */
export function isAudioOutput(output?: string): boolean {
  if (!output) return false;
  try {
    const parsed = JSON.parse(output);
    return (
      (parsed.type === "stream" && !!parsed.streamId) ||
      (parsed.type === "buffer" && !!parsed.buffer)
    );
  } catch {
    return false;
  }
}

/**
 * Parse audio data from JSON output string
 * Returns null if output is not valid audio data
 */
export function parseAudioOutput(output: string): AudioData | null {
  try {
    const parsed = JSON.parse(output) as AudioEdgeData & { duration?: number };
    if (parsed.type === "stream" && parsed.streamId) {
      return {
        type: "stream",
        streamId: parsed.streamId,
        mimeType: parsed.mimeType,
        sampleRate: parsed.sampleRate,
        duration: parsed.duration,
      };
    }
    if (parsed.type === "buffer" && parsed.buffer) {
      return {
        type: "buffer",
        buffer: parsed.buffer,
        mimeType: parsed.mimeType || "audio/webm",
        sampleRate: parsed.sampleRate,
        duration: parsed.duration,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a blob URL from audio buffer data for playback.
 * Returns null if the buffer is invalid or corrupted.
 */
export function getAudioBlobUrl(audioData: AudioData): string | null {
  if (audioData.type === "buffer" && audioData.buffer) {
    try {
      // Validate base64 format before decoding
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(audioData.buffer)) {
        console.warn("[audio-utils] Invalid base64 format in audio buffer");
        return null;
      }

      const binaryString = atob(audioData.buffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: audioData.mimeType || "audio/webm",
      });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn("[audio-utils] Failed to decode audio buffer:", err);
      return null;
    }
  }
  return null;
}

/**
 * Format duration in seconds to mm:ss display string
 * Returns "--:--" for invalid values (Infinity, NaN, negative)
 */
export function formatAudioDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
