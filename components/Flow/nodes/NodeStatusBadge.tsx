"use client";

import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExecutionStatus } from "@/lib/execution/types";
import { cn } from "@/lib/utils";

export function NodeStatusBadge({
  status,
  className,
}: {
  status?: ExecutionStatus;
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

