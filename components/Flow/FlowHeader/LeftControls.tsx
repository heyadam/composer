"use client";

import { PanelLeft, Folder, FilePlus, FolderOpen, Save, Cloud, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AvatarStack } from "@/components/avatar-stack";
import { LiveSettingsPopover } from "../LiveSettingsPopover";
import { AnimatedLabel } from "./AnimatedLabel";
import type { LeftControlsProps } from "./types";

export function LeftControls({
  autopilotOpen,
  onAutopilotToggle,
  showLabels,
  isCollaborating,
  collaborationFlowName,
  isCollaborationSaving,
  onNewFlow,
  onOpenTemplates,
  onOpenMyFlows,
  onOpenFlow,
  onSaveFlow,
  liveSession,
  isRealtimeConnected,
  collaborators,
  isOwner,
  livePopoverOpen,
  onLivePopoverChange,
  shareDialogOpen: _shareDialogOpen,
  onShareDialogChange,
  onUnpublish,
  onOwnerKeysChange,
  onDisconnect,
}: LeftControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Autopilot */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onAutopilotToggle}
            className={`flex items-center gap-1.5 px-2.5 py-2 transition-colors rounded-full border bg-background/50 backdrop-blur-sm text-sm cursor-pointer ${
              autopilotOpen
                ? "text-foreground border-muted-foreground/40"
                : "text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-muted-foreground/40"
            }`}
          >
            <PanelLeft className="w-4 h-4 shrink-0" />
            <AnimatedLabel show={showLabels}>AI</AnimatedLabel>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-neutral-800 text-white border-neutral-700">
          Composer AI
        </TooltipContent>
      </Tooltip>

      {/* Flow dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1.5 px-2.5 py-2 text-muted-foreground/60 hover:text-foreground transition-colors rounded-full border border-muted-foreground/20 hover:border-muted-foreground/40 bg-background/50 backdrop-blur-sm text-sm cursor-pointer"
            title="Files"
          >
            <Folder className="w-4 h-4 shrink-0" />
            <AnimatedLabel show={showLabels}>
              Flow
              {isCollaborating && isCollaborationSaving && (
                <span className="ml-1 text-xs text-muted-foreground/50">Saving...</span>
              )}
            </AnimatedLabel>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="bg-neutral-900 border-neutral-700 text-white min-w-[160px]"
        >
          {isCollaborating ? (
            <>
              {/* Collaboration mode: show flow name and limited actions */}
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {collaborationFlowName || "Live Flow"}
              </div>
              <DropdownMenuSeparator className="bg-neutral-700" />
              <DropdownMenuItem
                onClick={() => window.open("/", "_blank")}
                className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
              >
                <FilePlus className="h-4 w-4 mr-2" />
                New Flow (new tab)
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => {
                  onNewFlow();
                  onOpenTemplates();
                }}
                className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
              >
                <FilePlus className="h-4 w-4 mr-2" />
                New Flow
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-700" />
              <DropdownMenuItem
                onClick={onOpenMyFlows}
                className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
              >
                <Cloud className="h-4 w-4 mr-2" />
                My Flows
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenFlow}
                className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Open from file...
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onSaveFlow}
                className="cursor-pointer hover:bg-neutral-800 focus:bg-neutral-800"
              >
                <Save className="h-4 w-4 mr-2" />
                Save as...
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Live button - always shown */}
      {liveSession ? (
        <LiveSettingsPopover
          flowId={liveSession.flowId}
          liveId={liveSession.liveId}
          shareToken={liveSession.shareToken}
          useOwnerKeys={liveSession.useOwnerKeys}
          isOwner={isOwner}
          collaboratorCount={collaborators.length}
          onUnpublish={isOwner ? onUnpublish : undefined}
          onOwnerKeysChange={isOwner ? onOwnerKeysChange : undefined}
          onDisconnect={!isOwner && isCollaborating ? onDisconnect : undefined}
          open={livePopoverOpen}
          onOpenChange={onLivePopoverChange}
        >
          <button
            className="flex items-center gap-1.5 px-2.5 py-2 text-cyan-400 hover:text-cyan-300 transition-colors rounded-full border border-cyan-500/30 hover:border-cyan-400/50 bg-background/50 backdrop-blur-sm text-sm cursor-pointer"
            title="Live settings"
          >
            <Globe className="w-4 h-4 shrink-0" />
            <AnimatedLabel show={showLabels}>
              Share
              {isRealtimeConnected && (
                <span className="inline-flex items-center gap-1 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <AvatarStack
                    avatars={collaborators.map(c => ({
                      name: c.name ?? 'Guest',
                      image: c.avatar ?? ''
                    }))}
                    maxAvatarsAmount={3}
                    avatarClassName="size-5 ring-1 ring-background [&_[data-slot=avatar-fallback]]:text-[10px]"
                    className="-space-x-1.5"
                  />
                </span>
              )}
            </AnimatedLabel>
          </button>
        </LiveSettingsPopover>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onShareDialogChange(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 text-muted-foreground/60 hover:text-foreground transition-colors rounded-full border border-muted-foreground/20 hover:border-muted-foreground/40 bg-background/50 backdrop-blur-sm text-sm cursor-pointer"
              title="Go Live"
            >
              <Globe className="w-4 h-4 shrink-0" />
              <AnimatedLabel show={showLabels}>Share</AnimatedLabel>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-neutral-800 text-white border-neutral-700">
            Go Live
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
