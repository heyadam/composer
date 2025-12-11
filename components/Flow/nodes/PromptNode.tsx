"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { PromptNodeData } from "@/types/flow";
import { MessageSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeFrame } from "./NodeFrame";

type PromptNodeType = Node<PromptNodeData, "prompt">;

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "4o Mini" },
  { value: "gpt-4-turbo", label: "4 Turbo" },
  { value: "o1", label: "o1" },
  { value: "o1-mini", label: "o1 Mini" },
];

export function PromptNode({ id, data }: NodeProps<PromptNodeType>) {
  const { updateNodeData } = useReactFlow();

  return (
    <NodeFrame
      title={data.label}
      icon={<MessageSquare className="h-4 w-4" />}
      iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-300"
      accentBorderClassName="border-l-blue-500"
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
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-background !shadow-sm"
      />

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
          {data.prompt}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">Model</div>
          <Select
            value={data.model || "gpt-4o"}
            onValueChange={(model) => updateNodeData(id, { model })}
          >
            <SelectTrigger className="h-7 text-xs nodrag w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-background !shadow-sm"
      />
    </NodeFrame>
  );
}
