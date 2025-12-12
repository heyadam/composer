"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { InputNodeData } from "@/types/flow";
import { Keyboard } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { cn } from "@/lib/utils";

type InputNodeType = Node<InputNodeData, "input">;

export function InputNode({ id, data }: NodeProps<InputNodeType>) {
  const { updateNodeData } = useReactFlow();

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Keyboard className="h-4 w-4" />}
      iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-300"
      accentBorderClassName="border-purple-500"
      status={data.executionStatus}
      className="w-[240px]"
    >
      <textarea
        value={data.inputValue || ""}
        onChange={(e) => updateNodeData(id, { inputValue: e.target.value })}
        placeholder="Enter your input..."
        className={cn(
          "nodrag w-full min-h-[84px] resize-y rounded-md border border-input bg-background/60 dark:bg-muted/40 px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-600 !w-2.5 !h-2.5 !border-2 !border-background !shadow-sm"
      />
      <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 -right-12">
        <span className="rounded-md bg-gray-600 px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm">
          string
        </span>
      </div>
    </NodeFrame>
  );
}
