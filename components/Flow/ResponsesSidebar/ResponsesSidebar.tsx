"use client";

import { ResponsesHeader } from "./ResponsesHeader";
import { ResponsesContent } from "./ResponsesContent";
import type { PreviewEntry } from "./types";

interface ResponsesSidebarProps {
  entries: PreviewEntry[];
  onClear: () => void;
}

export function ResponsesSidebar({
  entries,
  onClear,
}: ResponsesSidebarProps) {
  return (
    <div className="flex flex-col h-full w-[340px] border-l bg-background">
      <ResponsesHeader onClear={onClear} hasEntries={entries.length > 0} />
      <ResponsesContent entries={entries} />
    </div>
  );
}
