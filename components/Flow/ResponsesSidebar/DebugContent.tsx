"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, AlertTriangle, CheckCircle, Copy, Check } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { DebugEntry } from "./types";

interface DebugContentProps {
  entries: DebugEntry[];
}

function formatDebugEntry(entry: DebugEntry): string {
  const lines: string[] = [];

  lines.push(`## ${entry.nodeLabel} (${entry.request.type})`);
  lines.push(`Status: ${entry.status}${entry.durationMs ? ` | Duration: ${entry.durationMs}ms` : ""}`);
  lines.push("");

  lines.push("### Request");
  lines.push(`- Provider: ${entry.request.provider}`);
  lines.push(`- Model: ${entry.request.model}`);

  if (entry.request.verbosity) {
    lines.push(`- Verbosity: ${entry.request.verbosity}`);
  }
  if (entry.request.thinking !== undefined) {
    lines.push(`- Thinking: ${entry.request.thinking ? "enabled" : "disabled"}`);
  }
  if (entry.request.type === "image") {
    if (entry.request.size) lines.push(`- Size: ${entry.request.size}`);
    if (entry.request.quality) lines.push(`- Quality: ${entry.request.quality}`);
    if (entry.request.aspectRatio) lines.push(`- Aspect Ratio: ${entry.request.aspectRatio}`);
  }
  lines.push("");

  if (entry.request.type === "prompt") {
    if (entry.request.systemPrompt !== undefined) {
      lines.push("### System Prompt");
      lines.push("```");
      lines.push(entry.request.systemPrompt || "(empty)");
      lines.push("```");
      lines.push("");
    }
    if (entry.request.userPrompt !== undefined) {
      lines.push("### User Prompt");
      lines.push("```");
      lines.push(entry.request.userPrompt || "(empty)");
      lines.push("```");
      lines.push("");
    }
  } else if (entry.request.imagePrompt) {
    lines.push("### Image Prompt");
    lines.push("```");
    lines.push(entry.request.imagePrompt);
    lines.push("```");
    lines.push("");
  }

  if (entry.response) {
    lines.push("### Response");
    if (entry.response.streamChunksReceived) {
      lines.push(`(${entry.response.streamChunksReceived} chunks received)`);
    }
    lines.push("```");
    lines.push(entry.response.output.length > 2000
      ? entry.response.output.substring(0, 2000) + "...(truncated)"
      : entry.response.output);
    lines.push("```");
    lines.push("");
  }

  if (entry.error) {
    lines.push("### Error");
    lines.push("```");
    lines.push(entry.error);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

function formatAllEntries(entries: DebugEntry[]): string {
  return entries.map(formatDebugEntry).join("\n---\n\n");
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
        copied
          ? "bg-emerald-500/20 text-emerald-500"
          : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label}
        </>
      )}
    </button>
  );
}

