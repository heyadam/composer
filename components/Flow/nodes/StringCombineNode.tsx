"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { StringCombineNodeData } from "@/types/flow";
import { Combine } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { NodeFooter } from "./NodeFooter";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type StringCombineNodeType = Node<StringCombineNodeData, "string-combine">;

export function StringCombineNode({ id, data }: NodeProps<StringCombineNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Combine />}
      accentColor="cyan"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            input={{ id: "input1", label: "Input 1", colorClass: "cyan", isConnected: isInputConnected("input1") }}
            output={{ id: "output", label: "Combined", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
          />
          <PortRow
            nodeId={id}
            input={{ id: "input2", label: "Input 2", colorClass: "cyan", isConnected: isInputConnected("input2") }}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
          <PortRow
            nodeId={id}
            input={{ id: "input3", label: "Input 3", colorClass: "cyan", isConnected: isInputConnected("input3") }}
          />
          <PortRow
            nodeId={id}
            input={{ id: "input4", label: "Input 4", colorClass: "cyan", isConnected: isInputConnected("input4") }}
          />
        </>
      }
      footer={<NodeFooter error={data.executionError} output={data.executionOutput} />}
    >
      <div className="space-y-2">
        <label className="text-xs text-white/50 font-medium">Separator</label>
        <input
          value={data.separator ?? ""}
          onChange={(e) => updateNodeData(id, { separator: e.target.value })}
          placeholder="(none)"
          className="nodrag node-input"
        />
      </div>
    </NodeFrame>
  );
}
