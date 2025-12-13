"use client";

import { useState, type ReactNode } from "react";
import type { ExecutionStatus } from "@/lib/execution/types";
import { cn } from "@/lib/utils";
import { NodeStatusBadge } from "./NodeStatusBadge";

export function NodeFrame({
  title,
  icon,
  iconClassName,
  accentBorderClassName,
  status,
  ports,
  children,
  footer,
  className,
  onTitleChange,
}: {
  title: string;
  icon: ReactNode;
  iconClassName: string;
  accentBorderClassName: string;
  status?: ExecutionStatus;
  ports?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  onTitleChange?: (newTitle: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const statusClasses =
    status === "running"
      ? "ring-2 ring-primary/20"
      : status === "success"
        ? "ring-2 ring-gray-400/30"
        : status === "error"
          ? "ring-2 ring-destructive/25"
          : "";

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card shadow-sm overflow-visible",
        accentBorderClassName,
        statusClasses,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("size-7 rounded-md grid place-items-center", iconClassName)}>
            {icon}
          </div>
          <div className="min-w-0">
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
                className="nodrag text-sm font-medium bg-transparent border-none outline-none w-full"
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
                  "text-sm font-medium truncate",
                  onTitleChange && "cursor-text hover:bg-muted/50 rounded px-1 -mx-1"
                )}
              >
                {title}
              </div>
            )}
          </div>
        </div>
        <NodeStatusBadge status={status} className="ml-2" />
      </div>

      {ports ? <div className="border-b">{ports}</div> : null}

      {children ? <div className="px-3 py-2">{children}</div> : null}

      {footer ? <div className="px-3 py-2 border-t bg-muted/10">{footer}</div> : null}
    </div>
  );
}

