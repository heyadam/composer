"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  RotateCcw,
  Play,
  Square,
  MessageSquarePlus,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTransition } from "@/lib/motion/presets";

interface ActionBarProps {
  onToggleNodes: () => void;
  onCommentAround: () => void;
  onRun: (options?: { forceExecute?: boolean }) => void;
  onCancel: () => void;
  onReset: () => void;
  nodesPaletteOpen: boolean;
  isRunning: boolean;
  hasSelection: boolean;
  /** Width of left sidebar when open */
  autopilotWidth?: number;
  /** Whether left sidebar is open */
  autopilotOpen?: boolean;
  /** Width of right sidebar when open */
  responsesWidth?: number;
  /** Whether right sidebar is open */
  responsesOpen?: boolean;
  /** Whether a sidebar is being resized */
  isResizing?: boolean;
  /** Reason why run is disabled (if any) - shown in tooltip */
  runDisabledReason?: string;
}

export function ActionBar({
  onToggleNodes,
  onCommentAround,
  onRun,
  onCancel,
  onReset,
  nodesPaletteOpen,
  isRunning,
  hasSelection,
  autopilotWidth = 0,
  autopilotOpen = false,
  responsesWidth = 0,
  responsesOpen = false,
  isResizing = false,
  runDisabledReason,
}: ActionBarProps) {
  // Track shift key for force execute
  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Calculate offset to keep centered in visible area when sidebars open
  // Left sidebar overlays canvas, so we need to offset by half its width
  // Right sidebar also overlays canvas now, so we offset by negative half its width
  const leftOffset = autopilotOpen ? autopilotWidth / 2 : 0;
  const rightOffset = responsesOpen ? responsesWidth / 2 : 0;
  const centerOffset = leftOffset - rightOffset;

  return (
    <TooltipProvider delayDuration={200}>
        <motion.div
          className="absolute bottom-6 left-1/2 z-20"
          initial={false}
          animate={{ x: `calc(-50% + ${centerOffset}px)` }}
          transition={getTransition(isResizing)}
        >
          <div className="glass-panel flex items-center gap-1 p-1.5">
            {/* Section 1: Add Node & Comment */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleNodes}
                  data-node-toolbar-toggle
                  className={`h-10 w-10 rounded-lg transition-colors ${
                    nodesPaletteOpen
                      ? "bg-white/20 text-white"
                      : "text-neutral-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 text-white border-neutral-700">
                Add Node
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCommentAround}
                  disabled={!hasSelection}
                  className="h-10 w-10 rounded-lg transition-colors text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 text-white border-neutral-700">
                {hasSelection ? "Comment Around" : "Select nodes first"}
              </TooltipContent>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10 mx-1" />

            {/* Section 3: Reset & Run */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReset}
                  disabled={isRunning}
                  className="h-10 w-10 rounded-lg transition-colors text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 text-white border-neutral-700">
                Reset
              </TooltipContent>
            </Tooltip>

            {isRunning ? (
              <Button
                onClick={onCancel}
                className="h-10 px-4 rounded-lg gap-2 bg-red-600 text-white hover:bg-red-500"
              >
                <Square className="h-4 w-4" />
                Cancel
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      onClick={() => onRun({ forceExecute: shiftHeld })}
                      disabled={!!runDisabledReason}
                      className={`h-10 px-4 rounded-lg gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                        shiftHeld
                          ? "bg-amber-600 hover:bg-amber-500 disabled:hover:bg-amber-600"
                          : "bg-green-600 hover:bg-green-500 disabled:hover:bg-green-600"
                      }`}
                    >
                      {shiftHeld ? (
                        <Zap className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {shiftHeld ? "Force Run" : "Run"}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-neutral-800 text-white border-neutral-700">
                  {runDisabledReason || (shiftHeld ? "Ignore cache, re-execute all nodes" : "Hold Shift to force re-execute")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </motion.div>
    </TooltipProvider>
  );
}
