"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Bell, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { UpdateEntry } from "@/lib/hooks/useUpdates";

interface UpdatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updates: UpdateEntry[];
  fetchUpdateContent: (id: string) => Promise<string>;
  onOpen?: () => void;
}

export function UpdatesModal({
  open,
  onOpenChange,
  updates,
  fetchUpdateContent,
  onOpen,
}: UpdatesModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [content, setContent] = useState<string>("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const currentUpdate = updates[currentIndex];

  // Notify parent when modal opens
  useEffect(() => {
    if (open && onOpen) {
      onOpen();
    }
  }, [open, onOpen]);

  // Load content when update changes
  useEffect(() => {
    if (!currentUpdate) {
      setContent("");
      return;
    }

    let cancelled = false;
    setIsLoadingContent(true);

    fetchUpdateContent(currentUpdate.id).then((text) => {
      if (!cancelled) {
        setContent(text);
        setIsLoadingContent(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentUpdate, fetchUpdateContent]);

  // Reset to first update when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open]);

  const hasPrev = currentIndex < updates.length - 1;
  const hasNext = currentIndex > 0;

  const goToPrev = () => {
    if (hasPrev) setCurrentIndex(currentIndex + 1);
  };

  const goToNext = () => {
    if (hasNext) setCurrentIndex(currentIndex - 1);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (updates.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Updates
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            No updates yet. Check back later!
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-zinc-950 border-white/10 max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Updates
          </DialogTitle>
        </DialogHeader>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoadingContent ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-xs text-muted-foreground mb-4">
                {formatDate(currentUpdate.date)}
              </div>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold mt-0 mb-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold mt-6 mb-3">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-medium mt-4 mb-2">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-muted-foreground mb-3">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="text-sm text-muted-foreground list-disc pl-4 mb-4 space-y-1">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  strong: ({ children }) => (
                    <strong className="text-white font-medium">{children}</strong>
                  ),
                  code: ({ children }) => (
                    <code className="bg-white/10 px-1 py-0.5 rounded text-xs">
                      {children}
                    </code>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Navigation footer */}
        {updates.length > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-white/10 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrev}
              disabled={!hasPrev}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Older
            </Button>
            <span className="text-xs text-muted-foreground">
              {updates.length - currentIndex} of {updates.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              disabled={!hasNext}
              className="gap-1"
            >
              Newer
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
