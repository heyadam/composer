"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, X, AlertTriangle } from "lucide-react";

interface AutopilotHeaderProps {
  onClear: () => void;
  onClose: () => void;
  hasMessages: boolean;
  testModeEnabled?: boolean;
  onTestModeChange?: (enabled: boolean) => void;
}

export function AutopilotHeader({
  onClear,
  onClose,
  hasMessages,
  testModeEnabled,
  onTestModeChange,
}: AutopilotHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="font-medium text-sm">Composer AI</span>
        {process.env.NEXT_PUBLIC_DEV_MODE === "true" && onTestModeChange && (
          <Button
            variant="ghost"
            size="sm"
            className={`h-5 px-1.5 text-[10px] gap-1 ${
              testModeEnabled
                ? "text-orange-600 hover:text-orange-700 bg-orange-100 dark:bg-orange-950/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onTestModeChange(!testModeEnabled)}
            title={testModeEnabled ? "Disable test mode (bad JSON)" : "Enable test mode (bad JSON)"}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Test</span>
          </Button>
        )}
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
