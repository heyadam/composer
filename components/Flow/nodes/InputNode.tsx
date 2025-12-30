"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { InputNodeData } from "@/types/flow";
import { Type } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type InputNodeType = Node<InputNodeData, "text-input">;

export function InputNode({ id, data }: NodeProps<InputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isOutputConnected } = useEdgeConnections(id);

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Type />}
      accentColor="violet"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
        />
      }
    >
      <textarea
        value={data.inputValue || ""}
        onChange={(e) => updateNodeData(id, { inputValue: e.target.value })}
        placeholder="Enter text..."
        className="nodrag node-input min-h-[84px] resize-y"
      />
    </NodeFrame>
  );
}
