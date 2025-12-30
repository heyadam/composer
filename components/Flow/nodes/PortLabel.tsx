"use client";

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useConnectionState } from "../ConnectionContext";

// Shared color class type for ports
export type PortColorClass = "cyan" | "purple" | "amber" | "emerald" | "rose" | "orange";

interface PortRowProps {
  nodeId: string;
  input?: {
    id?: string;
    label: string;
    colorClass: PortColorClass;
    required?: boolean;
    isConnected?: boolean;
  };
  output?: {
    id?: string;
    label: string;
    colorClass: PortColorClass;
    isConnected?: boolean;
  };
}

export function PortRow({ nodeId, input, output }: PortRowProps) {
  const { isConnecting, connectingFromNodeId } = useConnectionState();

  const inputHighlight = isConnecting;
  const outputHighlight = connectingFromNodeId === nodeId;
  const isOptional = input?.required === false;

  return (
    <div className="relative flex items-center justify-between py-1 px-2">
      {/* Input side */}
      {input ? (
        <div className="flex items-center gap-1.5">
          <Handle
            type="target"
            position={Position.Left}
            id={input.id}
            className={cn(
              "port-handle",
              `port-${input.colorClass}`,
              !input.isConnected && !inputHighlight && "!opacity-35"
            )}
            style={{ left: -20, top: "50%", transform: "translateY(-50%)" }}
          />
          <span
            className={cn(
              "port-label transition-all duration-200",
              inputHighlight && "!opacity-100 !text-white/90",
              isOptional && "opacity-35"
            )}
          >
            {input.label}
          </span>
        </div>
      ) : (
        <div />
      )}

      {/* Output side */}
      {output ? (
        <div className="flex items-center gap-1.5 flex-row-reverse">
          <Handle
            type="source"
            position={Position.Right}
            id={output.id}
            className={cn(
              "port-handle",
              `port-${output.colorClass}`,
              !output.isConnected && !outputHighlight && "!opacity-35"
            )}
            style={{ right: -20, top: "50%", transform: "translateY(-50%)" }}
          />
          <span
            className={cn(
              "port-label transition-all duration-200",
              outputHighlight && "!opacity-100 !text-white/90"
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
    <div className="flex flex-col divide-y divide-white/[0.03]">
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
