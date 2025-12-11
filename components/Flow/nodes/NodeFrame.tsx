"use client";

import type { ReactNode } from "react";
import type { ExecutionStatus } from "@/lib/execution/types";
import { cn } from "@/lib/utils";
import { NodeStatusBadge } from "./NodeStatusBadge";

export function NodeFrame({
  title,
  icon,
  iconClassName,
  accentBorderClassName,
  status,
  children,
  footer,
  className,
}: {
  title: string;
  icon: ReactNode;
  iconClassName: string;
  accentBorderClassName: string;
  status?: ExecutionStatus;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const statusClasses =
    status === "running"
      ? "ring-2 ring-primary/20"
      : status === "success"
        ? "ring-2 ring-emerald-500/20"
        : status === "error"
          ? "ring-2 ring-destructive/25"
          : "";

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card shadow-sm overflow-visible border-l-4",
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
            <div className="text-sm font-medium truncate">{title}</div>
          </div>
        </div>
        <NodeStatusBadge status={status} className="ml-2" />
      </div>

      {children ? <div className="px-3 py-2">{children}</div> : null}

      {footer ? <div className="px-3 py-2 border-t bg-muted/10">{footer}</div> : null}
    </div>
  );
}

