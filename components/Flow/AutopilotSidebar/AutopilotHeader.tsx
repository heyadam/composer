"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, X } from "lucide-react";

interface AutopilotHeaderProps {
  onClear: () => void;
  onClose: () => void;
  hasMessages: boolean;
}

export function AutopilotHeader({
  onClear,
  onClose,
  hasMessages,
}: AutopilotHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="font-medium text-sm">Autopilot</span>
      </div>
      <div className="flex items-center gap-1">
        {hasMessages && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClear}
            title="Clear"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