function DebugEntryCard({ entry }: { entry: DebugEntry }) {
  const [requestOpen, setRequestOpen] = useState(true);
  const [promptsOpen, setPromptsOpen] = useState(true);
  const [responseOpen, setResponseOpen] = useState(true);
  const [rawOpen, setRawOpen] = useState(false);

  const hasPrompts =
    entry.request.type === "prompt" &&
    (entry.request.userPrompt || entry.request.systemPrompt);
  const hasImagePrompt =
    entry.request.type === "image" && entry.request.imagePrompt;

  const statusIcon =
    entry.status === "running" ? (
      <Loader2 className="h-3 w-3 animate-spin text-primary" />
    ) : entry.status === "success" ? (
      <CheckCircle className="h-3 w-3 text-emerald-500" />
    ) : entry.status === "error" ? (
      <AlertTriangle className="h-3 w-3 text-destructive" />
    ) : null;

  const borderColor =
    entry.status === "running"
      ? "border-primary/30"
      : entry.status === "success"
        ? "border-emerald-500/30"
        : entry.status === "error"
          ? "border-destructive/30"
          : "border-border";

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", borderColor)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="font-medium text-sm">{entry.nodeLabel}</span>
          <span className="text-xs text-muted-foreground capitalize">
            ({entry.request.type})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {entry.durationMs !== undefined && (
            <span className="text-xs text-muted-foreground">
              {entry.durationMs}ms
            </span>
          )}
          <CopyButton text={formatDebugEntry(entry)} />
        </div>
      </div>

      {/* Request Info */}
      <Collapsible open={requestOpen} onOpenChange={setRequestOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              requestOpen ? "" : "-rotate-90"
            )}
          />
          Request Info
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="text-xs space-y-1 pl-4 border-l border-muted">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-16">Provider:</span>
              <span className="font-mono">{entry.request.provider}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-16">Model:</span>
              <span className="font-mono">{entry.request.model}</span>
            </div>
            {entry.request.verbosity && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-16">Verbosity:</span>
                <span className="font-mono">{entry.request.verbosity}</span>
              </div>
            )}
            {entry.request.thinking !== undefined && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-16">Thinking:</span>
                <span className="font-mono">
                  {entry.request.thinking ? "enabled" : "disabled"}
                </span>
              </div>
            )}
            {entry.request.type === "image" && (
              <>
                {entry.request.size && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16">Size:</span>
                    <span className="font-mono">{entry.request.size}</span>
                  </div>
                )}
                {entry.request.quality && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16">Quality:</span>
                    <span className="font-mono">{entry.request.quality}</span>
                  </div>
                )}
                {entry.request.aspectRatio && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16">Aspect:</span>
                    <span className="font-mono">{entry.request.aspectRatio}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Prompts (for prompt nodes) */}
      {hasPrompts && (
        <Collapsible open={promptsOpen} onOpenChange={setPromptsOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                promptsOpen ? "" : "-rotate-90"
              )}
            />
            Prompts
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {entry.request.systemPrompt !== undefined && (
              <div className="pl-4 border-l border-muted">
                <span className="text-xs text-muted-foreground block mb-1">
                  System Prompt:
                </span>
                <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-auto">
                  {entry.request.systemPrompt || "(empty)"}
                </pre>
              </div>
            )}
            {entry.request.userPrompt !== undefined && (
              <div className="pl-4 border-l border-muted">
                <span className="text-xs text-muted-foreground block mb-1">
                  User Prompt:
                </span>
                <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-auto">
                  {entry.request.userPrompt || "(empty)"}
                </pre>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Image Prompt (for image nodes) */}
      {hasImagePrompt && (
        <Collapsible open={promptsOpen} onOpenChange={setPromptsOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                promptsOpen ? "" : "-rotate-90"
              )}
            />
            Image Prompt
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="pl-4 border-l border-muted">
              <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-auto">
                {entry.request.imagePrompt}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Response */}
      {entry.response && (
        <Collapsible open={responseOpen} onOpenChange={setResponseOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                responseOpen ? "" : "-rotate-90"
              )}
            />
            Response
            {entry.response.isStreaming && (
              <span className="text-primary ml-1">(streaming...)</span>
            )}
            {entry.response.streamChunksReceived !== undefined && (
              <span className="text-muted-foreground ml-1">
                ({entry.response.streamChunksReceived} chunks)
              </span>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="pl-4 border-l border-muted">
              <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap break-words max-h-48 overflow-auto">
                {entry.response.output.length > 2000
                  ? entry.response.output.substring(0, 2000) + "...(truncated)"
                  : entry.response.output}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Error */}
      {entry.error && (
        <div className="pl-4 border-l border-destructive">
          <span className="text-xs text-destructive font-medium block mb-1">
            Error:
          </span>
          <pre className="text-xs font-mono bg-destructive/10 text-destructive rounded p-2 whitespace-pre-wrap break-words">
            {entry.error}
          </pre>
        </div>
      )}

      {/* Raw Request Body */}
      {entry.rawRequestBody && (
        <Collapsible open={rawOpen} onOpenChange={setRawOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                rawOpen ? "" : "-rotate-90"
              )}
            />
            Raw Request Body
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="pl-4 border-l border-muted">
              <pre className="text-xs font-mono bg-muted/50 rounded p-2 whitespace-pre-wrap break-words max-h-48 overflow-auto">
                {entry.rawRequestBody}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export function DebugContent({ entries }: DebugContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Auto-scroll to bottom when new entries are added (unless user scrolled up)
  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, userScrolled]);

  // Reset scroll flag when entries are cleared
  useEffect(() => {
    if (entries.length === 0) {
      setUserScrolled(false);
    }
  }, [entries.length]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    setUserScrolled(!isAtBottom);
  };

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
          Run a flow to see debug information here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Copy All button */}
      <div className="flex justify-end px-4 py-2 border-b shrink-0">
        <CopyButton text={formatAllEntries(entries)} label="Copy All" />
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {entries.map((entry) => (
          <DebugEntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
