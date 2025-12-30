"use client";

import { useState, type ReactNode } from "react";
import type { ExecutionStatus } from "@/lib/execution/types";
import { cn } from "@/lib/utils";
import { NodeStatusIndicator } from "./NodeStatusBadge";

export type NodeAccentColor =
  | "violet"   // text-input
  | "fuchsia"  // image-input
  | "cyan"     // text-generation
  | "rose"     // image-generation
  | "amber"    // ai-logic
  | "emerald"  // preview-output
  | "blue"     // react-component
  | "teal";    // audio

export function NodeFrame({
  title,
  icon,
  accentColor = "cyan",
  status,
  fromCache,
  ports,
  children,
  footer,
  className,
  onTitleChange,
}: {
  title: string;
  icon: ReactNode;
  accentColor?: NodeAccentColor;
  status?: ExecutionStatus;
  fromCache?: boolean;
  ports?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  onTitleChange?: (newTitle: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const statusClass =
    status === "running"
      ? "node-running"
      : status === "success"
        ? "node-success"
        : status === "error"
          ? "node-error"
          : "";

  return (
    <div
      className={cn(
        "node-frame",
        `node-accent-${accentColor}`,
        statusClass,
        className
      )}
    >
      {/* Header */}
      <div className="node-header">
        <div className="node-icon">{icon}</div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                onTitleChange?.(editValue);
                setIsEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onTitleChange?.(editValue);
                  setIsEditing(false);
                }
                if (e.key === "Escape") {
                  setEditValue(title);
                  setIsEditing(false);
                }
              }}
              className="nodrag node-title w-full bg-transparent border-none outline-none"
            />
          ) : (
            <div
              onClick={() => {
                if (onTitleChange) {
                  setEditValue(title);
                  setIsEditing(true);
                }
              }}
              className={cn(
                "node-title truncate",
                onTitleChange && "cursor-text hover:opacity-80"
              )}
            >
              {title}
            </div>
          )}
        </div>

        <NodeStatusIndicator status={status} fromCache={fromCache} />
      </div>

      {/* Port section */}
      {ports ? <div className="node-ports">{ports}</div> : null}

      {/* Body content */}
      {children ? <div className="node-body">{children}</div> : null}

      {/* Footer */}
      {footer ? <div className="node-footer">{footer}</div> : null}
    </div>
  );
}
