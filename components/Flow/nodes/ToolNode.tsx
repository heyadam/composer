"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { ToolNodeData } from "@/types/flow";
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NodeFrame } from "./NodeFrame";

type ToolNodeType = Node<ToolNodeData, "tool">;

export function ToolNode({ data }: NodeProps<ToolNodeType>) {
  return (
    <NodeFrame
      title={data.label}
      icon={<Wrench className="h-4 w-4" />}
      iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-300"
      accentBorderClassName="border-l-purple-500"
      status={data.executionStatus}
      className="w-[240px]"
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
        className="!bg-purple-500 !w-2.5 !h-2.5 !border-2 !border-background !shadow-sm"
      />

      <div className="space-y-2">
        <Badge variant="outline" className="font-mono text-[11px]">
          {data.toolName}
        </Badge>
        {data.description ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
            {data.description}
          </p>
        ) : null}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !w-2.5 !h-2.5 !border-2 !border-background !shadow-sm"
      />
    </NodeFrame>
  );
}
