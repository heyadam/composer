"use client";

import type { ExecutionStatus } from "@/lib/execution/types";
import { cn } from "@/lib/utils";

/**
 * Minimal status indicator - just a colored dot
 */
export function NodeStatusIndicator({
  status,
  fromCache,
  className,
}: {
  status?: ExecutionStatus;
  fromCache?: boolean;
  className?: string;
}) {
  if (!status || status === "idle") return null;

  const dotClass =
    status === "running"
      ? "status-dot-running"
      : status === "success"
        ? fromCache
          ? "status-dot-cached"
          : "status-dot-success"
        : "status-dot-error";

  return <div className={cn("status-dot", dotClass, className)} />;
}

/**
 * Legacy badge export for backwards compatibility
 * @deprecated Use NodeStatusIndicator instead
 */
export function NodeStatusBadge({
  status,
  fromCache,
  className,
}: {
  status?: ExecutionStatus;
  fromCache?: boolean;
  className?: string;
}) {
  return (
    <NodeStatusIndicator
      status={status}
      fromCache={fromCache}
      className={className}
    />
  );
}
