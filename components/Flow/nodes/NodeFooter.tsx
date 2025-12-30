"use client";

import { ReactNode } from "react";
import { ThinkingSummary } from "@/components/ThinkingSummary";
import { parseImageOutput, getImageDataUrl } from "@/lib/image-utils";
import { AudioPreview } from "@/components/Flow/ResponsesSidebar/AudioPreview";

interface NodeFooterProps {
  /** Error message to display (takes priority over output) */
  error?: string;
  /** Text output to display */
  output?: string;
  /** Reasoning/thinking output (renders as collapsible ThinkingSummary) */
  reasoning?: string;
  /** Image output (JSON string from image-utils) */
  imageOutput?: string;
  /** Audio output (for audio nodes) */
  audioOutput?: string;
  /** Custom content to render (takes priority over standard output rendering) */
  children?: ReactNode;
  /** Message shown when there's no output yet */
  emptyMessage?: string;
  /** Maximum lines for text output before truncation */
  maxLines?: number;
}

/**
 * Standardized footer component for node execution output.
 *
 * Handles the common patterns for displaying execution results:
 * - Error messages (red text)
 * - Text output with line clamping
 * - Reasoning/thinking (collapsible)
 * - Image previews
 * - Audio previews
 *
 * @example
 * // Simple text output
 * <NodeFooter error={data.executionError} output={data.executionOutput} />
 *
 * // With reasoning (PromptNode)
 * <NodeFooter
 *   error={data.executionError}
 *   output={data.executionOutput}
 *   reasoning={data.executionReasoning}
 * />
 *
 * // With image output (ImageNode)
 * <NodeFooter
 *   error={data.executionError}
 *   imageOutput={data.executionOutput}
 * />
 *
 * // With custom content
 * <NodeFooter error={data.executionError}>
 *   <CustomOutputDisplay data={data} />
 * </NodeFooter>
 */
export function NodeFooter({
  error,
  output,
  reasoning,
  imageOutput,
  audioOutput,
  children,
  emptyMessage,
  maxLines = 4,
}: NodeFooterProps) {
  // Error takes priority
  if (error) {
    return (
      <p className="text-xs text-rose-400 whitespace-pre-wrap line-clamp-4">
        {error}
      </p>
    );
  }

  // Custom children override standard rendering
  if (children) {
    return <>{children}</>;
  }

  // Check if there's any output to display
  const hasOutput = output || reasoning || imageOutput || audioOutput;

  if (!hasOutput) {
    if (emptyMessage) {
      return (
        <p className="text-xs text-white/40 italic">
          {emptyMessage}
        </p>
      );
    }
    return null;
  }

  // Render the output(s)
  return (
    <div className="space-y-2">
      {reasoning && <ThinkingSummary reasoning={reasoning} />}

      {imageOutput && (() => {
        const imageData = parseImageOutput(imageOutput);
        return imageData ? (
          <div className="w-full rounded-lg overflow-hidden bg-black/30 border border-white/10">
            <img
              src={getImageDataUrl(imageData)}
              alt="Generated"
              className="w-full h-auto max-h-[120px] object-cover"
            />
          </div>
        ) : null;
      })()}

      {audioOutput && <AudioPreview output={audioOutput} compact />}

      {output && (
        <p
          className="text-xs text-white/60 whitespace-pre-wrap"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {output}
        </p>
      )}
    </div>
  );
}
