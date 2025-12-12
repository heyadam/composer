"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ResponsesHeaderProps {
  onClear: () => void;
  hasEntries: boolean;
}

export function ResponsesHeader({ onClear, hasEntries }: ResponsesHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b shrink-0">
      <span className="text-sm font-medium">Responses</span>
      {hasEntries && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          title="Clear"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
