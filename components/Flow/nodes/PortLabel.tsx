"use client";

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useConnectionState } from "../ConnectionContext";

interface PortRowProps {
  nodeId: string;
  input?: {
    label: string;
    colorClass: "cyan" | "purple" | "amber";
  };
  output?: {
    label: string;
    colorClass: "cyan" | "purple" | "amber";
  };
}

export function PortRow({ nodeId, input, output }: PortRowProps) {
  const { isConnecting, connectingFromNodeId } = useConnectionState();

  // Color mappings
  const colorMap: Record<string, { dot: string; hoverDot: string }> = {
    cyan: { dot: "!bg-cyan-400", hoverDot: "hover:!bg-cyan-400" },
    purple: { dot: "!bg-purple-400", hoverDot: "hover:!bg-purple-400" },
    amber: { dot: "!bg-amber-400", hoverDot: "hover:!bg-amber-400" },
  };

  const inputHighlight = isConnecting;
  const outputHighlight = connectingFromNodeId === nodeId;

  return (
    <div className="relative flex items-center justify-between py-1.5 px-3">
      {/* Input side (left) */}
      {input ? (
        <div className="flex items-center gap-2">
          <Handle
            type="target"
            position={Position.Left}
            className={cn(
              "!w-3.5 !h-3.5 !border-2 !border-background !shadow-sm transition-all duration-200",
              inputHighlight
                ? `${colorMap[input.colorClass].dot} !scale-110`
                : `!bg-gray-500 ${colorMap[input.colorClass].hoverDot} hover:!scale-110`
            )}
          />
          <span
            className={cn(
              "text-sm font-medium text-muted-foreground transition-all duration-200",
              inputHighlight && "text-foreground"
            )}
          >
            {input.label}
          </span>
        </div>
      ) : (
        <div />
      )}

      {/* Output side (right) */}
      {output ? (
        <div className="flex items-center gap-2 flex-row-reverse">
          <Handle
            type="source"
            position={Position.Right}
            className={cn(
              "!w-3.5 !h-3.5 !border-2 !border-background !shadow-sm transition-all duration-200",
              outputHighlight
                ? `${colorMap[output.colorClass].dot} !scale-110`
                : `!bg-gray-500 ${colorMap[output.colorClass].hoverDot} hover:!scale-110`
            )}
          />
          <span
            className={cn(
              "text-sm font-medium text-muted-foreground transition-all duration-200",
              outputHighlight && "text-foreground"
            )}
          >
            {output.label}
          </span>
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}
