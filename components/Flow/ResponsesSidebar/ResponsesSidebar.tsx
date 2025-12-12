"use client";

import { ResponsesHeader } from "./ResponsesHeader";
import { ResponsesContent } from "./ResponsesContent";
import { ResponsesInput } from "./ResponsesInput";
import type { PreviewEntry } from "./types";

interface ResponsesSidebarProps {
  entries: PreviewEntry[];
  onClear: () => void;
  userInput: string;
  onUserInputChange: (value: string) => void;
  onRun: () => void;
  onReset: () => void;
  isRunning: boolean;
}

export function ResponsesSidebar({
  entries,
  onClear,
  userInput,
  onUserInputChange,
  onRun,
  onReset,
  isRunning,
}: ResponsesSidebarProps) {
  return (
    <div className="flex flex-col h-full w-[340px] border-l bg-background">
      <ResponsesHeader onClear={onClear} hasEntries={entries.length > 0} />
      <ResponsesContent entries={entries} />
      <ResponsesInput
        value={userInput}
        onChange={onUserInputChange}
        onRun={onRun}
        onReset={onReset}
        isRunning={isRunning}
      />
    </div>
  );
}
