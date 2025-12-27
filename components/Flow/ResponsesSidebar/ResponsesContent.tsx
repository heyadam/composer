"use client";

import { useEffect, useRef, useState } from "react";
import type { PreviewEntry } from "./types";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isImageOutput, parseImageOutput, getImageDataUrl } from "@/lib/image-utils";
import { isReactOutput, parseReactOutput } from "@/lib/react-utils";
import { isAudioOutput } from "@/lib/audio-utils";
import { ReactPreview } from "./ReactPreview";
import { AudioPreview } from "./AudioPreview";

interface ResponsesContentProps {
  entries: PreviewEntry[];
}

function ResponseCard({ entry }: { entry: PreviewEntry }) {
  const renderContent = () => {
    if (entry.error) {
      return (
        <p className="text-sm text-destructive whitespace-pre-wrap break-words">
          {entry.error}
        </p>
      );
    }

    // For preview-output nodes, render all connected outputs
    if (entry.nodeType === "preview-output") {
      const outputs: React.ReactNode[] = [];

      // Render image output
      if (entry.imageOutput && isImageOutput(entry.imageOutput)) {
        const imageData = parseImageOutput(entry.imageOutput);
        if (imageData) {
          outputs.push(
            <img
              key="image"
              src={getImageDataUrl(imageData)}
              alt="Generated"
              className="w-full h-auto rounded"
            />
          );
        }
      }

      // Render audio output
      if (entry.audioOutput && isAudioOutput(entry.audioOutput)) {
        outputs.push(
          <AudioPreview key="audio" output={entry.audioOutput} />
        );
      }

      // Render string output (text)
      if (entry.stringOutput) {
        // Check if it's actually a React component
        if (isReactOutput(entry.stringOutput)) {
          const reactData = parseReactOutput(entry.stringOutput);
          if (reactData) {
            outputs.push(<ReactPreview key="react" data={reactData} />);
          }
        } else {
          outputs.push(
            <p key="string" className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {entry.stringOutput}
            </p>
          );
        }
      }

      if (outputs.length > 0) {
        return <div className="space-y-3">{outputs}</div>;
      }

      // Show loading state if no outputs yet
      if (entry.status === "running") {
        return (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {entry.sourceType === "image-generation" ? "Generating image..." : "Generating..."}
            </span>
          </div>
        );
      }

      return null;
    }

    // For other node types, use the combined output field
    if (entry.output) {
      if (isReactOutput(entry.output)) {
        const reactData = parseReactOutput(entry.output);
        return reactData ? <ReactPreview data={reactData} /> : null;
      }

      if (isAudioOutput(entry.output)) {
        return <AudioPreview output={entry.output} />;
      }

      if (isImageOutput(entry.output)) {
        const imageData = parseImageOutput(entry.output);
        return imageData ? (
          <img
            src={getImageDataUrl(imageData)}
            alt="Generated"
            className="w-full h-auto rounded"
          />
        ) : null;
      }

      return (
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {entry.output}
        </p>
      );
    }

    if (entry.status === "running") {
      return (
        <div className="flex items-center gap-2 py-1">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {entry.sourceType === "image-generation" ? "Generating image..." : "Generating..."}
          </span>
        </div>
      );
    }

    return null;
  };

  const StatusIcon = {
    idle: <div className="h-3.5 w-3.5 rounded-full border border-white/20" />,
    running: <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />,
    success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    error: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
  }[entry.status];

  return (
    <div
      className={cn(
        "rounded-lg border bg-white/[0.02] overflow-hidden",
        entry.status === "running" && "border-yellow-500/30",
        entry.status === "success" && "border-white/10",
        entry.status === "error" && "border-destructive/30"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/[0.02]">
        {StatusIcon}
        <span className="text-xs font-medium text-foreground/70 truncate">
          {entry.nodeLabel}
        </span>
      </div>
      <div className="p-3">{renderContent()}</div>
    </div>
  );
}

export function ResponsesContent({ entries }: ResponsesContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, userScrolled]);

  useEffect(() => {
    if (entries.length === 0) {
      setUserScrolled(false);
    }
  }, [entries.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setUserScrolled(scrollHeight - scrollTop - clientHeight >= 20);
  };

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Run flow to see output</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 p-3 space-y-2 overflow-auto"
    >
      {entries.map((entry) => (
        <ResponseCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
