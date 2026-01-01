"use client";
/** ThreejsSceneNode - Generate Three.js/R3F 3D scenes with AI */

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { ThreejsSceneNodeData } from "@/types/flow";
import { Box } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { NodeFooter } from "./NodeFooter";
import { CacheToggle } from "./CacheToggle";
import { ProviderModelSelector } from "./ProviderModelSelector";
import { cn } from "@/lib/utils";
import { PROVIDERS, DEFAULT_REACT_PROVIDER, DEFAULT_REACT_MODEL, type ProviderId } from "@/lib/providers";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type ThreejsSceneNodeType = Node<ThreejsSceneNodeData, "threejs-scene">;

export function ThreejsSceneNode({ id, data }: NodeProps<ThreejsSceneNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

  const currentProvider = (data.provider || DEFAULT_REACT_PROVIDER) as ProviderId;
  const currentModel = data.model || DEFAULT_REACT_MODEL;

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Box />}
      accentColor="violet"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            output={{ id: "output", label: "3D", colorClass: "coral", isConnected: isOutputConnected("output", true) }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
        </>
      }
      footer={<NodeFooter error={data.executionError} output={data.executionOutput ? "Scene generated" : undefined} />}
    >
      <div className="space-y-3">
        {/* Scene Description Input */}
        <InputWithHandle
          id="prompt"
          label="Scene Description"
          colorClass="cyan"
          isConnected={isInputConnected("prompt", true)}
        >
          <textarea
            value={isInputConnected("prompt", true) ? "" : (data.userPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
            placeholder={isInputConnected("prompt", true) ? "Connected" : "Describe the 3D scene..."}
            disabled={isInputConnected("prompt", true)}
            className={cn(
              "nodrag node-input min-h-[60px] resize-y",
              isInputConnected("prompt", true) && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Additional Instructions Input */}
        <InputWithHandle
          id="system"
          label="Additional Instructions"
          colorClass="cyan"
          required={false}
          isConnected={isInputConnected("system")}
        >
          <textarea
            value={isInputConnected("system") ? "" : (data.systemPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            placeholder={isInputConnected("system") ? "Connected" : "Animation style, camera settings..."}
            disabled={isInputConnected("system")}
            className={cn(
              "nodrag node-input min-h-[40px] resize-y",
              isInputConnected("system") && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Scene Input (Variable Injection) */}
        <InputWithHandle
          id="scene"
          label="Scene Input"
          colorClass="cyan"
          required={false}
          isConnected={isInputConnected("scene")}
        >
          <div
            className={cn(
              "nodrag node-input min-h-[32px] text-xs flex items-center",
              isInputConnected("scene") ? "text-white/50" : "text-white/30"
            )}
          >
            {isInputConnected("scene")
              ? "Connected → sceneInput variable"
              : "Connect to inject as sceneInput"}
          </div>
        </InputWithHandle>

        {/* Scene Options (from ThreejsOptionsNode) */}
        <InputWithHandle
          id="options"
          label="Scene Options"
          colorClass="cyan"
          required={false}
          isConnected={isInputConnected("options")}
        >
          <div
            className={cn(
              "nodrag node-input min-h-[32px] text-xs flex items-center",
              isInputConnected("options") ? "text-white/50" : "text-white/30"
            )}
          >
            {isInputConnected("options")
              ? "Connected (camera, light, interaction)"
              : "Connect 3D Scene Options node"}
          </div>
        </InputWithHandle>

        {/* Configuration */}
        <div className="space-y-2.5 pt-3 border-t border-white/[0.06]">
          <ProviderModelSelector
            providers={PROVIDERS}
            currentProvider={currentProvider}
            currentModel={currentModel}
            onProviderChange={(provider, model, label) => {
              updateNodeData(id, { provider, model, label });
            }}
            onModelChange={(model, label) => {
              updateNodeData(id, { model, label });
            }}
          />

          {/* Cache toggle */}
          <CacheToggle nodeId={id} checked={data.cacheable ?? false} className="pt-1" />
        </div>
      </div>
    </NodeFrame>
  );
}
