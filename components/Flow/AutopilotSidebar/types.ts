import type { Node, Edge } from "@xyflow/react";
import type { FlowChanges, PendingAutopilotMessage } from "@/lib/autopilot/types";
import type { Suggestion } from "@/lib/hooks/useSuggestions";

export interface AppliedChanges {
  nodeIds: string[];
  edgeIds: string[];
}

export interface AutopilotSidebarProps {
  nodes: Node[];
  edges: Edge[];
  onApplyChanges: (changes: FlowChanges) => AppliedChanges;
  onUndoChanges: (applied: AppliedChanges) => void;
  isOpen: boolean;
  onToggle: () => void;
  suggestions: Suggestion[];
  suggestionsLoading: boolean;
  onRefreshSuggestions: () => void;
  onMessageSent?: () => void;
  pendingMessage?: PendingAutopilotMessage;
  onPendingMessageConsumed?: () => void;
}
