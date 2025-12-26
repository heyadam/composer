"use client";

import { useEffect } from "react";
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
  onClose: () => void;
  /** Called when sidebar width or resize state changes (for parent layout adjustments) */
  onWidthChange?: (width: number, isResizing: boolean) => void;
}

export function ResponsesSidebar({
  entries,
  debugEntries,
  activeTab,
  onTabChange,
  keyError,
  isOpen,
  onClose,
  onWidthChange,
}: ResponsesSidebarProps) {
  const { width, isResizing, sidebarRef, startResizing } = useResizableSidebar(SIDEBAR_CONFIG);

  // Report width and resize state changes to parent for layout adjustments
  useEffect(() => {
    onWidthChange?.(width, isResizing);
  }, [width, isResizing, onWidthChange]);

  const w = isOpen ? width : 0;

  return (
    <motion.div
      className="absolute right-0 top-0 h-full z-20 shadow-[-8px_0_24px_rgba(0,0,0,0.4)]"
      initial={false}
      animate={{ width: w, minWidth: w }}
      style={{ willChange: isResizing ? "width" : "auto" }}
      transition={getTransition(isResizing)}
    >
      <div
        ref={sidebarRef}
        className="glass-panel !rounded-none border-y-0 border-r-0 flex flex-col h-full relative overflow-hidden"
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
          onClose={onClose}
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
