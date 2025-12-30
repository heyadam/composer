"use client";

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { SwitchNodeData } from "@/types/flow";
import { ToggleLeft, ToggleRight } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortList } from "./PortLabel";
import { Button } from "@/components/ui/button";

type SwitchNodeType = Node<SwitchNodeData, "switch">;

export function SwitchNode({ id, data }: NodeProps<SwitchNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  const isOn = data.isOn ?? false;

  // Check connected inputs
  const isFlipConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "flip"
  );
  const isTurnOnConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "turnOn"
  );
  const isTurnOffConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "turnOff"
  );
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "output"
  );

  // Manual toggle (only when no pulse inputs are connected and not executing)
  const isExecuting = data.executionStatus === "running";
  const canManualToggle = !isFlipConnected && !isTurnOnConnected && !isTurnOffConnected && !isExecuting;

  const handleToggle = () => {
    if (canManualToggle) {
      updateNodeData(id, { isOn: !isOn });
    }
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={isOn ? <ToggleRight /> : <ToggleLeft />}
      accentColor="amber"
      status={data.executionStatus}
      className="w-[200px]"
      ports={
        <PortList
          nodeId={id}
          inputs={[
            { id: "flip", label: "Flip", colorClass: "orange", required: false, isConnected: isFlipConnected },
            { id: "turnOn", label: "Turn On", colorClass: "orange", required: false, isConnected: isTurnOnConnected },
            { id: "turnOff", label: "Turn Off", colorClass: "orange", required: false, isConnected: isTurnOffConnected },
          ]}
          outputs={[
            { id: "output", label: "On/Off", colorClass: "rose", isConnected: isOutputConnected },
          ]}
        />
      }
    >
      {/* Toggle button */}
      <Button
        size="sm"
        variant={isOn ? "default" : "outline"}
        className="w-full nodrag h-8"
        onClick={handleToggle}
        disabled={!canManualToggle}
      >
        {isOn ? (
          <>
            <ToggleRight className="h-3.5 w-3.5 mr-1.5" />
            ON
          </>
        ) : (
          <>
            <ToggleLeft className="h-3.5 w-3.5 mr-1.5" />
            OFF
          </>
        )}
      </Button>

      {/* Helper text when pulse inputs connected or executing */}
      {!canManualToggle && !isExecuting && (
        <p className="text-[11px] text-white/50 text-center mt-1.5">
          Controlled by pulse inputs
        </p>
      )}
    </NodeFrame>
  );
}
