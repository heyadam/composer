"use client";

import { Loader2, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExecutionStatus } from "@/lib/execution/types";
import { cn } from "@/lib/utils";

export function NodeStatusBadge({
  status,
  fromCache,
  className,
}: {
  status?: ExecutionStatus;
  fromCache?: boolean;
  className?: string;
}) {
  if (!status || status === "idle") return null;

  if (status === "running") {
    return (
      <Badge variant="secondary" className={cn("gap-1.5", className)}>
        <Loader2 className="animate-spin" />
        Running
      </Badge>
    );
  }

  if (status === "success") {
    // Show "Cached" badge when result came from cache
    if (fromCache) {
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            className
          )}
        >
          <Zap className="h-3 w-3" />
          Cached
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className={cn(
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          className
        )}
      >
        <CheckCircle2 />
        Done
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={cn("gap-1.5", className)}>
      <AlertTriangle />
      Error
    </Badge>
  );
}

