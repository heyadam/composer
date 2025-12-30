"use client";

import { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useConnectionState } from "../ConnectionContext";
import type { PortColorClass } from "./PortLabel";

interface InputWithHandleProps {
  id: string;
  label?: string;
  children?: ReactNode;
  className?: string;
  required?: boolean;
  colorClass?: PortColorClass;
  isConnected?: boolean;
}

export function InputWithHandle({
  id,
  label,
  children,
  className,
  required = true,
  colorClass = "cyan",
  isConnected = false,
}: InputWithHandleProps) {
  const { isConnecting } = useConnectionState();
  const highlight = isConnecting;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {/* Label row with handle */}
      {label && (
        <div className="relative flex items-center gap-1.5">
          <Handle
            type="target"
            position={Position.Left}
            id={id}
            className={cn(
              "port-handle",
              `port-${colorClass}`,
              highlight && "!scale-110",
              !isConnected && !highlight && "!opacity-35"
            )}
            style={{ left: -20, top: "50%", transform: "translateY(-50%)" }}
          />
          <label
            htmlFor={id}
            className={cn(
              "port-label cursor-pointer transition-all duration-200",
              highlight && "!opacity-100 !text-white/90",
              !required && "opacity-35"
            )}
          >
            {label}
          </label>
        </div>
      )}
      {/* Input content */}
      {children}
    </div>
  );
}
