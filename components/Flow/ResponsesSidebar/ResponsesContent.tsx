"use client";

import { useEffect, useRef, useState } from "react";
import type { PreviewEntry } from "./types";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isImageOutput, parseImageOutput, getImageDataUrl } from "@/lib/image-utils";

interface ResponsesContentProps {
  entries: PreviewEntry[];
}

export function ResponsesContent({ entries }: ResponsesContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Auto-scroll to bottom on new entries (unless user has scrolled up)
  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, userScrolled]);

  // Reset user scroll flag when entries are cleared
  useEffect(() => {
    if (entries.length === 0) {
      setUserScrolled(false);
    }
  }, [entries.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const atBottom = scrollHeight - scrollTop - clientHeight < 20;
    setUserScrolled(!atBottom);
  };

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
          Run flow to see output
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 p-3 space-y-3 overflow-auto"
    >
      {entries.map((entry) => (
        <Message key={entry.id} from="assistant">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              {entry.nodeLabel}
            </span>
            {entry.status === "running" && (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            )}
            {entry.status === "error" && (
              <AlertTriangle className="h-3 w-3 text-destructive" />
            )}
          </div>
          <MessageContent
            className={cn(
              "rounded-lg border p-3",
              entry.status === "running" && "bg-primary/5 border-primary/20",
              entry.status === "success" && "bg-emerald-500/5 border-emerald-500/20",
              entry.status === "error" && "bg-destructive/5 border-destructive/20"
            )}
          >
            {entry.error ? (
              <p className="text-sm text-destructive whitespace-pre-wrap break-words">
                {entry.error}
              </p>
            ) : entry.output && isImageOutput(entry.output) ? (
              (() => {
                const imageData = parseImageOutput(entry.output);
                if (imageData) {
                  return (
                    <img
                      src={getImageDataUrl(imageData)}
                      alt="Generated image"
                      className="max-w-full h-auto rounded-md"
                    />
                  );
                }
                return null;
              })()
            ) : entry.output ? (
              <MessageResponse>{entry.output}</MessageResponse>
            ) : entry.status === "running" ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {entry.sourceType === "image" ? "Generating..." : "Processing..."}
                </p>
              </div>
            ) : null}
          </MessageContent>
        </Message>
      ))}
    </div>
  );
}
