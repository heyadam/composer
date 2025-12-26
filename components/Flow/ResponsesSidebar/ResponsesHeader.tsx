"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ResponsesHeaderProps {
  keyError?: string | null;
  activeTab: "responses" | "debug";
  onTabChange: (tab: "responses" | "debug") => void;
  responsesCount: number;
  debugCount: number;
  onClose: () => void;
}

export function ResponsesHeader({
  keyError,
  activeTab,
  onTabChange,
  responsesCount,
  debugCount,
  onClose,
}: ResponsesHeaderProps) {
  return (
    <div className="flex flex-col border-b glass-divider shrink-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTabChange("responses")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeTab === "responses"
                ? "bg-white/15 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/10"
            )}
          >
            Outputs{responsesCount > 0 && ` (${responsesCount})`}
          </button>
          <button
            onClick={() => onTabChange("debug")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeTab === "debug"
                ? "bg-white/15 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/10"
            )}
          >
            Debug{debugCount > 0 && ` (${debugCount})`}
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-white/10"
          onClick={onClose}
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {keyError && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500">{keyError}</p>
        </div>
      )}
    </div>
  );
}
