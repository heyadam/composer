"use client";

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useConnectionState } from "../ConnectionContext";

// Shared color class type for ports
export type PortColorClass = "cyan" | "purple" | "amber" | "emerald" | "rose" | "orange";

interface PortRowProps {
  nodeId: string;
  input?: {
    id?: string;        // Handle ID for React Flow
    label: string;
    colorClass: PortColorClass;
    required?: boolean; // Defaults to true
    isConnected?: boolean; // Whether the input handle is connected
  };
  output?: {
    id?: string;        // Handle ID for React Flow
    label: string;
    colorClass: PortColorClass;
    isConnected?: boolean; // Whether the output handle is connected
  };
}

export function PortRow({ nodeId, input, output }: PortRowProps) {
  const { isConnecting, connectingFromNodeId } = useConnectionState();

  // Color mappings
  const colorMap: Record<string, { dot: string; hoverDot: string }> = {
    cyan: { dot: "!bg-cyan-400", hoverDot: "hover:!bg-cyan-400" },
    purple: { dot: "!bg-purple-400", hoverDot: "hover:!bg-purple-400" },
    amber: { dot: "!bg-amber-400", hoverDot: "hover:!bg-amber-400" },
    emerald: { dot: "!bg-emerald-400", hoverDot: "hover:!bg-emerald-400" },
    rose: { dot: "!bg-rose-400", hoverDot: "hover:!bg-rose-400" },       // boolean
    orange: { dot: "!bg-orange-400", hoverDot: "hover:!bg-orange-400" }, // pulse
  };

  const inputHighlight = isConnecting;
  const outputHighlight = connectingFromNodeId === nodeId;
  const isOptional = input?.required === false;

  return (
    <div className="relative flex items-center justify-between py-1.5 px-3">
      {/* Input side (left) */}
      {input ? (
        <div className="flex items-center gap-2">
          <Handle
            type="target"
            position={Position.Left}
            id={input.id}
            className={cn(
              "!w-3.5 !h-3.5 !border-2 !border-background !shadow-sm transition-all duration-200",
              inputHighlight
                ? `${colorMap[input.colorClass].dot} !scale-110`
                : input.isConnected
                ? "!bg-white hover:!scale-110"
                : "!bg-gray-500 hover:!scale-110"
            )}
          />
          <span
            className={cn(
              "text-xs font-medium text-muted-foreground transition-all duration-200",
              inputHighlight && "text-foreground",
              isOptional && "opacity-60"
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
            id={output.id}
            className={cn(
              "!w-3.5 !h-3.5 !border-2 !border-background !shadow-sm transition-all duration-200",
              outputHighlight
                ? `${colorMap[output.colorClass].dot} !scale-110`
                : output.isConnected
                ? "!bg-white hover:!scale-110"
                : "!bg-gray-500 hover:!scale-110"
            )}
          />
          <span
            className={cn(
              "text-xs font-medium text-muted-foreground transition-all duration-200",
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

// Port configuration for PortList
interface PortConfig {
  id: string;
  label: string;
  colorClass: PortColorClass;
  required?: boolean;
  isConnected?: boolean;
}

interface PortListProps {
  nodeId: string;
  inputs?: PortConfig[];
  outputs?: PortConfig[];
}

// PortList renders multiple inputs/outputs stacked vertically
export function PortList({ nodeId, inputs = [], outputs = [] }: PortListProps) {
  const rowCount = Math.max(inputs.length, outputs.length, 1);

  return (
    <div className="flex flex-col">
      {Array.from({ length: rowCount }).map((_, index) => (
        <PortRow
          key={index}
          nodeId={nodeId}
          input={
            inputs[index]
              ? {
                  id: inputs[index].id,
                  label: inputs[index].label,
                  colorClass: inputs[index].colorClass,
                  required: inputs[index].required,
                  isConnected: inputs[index].isConnected,
                }
              : undefined
          }
          output={
            outputs[index]
              ? {
                  id: outputs[index].id,
                  label: outputs[index].label,
                  colorClass: outputs[index].colorClass,
                  isConnected: outputs[index].isConnected,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
