"use client";

import { motion } from "motion/react";
import { ResponsesHeader } from "./ResponsesHeader";
import { ResponsesContent } from "./ResponsesContent";
import { DebugContent } from "./DebugContent";
import { useResizableSidebar } from "@/lib/hooks/useResizableSidebar";
import { getTransition } from "@/lib/motion/presets";
import type { PreviewEntry, DebugEntry } from "./types";

const SIDEBAR_CONFIG = {
  minWidth: 240,
  maxWidth: 800,
  defaultWidth: 340,
  storageKey: "responses-sidebar-width",
  side: "right" as const,
};

interface ResponsesSidebarProps {
  entries: PreviewEntry[];
  debugEntries: DebugEntry[];
  activeTab: "responses" | "debug";
  onTabChange: (tab: "responses" | "debug") => void;
  keyError?: string | null;
  isOpen: boolean;
}

export function ResponsesSidebar({
  entries,
  debugEntries,
  activeTab,
  onTabChange,
  keyError,
  isOpen,
}: ResponsesSidebarProps) {
  const { width, isResizing, sidebarRef, startResizing } = useResizableSidebar(SIDEBAR_CONFIG);

  const w = isOpen ? width : 0;

  return (
    <motion.div
      className="h-full overflow-hidden"
      initial={false}
      animate={{ width: w, minWidth: w }}
      style={{ willChange: isResizing ? "width" : "auto" }}
      transition={getTransition(isResizing)}
    >
      <div
        ref={sidebarRef}
        className="flex flex-col h-full border-l bg-background relative"
        style={{ width, minWidth: width }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-yellow-500/50 active:bg-yellow-500/70 transition-colors z-10"
          onMouseDown={startResizing}
        />
        <ResponsesHeader
          keyError={keyError}
          activeTab={activeTab}
          onTabChange={onTabChange}
          responsesCount={entries.length}
          debugCount={debugEntries.length}
        />
        {activeTab === "responses" ? (
          <ResponsesContent entries={entries} />
        ) : (
          <DebugContent entries={debugEntries} />
        )}
      </div>
    </motion.div>
  );
}
