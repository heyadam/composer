"use client";
/** ThreejsOptionsNode - Configure camera, lighting, and interaction settings for 3D scenes */

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { ThreejsOptionsNodeData } from "@/types/flow";
import { SlidersHorizontal } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { NodeFooter } from "./NodeFooter";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type ThreejsOptionsNodeType = Node<ThreejsOptionsNodeData, "threejs-options">;

export function ThreejsOptionsNode({ id, data }: NodeProps<ThreejsOptionsNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<SlidersHorizontal />}
      accentColor="violet"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            input={{ id: "camera", label: "Camera", colorClass: "cyan", isConnected: isInputConnected("camera") }}
            output={{ id: "output", label: "Scene Options", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
          />
          <PortRow
            nodeId={id}
            input={{ id: "light", label: "Lighting", colorClass: "cyan", isConnected: isInputConnected("light") }}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
          <PortRow
            nodeId={id}
            input={{ id: "mouse", label: "Interaction", colorClass: "cyan", isConnected: isInputConnected("mouse") }}
          />
        </>
      }
      footer={<NodeFooter error={data.executionError} output={data.executionOutput} />}
    >
      <div className="text-xs text-white/40 px-1">
        Connect camera, lighting, and interaction settings to configure your 3D scene.
      </div>
    </NodeFrame>
  );
}
