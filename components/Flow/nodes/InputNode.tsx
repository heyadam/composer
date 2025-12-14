"use client";

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { InputNodeData } from "@/types/flow";
import { Keyboard } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { cn } from "@/lib/utils";

type InputNodeType = Node<InputNodeData, "input">;

export function InputNode({ id, data }: NodeProps<InputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  // Check if output is connected (handle undefined when default handle is used)
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Keyboard className="h-4 w-4" />}
      iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-300"
      accentBorderClassName="border-purple-500"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          output={{ id: "output", label: "string", colorClass: "cyan", isConnected: isOutputConnected }}
        />
      }
    >
      <textarea
        value={data.inputValue || ""}
        onChange={(e) => updateNodeData(id, { inputValue: e.target.value })}
        placeholder="Enter text..."
        className={cn(
          "nodrag w-full min-h-[84px] resize-y rounded-md border border-input bg-background/60 dark:bg-muted/40 px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        )}
      />
    </NodeFrame>
  );
}
