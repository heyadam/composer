"use client";

import { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useConnectionState } from "../ConnectionContext";

// Handle positioning constants
// Accounts for NodeFrame's px-3 (12px) padding + 1px for visual centering
const HANDLE_LEFT_OFFSET = -13;
// Vertical offset to align handle with the label baseline
const DEFAULT_HANDLE_TOP = 8;

interface InputWithHandleProps {
  id: string;
  label?: string;
  children?: ReactNode;
  className?: string;
  required?: boolean;
  colorClass?: "cyan" | "purple" | "amber";
  handleOffset?: number; // Optional vertical offset for handle
}

export function InputWithHandle({
  id,
  label,
  children,
  className,
  required = true,
  colorClass = "cyan",
  handleOffset,
}: InputWithHandleProps) {
  const { isConnecting } = useConnectionState();

  const colorMap = {
    cyan: { dot: "!bg-cyan-400", hoverDot: "hover:!bg-cyan-400" },
    purple: { dot: "!bg-purple-400", hoverDot: "hover:!bg-purple-400" },
    amber: { dot: "!bg-amber-400", hoverDot: "hover:!bg-amber-400" },
  };

  const isOptional = !required;
  const highlight = isConnecting;

  return (
    <div className={cn("relative group", className)}>
      <Handle
        type="target"
        position={Position.Left}
        id={id}
        className={cn(
          "!w-3.5 !h-3.5 !border-2 !border-background !shadow-sm transition-all duration-200",
          highlight
            ? `${colorMap[colorClass].dot} !scale-110`
            : `!bg-gray-500 ${colorMap[colorClass].hoverDot} hover:!scale-110`,
          isOptional && "!border-dashed"
        )}
        style={{
          left: HANDLE_LEFT_OFFSET,
          top: handleOffset ?? DEFAULT_HANDLE_TOP
        }}
      />
      
      <div className="flex flex-col gap-1.5">
        {label && (
          <label 
            htmlFor={id} 
            className="text-xs font-medium text-muted-foreground cursor-pointer"
          >
            {label}
          </label>
        )}
        {children}
      </div>
    </div>
  );
}
