"use client";
/** ThreejsOptionsNode - Configure camera, lighting, and interaction settings for 3D scenes */

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { ThreejsOptionsNodeData } from "@/types/flow";
import { SlidersHorizontal } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { NodeFooter } from "./NodeFooter";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";
import { cn } from "@/lib/utils";

type ThreejsOptionsNodeType = Node<ThreejsOptionsNodeData, "threejs-options">;

export function ThreejsOptionsNode({ id, data }: NodeProps<ThreejsOptionsNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

  const cameraConnected = isInputConnected("camera");
  const lightConnected = isInputConnected("light");
  const mouseConnected = isInputConnected("mouse");

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
            output={{ id: "output", label: "Scene Options", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
        </>
      }
      footer={<NodeFooter error={data.executionError} output={data.executionOutput} />}
    >
      <div className="space-y-4">
        {/* Camera Input */}
        <InputWithHandle
          id="camera"
          label="Camera"
          colorClass="cyan"
          required={false}
          isConnected={cameraConnected}
        >
          <textarea
            value={cameraConnected ? "" : (data.cameraText ?? "")}
            onChange={(e) => updateNodeData(id, { cameraText: e.target.value })}
            placeholder={cameraConnected ? "Connected" : "Position, FOV, angle..."}
            disabled={cameraConnected}
            className={cn(
              "nodrag node-input min-h-[40px] resize-y",
              cameraConnected && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Lighting Input */}
        <InputWithHandle
          id="light"
          label="Lighting"
          colorClass="cyan"
          required={false}
          isConnected={lightConnected}
        >
          <textarea
            value={lightConnected ? "" : (data.lightText ?? "")}
            onChange={(e) => updateNodeData(id, { lightText: e.target.value })}
            placeholder={lightConnected ? "Connected" : "Ambient, directional, intensity..."}
            disabled={lightConnected}
            className={cn(
              "nodrag node-input min-h-[40px] resize-y",
              lightConnected && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Interaction Input */}
        <InputWithHandle
          id="mouse"
          label="Interaction"
          colorClass="cyan"
          required={false}
          isConnected={mouseConnected}
        >
          <textarea
            value={mouseConnected ? "" : (data.mouseText ?? "")}
            onChange={(e) => updateNodeData(id, { mouseText: e.target.value })}
            placeholder={mouseConnected ? "Connected" : "Orbit controls, click behavior..."}
            disabled={mouseConnected}
            className={cn(
              "nodrag node-input min-h-[40px] resize-y",
              mouseConnected && "node-input:disabled"
            )}
          />
        </InputWithHandle>
      </div>
    </NodeFrame>
  );
}
