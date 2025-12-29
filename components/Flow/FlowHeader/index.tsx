"use client";

import { motion } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getTransition } from "@/lib/motion/presets";
import { AvyLogo } from "../AvyLogo";
import { LeftControls } from "./LeftControls";
import { RightControls } from "./RightControls";
import type { FlowHeaderProps } from "./types";

export type { FlowHeaderProps, LiveSession } from "./types";

/**
 * FlowHeader - Responsive header that adapts to sidebar positions.
 *
 * The header consists of three animated regions:
 * 1. Logo (center) - Centers in available space between sidebars
 * 2. Left controls (AI, Flow, Share) - Anchors to left edge of available space
 * 3. Right controls (Settings, Profile, Preview) - Anchors to right edge of available space
 *
 * All animations use the same spring presets as sidebars for synchronized movement.
 * During resize drag, uses instant transition; after release, uses spring.
 */
export function FlowHeader({
  autopilotOpen,
  autopilotWidth,
  responsesOpen,
  responsesWidth,
  isResizing,
  onAutopilotToggle,
  onResponsesToggle,
  onSettingsOpen,
  liveSession,
  isCollaborating,
  isOwner,
  collaborators,
  isRealtimeConnected,
  collaborationFlowName,
  isCollaborationSaving,
  showLabels,
  showSettingsWarning,
  livePopoverOpen,
  onLivePopoverChange,
  shareDialogOpen,
  onShareDialogChange,
  isAuthenticated,
  onSaveFlow,
  onNewFlow,
  onOpenTemplates,
  onOpenMyFlows,
  onOpenFlow,
  onDownload,
  onDisconnect,
  onOwnerKeysChange,
  isPanning,
  canvasWidth,
}: FlowHeaderProps) {
  const transition = getTransition(isResizing);

  return (
    <>
      {/* Top center branding - gradient extends full width, left edge animates with autopilot (overlay), right edge animates with responses (overlay) */}
      <motion.div
        className="absolute top-0 z-10 flex justify-center pt-4 pb-8 bg-gradient-to-b from-black/90 to-transparent"
        initial={false}
        animate={{
          left: autopilotOpen ? autopilotWidth : 0,
          right: responsesOpen ? responsesWidth : 0
        }}
        transition={transition}
      >
        <AvyLogo isPanning={isPanning} />
      </motion.div>

      {/* Left controls (AI, Flow, Share) - anchors to left edge of available space */}
      <TooltipProvider delayDuration={200}>
        <motion.div
          className="absolute top-4 z-10"
          initial={false}
          animate={{ left: autopilotOpen ? autopilotWidth + 16 : 16 }}
          transition={transition}
        >
          <LeftControls
            autopilotOpen={autopilotOpen}
            onAutopilotToggle={onAutopilotToggle}
            showLabels={showLabels}
            isAuthenticated={isAuthenticated}
            onSaveFlow={onSaveFlow}
            isCollaborating={isCollaborating}
            collaborationFlowName={collaborationFlowName}
            isCollaborationSaving={isCollaborationSaving}
            onNewFlow={onNewFlow}
            onOpenTemplates={onOpenTemplates}
            onOpenMyFlows={onOpenMyFlows}
            onOpenFlow={onOpenFlow}
            onDownload={onDownload}
            liveSession={liveSession}
            isRealtimeConnected={isRealtimeConnected}
            collaborators={collaborators}
            isOwner={isOwner}
            livePopoverOpen={livePopoverOpen}
            onLivePopoverChange={onLivePopoverChange}
            shareDialogOpen={shareDialogOpen}
            onShareDialogChange={onShareDialogChange}
            onOwnerKeysChange={onOwnerKeysChange}
            onDisconnect={onDisconnect}
          />
        </motion.div>
      </TooltipProvider>

      {/* Right controls (Settings, Profile, Preview) - anchors to right edge of available space */}
      <TooltipProvider delayDuration={200}>
        <motion.div
          className="absolute top-4 z-10"
          initial={false}
          animate={{ right: responsesOpen ? responsesWidth + 16 : 16 }}
          transition={transition}
        >
          <RightControls
            responsesOpen={responsesOpen}
            onResponsesToggle={onResponsesToggle}
            showLabels={showLabels}
            showSettingsWarning={showSettingsWarning}
            onSettingsOpen={onSettingsOpen}
          />
        </motion.div>
      </TooltipProvider>
    </>
  );
}
