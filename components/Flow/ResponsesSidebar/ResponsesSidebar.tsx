"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ResponsesHeader } from "./ResponsesHeader";
import { ResponsesContent } from "./ResponsesContent";
import { DebugContent } from "./DebugContent";
import type { PreviewEntry, DebugEntry } from "./types";

const MIN_WIDTH = 240;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 340;
const STORAGE_KEY = "responses-sidebar-width";

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
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load saved width from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidth(parsed);
      }
    }
  }, []);

  // Save width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, width.toString());
  }, [width]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;

      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const newWidth = sidebarRect.right - e.clientX;

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <div
      className="h-full overflow-hidden transition-[width,min-width] duration-300 ease-out"
      style={{
        width: isOpen ? width : 0,
        minWidth: isOpen ? width : 0,
      }}
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
    </div>
  );
}
