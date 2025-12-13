import type { Node, Edge } from "@xyflow/react";
import type { FlowChanges } from "@/lib/autopilot/types";

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
}
