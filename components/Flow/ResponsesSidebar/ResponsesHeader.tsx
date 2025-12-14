"use client";

import { cn } from "@/lib/utils";

interface ResponsesHeaderProps {
  keyError?: string | null;
  activeTab: "responses" | "debug";
  onTabChange: (tab: "responses" | "debug") => void;
  responsesCount: number;
  debugCount: number;
}

export function ResponsesHeader({
  keyError,
  activeTab,
  onTabChange,
  responsesCount,
  debugCount,
}: ResponsesHeaderProps) {
  return (
    <div className="flex flex-col border-b shrink-0">
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          onClick={() => onTabChange("responses")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            activeTab === "responses"
              ? "bg-yellow-500/20 text-yellow-500"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          Responses{responsesCount > 0 && ` (${responsesCount})`}
        </button>
        <button
          onClick={() => onTabChange("debug")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            activeTab === "debug"
              ? "bg-yellow-500/20 text-yellow-500"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          Debug{debugCount > 0 && ` (${debugCount})`}
        </button>
      </div>
      {keyError && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-500">{keyError}</p>
        </div>
      )}
    </div>
  );
}
