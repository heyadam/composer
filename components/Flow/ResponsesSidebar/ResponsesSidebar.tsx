"use client";

import { ResponsesHeader } from "./ResponsesHeader";
import { ResponsesContent } from "./ResponsesContent";
import type { PreviewEntry } from "./types";

interface ResponsesSidebarProps {
  entries: PreviewEntry[];
  onRun: () => void;
  onReset: () => void;
  isRunning: boolean;
}

export function ResponsesSidebar({
  entries,
  onRun,
  onReset,
  isRunning,
}: ResponsesSidebarProps) {
  return (
    <div className="flex flex-col h-full w-[340px] border-l bg-background">
      <ResponsesHeader onRun={onRun} onReset={onReset} isRunning={isRunning} />
      <ResponsesContent entries={entries} />
    </div>
  );
}
