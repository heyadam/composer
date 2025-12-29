import type { Collaborator } from "@/lib/hooks/useCollaboration";

export interface LiveSession {
  flowId: string | undefined;
  liveId: string;
  shareToken: string;
  useOwnerKeys: boolean;
}

export interface FlowHeaderProps {
  // Sidebar state
  autopilotOpen: boolean;
  autopilotWidth: number;
  responsesOpen: boolean;
  responsesWidth: number;
  isResizing: boolean;

  // Toggle callbacks
  onAutopilotToggle: () => void;
  onResponsesToggle: () => void;
  onSettingsOpen: () => void;

  // Live/collaboration state
  liveSession: LiveSession | null;
  isCollaborating: boolean;
  isOwner: boolean;
  collaborators: Collaborator[];
  isRealtimeConnected: boolean;
  collaborationFlowName: string | null;
  isCollaborationSaving: boolean;

  // Flow state
  showLabels: boolean;
  showSettingsWarning: boolean;

  // Popover/dialog state
  livePopoverOpen: boolean;
  onLivePopoverChange: (open: boolean) => void;
  shareDialogOpen: boolean;
  onShareDialogChange: (open: boolean) => void;

  // Flow operations
  isAuthenticated: boolean;
  onNewFlow: () => void;
  onOpenTemplates: () => void;
  onOpenMyFlows: () => void;
  onOpenFlow: () => void;
  onDownload: () => void;
  onDisconnect?: () => void;

  // Published flow callbacks
  onOwnerKeysChange?: (enabled: boolean) => void;

  // Logo state
  isPanning: boolean;
  canvasWidth: number;
}

export interface LeftControlsProps {
  autopilotOpen: boolean;
  onAutopilotToggle: () => void;
  showLabels: boolean;

  // Flow dropdown
  isAuthenticated: boolean;
  isCollaborating: boolean;
  collaborationFlowName: string | null;
  isCollaborationSaving: boolean;
  onNewFlow: () => void;
  onOpenTemplates: () => void;
  onOpenMyFlows: () => void;
  onOpenFlow: () => void;
  onDownload: () => void;

  // Share/Live
  liveSession: LiveSession | null;
  isRealtimeConnected: boolean;
  collaborators: Collaborator[];
  isOwner: boolean;
  livePopoverOpen: boolean;
  onLivePopoverChange: (open: boolean) => void;
  shareDialogOpen: boolean;
  onShareDialogChange: (open: boolean) => void;
  onOwnerKeysChange?: (enabled: boolean) => void;
  onDisconnect?: () => void;
}

export interface RightControlsProps {
  responsesOpen: boolean;
  onResponsesToggle: () => void;
  showLabels: boolean;
  showSettingsWarning: boolean;
  onSettingsOpen: () => void;
}
