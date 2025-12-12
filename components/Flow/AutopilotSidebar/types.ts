import type { Node, Edge } from "@xyflow/react";
import type { FlowChanges } from "@/lib/autopilot/types";

export interface AutopilotSidebarProps {
  nodes: Node[];
  edges: Edge[];
  onApplyChanges: (changes: FlowChanges) => void;
  isOpen: boolean;
  onToggle: () => void;
}
