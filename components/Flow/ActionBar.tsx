"use client";

import {
  Plus,
  RotateCcw,
  Play,
  Square,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActionBarProps {
  onToggleNodes: () => void;
  onCommentAround: () => void;
  onRun: () => void;
  onCancel: () => void;
  onReset: () => void;
  nodesPaletteOpen: boolean;
  isRunning: boolean;
  hasSelection: boolean;
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
}: ActionBarProps) {
  return (
    <TooltipProvider delayDuration={200}>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-1 p-1.5 rounded-xl bg-neutral-900/95 backdrop-blur border border-neutral-700 shadow-lg">
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
                      ? "bg-neutral-700 text-white"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800"
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
                  className="h-10 w-10 rounded-lg transition-colors text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 text-white border-neutral-700">
                {hasSelection ? "Comment Around" : "Select nodes first"}
              </TooltipContent>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-6 bg-neutral-700 mx-1" />

            {/* Section 3: Reset & Run */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReset}
                  disabled={isRunning}
                  className="h-10 w-10 rounded-lg transition-colors text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-50"
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
              <Button
                onClick={onRun}
                className="h-10 px-4 rounded-lg gap-2 bg-green-600 text-white hover:bg-green-500"
              >
                <Play className="h-4 w-4" />
                Run
              </Button>
            )}
          </div>
        </div>
    </TooltipProvider>
  );
}
