import type { Node, Edge } from "@xyflow/react";
import type {
  FlowChanges,
  AddNodeAction,
  AddEdgeAction,
  RemoveEdgeAction,
  RemoveNodeAction,
  EvaluationState,
} from "@/lib/autopilot/types";
import type { NodeType } from "@/types/flow";
import {
  Keyboard,
  Upload,
  Square,
  MessageSquare,
  ImageIcon,
  Sparkles,
  MessageSquarePlus,
  Code,
  Mic,
  AudioWaveform,
  FileAudio,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { Loader } from "@/components/ai-elements/loader";

interface ChangesPreviewProps {
  changes: FlowChanges;
  nodes: Node[];
  edges: Edge[];
  evaluationState?: EvaluationState;
  applied?: boolean;
  onUndo?: () => void;
}

const iconMap: Record<NodeType, typeof Keyboard> = {
  "text-input": Keyboard,
  "image-input": Upload,
  "audio-input": AudioWaveform,
  "preview-output": Square,
  "text-generation": MessageSquare,
  "image-generation": ImageIcon,
  "ai-logic": Sparkles,
  "comment": MessageSquarePlus,
  "react-component": Code,
  "realtime-conversation": Mic,
  "audio-transcription": FileAudio,
};

const nodeTypeLabels: Record<NodeType, string> = {
  "text-input": "Text Input",
  "image-input": "Image Input",
  "audio-input": "Audio Input",
  "preview-output": "Output",
  "text-generation": "Text Generation",
  "image-generation": "Image Generation",
  "ai-logic": "AI Logic",
  "comment": "Comment",
  "react-component": "React Component",
  "realtime-conversation": "Realtime Audio",
  "audio-transcription": "Transcribe",
};

const dataTypeColors: Record<
  string,
  { bg: string; text: string }
> = {
  string: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-600 dark:text-cyan-400",
  },
  image: {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
  },
  response: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  audio: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

function getNodeLabel(
  nodeId: string,
  nodes: Node[],
  pendingNodes: AddNodeAction[]
): string {
  // Check pending nodes first (they may not be in the flow yet)
  const pendingNode = pendingNodes.find((a) => a.node.id === nodeId);
  if (pendingNode) {
    const data = pendingNode.node.data as { label?: string };
    return data.label || nodeTypeLabels[pendingNode.node.type] || pendingNode.node.type;
  }

  // Check existing nodes
  const existingNode = nodes.find((n) => n.id === nodeId);
  if (existingNode) {
    const data = existingNode.data as { label?: string };
    return data.label || (existingNode.type as string) || nodeId;
  }

  return nodeId;
}

export function ChangesPreview({
  changes,
  nodes,
  edges,
  evaluationState,
  applied,
  onUndo,
}: ChangesPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const addedNodes = changes.actions.filter(
    (a): a is AddNodeAction => a.type === "addNode"
  );
  const addedEdges = changes.actions.filter(
    (a): a is AddEdgeAction => a.type === "addEdge"
  );
  const removedEdges = changes.actions.filter(
    (a): a is RemoveEdgeAction => a.type === "removeEdge"
  );
  const removedNodes = changes.actions.filter(
    (a): a is RemoveNodeAction => a.type === "removeNode"
  );

  if (changes.actions.length === 0) {
    return null;
  }

  const count = changes.actions.length;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b glass-divider">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
          <span>{count} Change{count !== 1 ? "s" : ""}</span>
        </button>
        <div className="flex items-center gap-3 text-xs">
          {applied && onUndo && (
            <button
              onClick={onUndo}
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Undo
            </button>
          )}
        </div>
      </div>

      {/* Changes list */}
      {isExpanded && (
        <div className="px-3 py-2 space-y-1">
          {/* Removed Nodes - show removals first like a diff */}
          {removedNodes.map((action) => {
            const nodeLabel = action.nodeLabel || getNodeLabel(action.nodeId, nodes, addedNodes);
            const existingNode = nodes.find((n) => n.id === action.nodeId);
            const nodeType = existingNode?.type as NodeType | undefined;
            const Icon = nodeType ? (iconMap[nodeType] || Square) : Square;

            return (
              <div
                key={action.nodeId}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="text-red-600 dark:text-red-400 font-medium">
                  −
                </span>
                <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground line-through">
                  {nodeLabel}
                </span>
              </div>
            );
          })}

          {/* Removed Edges */}
          {removedEdges.map((action) => {
            let sourceLabel = action.sourceLabel;
            let targetLabel = action.targetLabel;

            if (!sourceLabel || !targetLabel) {
              const edge = edges.find((e) => e.id === action.edgeId);
              sourceLabel = sourceLabel || (edge ? getNodeLabel(edge.source, nodes, addedNodes) : "?");
              targetLabel = targetLabel || (edge ? getNodeLabel(edge.target, nodes, addedNodes) : "?");
            }

            return (
              <div
                key={action.edgeId}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="text-red-600 dark:text-red-400 font-medium">
                  −
                </span>
                <span className="text-muted-foreground">
                  {sourceLabel} → {targetLabel}
                </span>
              </div>
            );
          })}

          {/* Added Nodes */}
          {addedNodes.map((action) => {
            const Icon = iconMap[action.node.type] || Square;
            const data = action.node.data as { label?: string };
            const label = data.label || nodeTypeLabels[action.node.type];
            const typeLabel = nodeTypeLabels[action.node.type];

            return (
              <div
                key={action.node.id}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="text-green-600 dark:text-green-400 font-medium">
                  +
                </span>
                <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-white font-medium truncate">
                  {label}
                </span>
                <span className="text-muted-foreground">({typeLabel})</span>
              </div>
            );
          })}

          {/* Added Edges */}
          {addedEdges.map((action) => {
            const dataType = action.edge.data?.dataType || "string";
            const colors = dataTypeColors[dataType] || dataTypeColors.string;
            const sourceLabel = getNodeLabel(action.edge.source, nodes, addedNodes);
            const targetLabel = getNodeLabel(action.edge.target, nodes, addedNodes);

            return (
              <div
                key={action.edge.id}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="text-green-600 dark:text-green-400 font-medium">
                  +
                </span>
                <span className="text-white">{sourceLabel}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-white">{targetLabel}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${colors.bg} ${colors.text}`}
                >
                  {dataType}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer status */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t glass-divider bg-white/5">
        {evaluationState === "evaluating" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader className="h-3 w-3" />
            Validating...
          </span>
        )}
        {evaluationState === "retrying" && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Validation error
          </span>
        )}
        {evaluationState === "passed" && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Validated
          </span>
        )}
        {evaluationState === "failed" && (
          <span className="text-xs text-amber-600">
            Validation failed
          </span>
        )}
        {applied && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Applied
          </span>
        )}
      </div>
    </div>
  );
}
