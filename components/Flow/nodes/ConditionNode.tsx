"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { ConditionNodeData } from "@/types/flow";
import { GitBranch } from "lucide-react";
import { NodeFrame } from "./NodeFrame";

type ConditionNodeType = Node<ConditionNodeData, "condition">;

export function ConditionNode({ data }: NodeProps<ConditionNodeType>) {
  return (
    <NodeFrame
      title={data.label}
      icon={<GitBranch className="h-4 w-4" />}
      iconClassName="bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
      accentBorderClassName="border-l-yellow-500"
      status={data.executionStatus}
      className="w-[260px]"
      footer={
        data.executionError ? (
          <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
            {data.executionError}
          </p>
        ) : data.executionOutput ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {data.executionOutput}
          </p>
        ) : null
      }
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-yellow-500 !w-2.5 !h-2.5 !border-2 !border-background !shadow-sm"
      />

      <div className="space-y-2">
        <p className="text-xs font-mono bg-muted px-2 py-1.5 rounded-md whitespace-pre-wrap line-clamp-4">
          {data.condition}
        </p>

        <div className="flex justify-between px-1 text-[11px] text-muted-foreground">
          <span className="text-emerald-600 dark:text-emerald-400">true</span>
          <span className="text-red-600 dark:text-red-400">false</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!bg-emerald-500 !w-2.5 !h-2.5 !left-[25%] !border-2 !border-background !shadow-sm"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!bg-red-500 !w-2.5 !h-2.5 !left-[75%] !border-2 !border-background !shadow-sm"
      />
    </NodeFrame>
  );
}
