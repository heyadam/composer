"use client";

import { useState } from "react";
import {
  Plus,
  Sparkles,
  PanelRight,
  Settings,
  RotateCcw,
  Play,
  Loader2,
  Save,
  FolderOpen,
  FilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApiKeys } from "@/lib/api-keys";
import { SettingsDialogControlled } from "./SettingsDialogControlled";

interface ActionBarProps {
  onToggleNodes: () => void;
  onToggleAutopilot: () => void;
  onToggleResponses: () => void;
  onRun: () => void;
  onReset: () => void;
  onNewFlow: () => void;
  onSaveFlow: () => void;
  onOpenFlow: () => void;
  nodesPaletteOpen: boolean;
  autopilotOpen: boolean;
  responsesOpen: boolean;
  isRunning: boolean;
}

export function ActionBar({
  onToggleNodes,
  onToggleAutopilot,
  onToggleResponses,
  onRun,
  onReset,
  onNewFlow,
  onSaveFlow,
  onOpenFlow,
  nodesPaletteOpen,
  autopilotOpen,
  responsesOpen,
  isRunning,
}: ActionBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { getKeyStatuses, isDevMode } = useApiKeys();

  const statuses = getKeyStatuses();
  const hasAnyKey = statuses.some((s) => s.hasKey);
  const showWarning = !isDevMode && !hasAnyKey;

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-1 p-1.5 rounded-xl bg-neutral-900/95 backdrop-blur border border-neutral-700 shadow-lg">
            {/* Section 1: Add Node */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleNodes}
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

            {/* Divider */}
            <div className="w-px h-6 bg-neutral-700 mx-1" />

            {/* Section 3: Autopilot & Responses */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleAutopilot}
                  className={`h-10 w-10 rounded-lg transition-colors ${
                    autopilotOpen
                      ? "bg-neutral-700 text-white"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  <Sparkles className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 text-white border-neutral-700">
                Autopilot
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleResponses}
                  className={`h-10 w-10 rounded-lg transition-colors ${
                    responsesOpen
                      ? "bg-neutral-700 text-white"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  <PanelRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 text-white border-neutral-700">
                Responses
              </TooltipContent>
            </Tooltip>

            {/* Section 4: Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettingsOpen(true)}
                  className={`h-10 w-10 rounded-lg transition-colors relative ${
                    showWarning
                      ? "text-amber-400 hover:text-amber-300 hover:bg-amber-900/30"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  {showWarning && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-neutral-800 text-white border-neutral-700">
                {showWarning ? "Configure API Keys" : "Settings"}
              </TooltipContent>
            </Tooltip>

            {/* Section 5: File Operations */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-lg transition-colors text-neutral-400 hover:text-white hover:bg-neutral-800"
                    >
                      <FolderOpen className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-neutral-800 text-white border-neutral-700">
                  File
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="center"
                side="top"
                sideOffset={8}
                className="bg-neutral-900 border-neutral-700 text-white min-w-[160px]"
              >
                <DropdownMenuItem
                  onClick={onNewFlow}
                  className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
                >
                  <FilePlus className="h-4 w-4 mr-2" />
                  New Flow
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-neutral-700" />
                <DropdownMenuItem
                  onClick={onOpenFlow}
                  className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open...
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onSaveFlow}
                  className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Divider */}
            <div className="w-px h-6 bg-neutral-700 mx-1" />

            {/* Section 6: Reset & Run */}
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

            <Button
              onClick={onRun}
              disabled={isRunning}
              className="h-10 px-4 rounded-lg gap-2 bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run
            </Button>
          </div>
        </div>
      </TooltipProvider>

      <SettingsDialogControlled
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}
