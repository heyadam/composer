"use client";

import { Settings, PanelRight, BookOpen, Bell } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProfileDropdown } from "../ProfileDropdown";
import { AnimatedLabel } from "./AnimatedLabel";
import type { RightControlsProps } from "./types";

export function RightControls({
  responsesOpen,
  onResponsesToggle,
  showLabels,
  showSettingsWarning,
  onSettingsOpen,
  hasUnseenUpdates,
  onUpdatesOpen,
}: RightControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Docs */}
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 transition-colors rounded-full border bg-background/50 backdrop-blur-sm text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-muted-foreground/40"
          >
            <BookOpen className="w-5 h-5" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-neutral-800 text-white border-neutral-700">
          Documentation
        </TooltipContent>
      </Tooltip>

      {/* Updates */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onUpdatesOpen}
            className="p-2 transition-colors rounded-full border bg-background/50 backdrop-blur-sm text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-muted-foreground/40 relative cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {hasUnseenUpdates && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-purple-500" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-neutral-800 text-white border-neutral-700">
          {hasUnseenUpdates ? "New updates" : "Updates"}
        </TooltipContent>
      </Tooltip>

      {/* Settings */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onSettingsOpen}
            className={`p-2 transition-colors rounded-full border bg-background/50 backdrop-blur-sm relative cursor-pointer ${
              showSettingsWarning
                ? "text-amber-400 hover:text-amber-300 border-amber-500/50 hover:border-amber-400/50"
                : "text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-muted-foreground/40"
            }`}
          >
            <Settings className="w-5 h-5" />
            {showSettingsWarning && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-neutral-800 text-white border-neutral-700">
          {showSettingsWarning ? "Configure API Keys" : "Settings"}
        </TooltipContent>
      </Tooltip>

      {/* Profile */}
      <ProfileDropdown />

      {/* Preview Sidebar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onResponsesToggle}
            className={`flex items-center gap-1.5 px-2.5 py-2 transition-colors rounded-full border bg-background/50 backdrop-blur-sm text-sm cursor-pointer ${
              responsesOpen
                ? "text-foreground border-muted-foreground/40"
                : "text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-muted-foreground/40"
            }`}
          >
            <AnimatedLabel show={showLabels}>Preview</AnimatedLabel>
            <PanelRight className="w-4 h-4 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-neutral-800 text-white border-neutral-700">
          Preview
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
