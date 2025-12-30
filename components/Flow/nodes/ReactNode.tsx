"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { ReactNodeData, ReactStylePreset } from "@/types/flow";
import { Code } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { NodeFooter } from "./NodeFooter";
import { CacheToggle } from "./CacheToggle";
import { ProviderModelSelector } from "./ProviderModelSelector";
import { ConfigSelect } from "./ConfigSelect";
import { cn } from "@/lib/utils";
import { PROVIDERS, DEFAULT_REACT_PROVIDER, DEFAULT_REACT_MODEL, type ProviderId } from "@/lib/providers";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type ReactNodeType = Node<ReactNodeData, "react-component">;

// Style preset options
const STYLE_PRESETS: { value: ReactStylePreset; label: string }[] = [
  { value: "simple", label: "v0 Style" },
  { value: "none", label: "No styling" },
  { value: "robust", label: "Robust UI" },
];

export function ReactNode({ id, data }: NodeProps<ReactNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

  const currentProvider = (data.provider || DEFAULT_REACT_PROVIDER) as ProviderId;
  const currentModel = data.model || DEFAULT_REACT_MODEL;
  const currentStylePreset = data.stylePreset || "simple";

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Code />}
      accentColor="blue"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            output={{ id: "output", label: "Code", colorClass: "amber", isConnected: isOutputConnected("output", true) }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
        </>
      }
      footer={<NodeFooter error={data.executionError} output={data.executionOutput ? "Component generated" : undefined} />}
    >
      <div className="space-y-3">
        {/* Component Description Input */}
        <InputWithHandle
          id="prompt"
          label="Component Description"
          colorClass="cyan"
          isConnected={isInputConnected("prompt", true)}
        >
          <textarea
            value={isInputConnected("prompt", true) ? "" : (data.userPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
            placeholder={isInputConnected("prompt", true) ? "Connected" : "Describe the component..."}
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
            placeholder={isInputConnected("system") ? "Connected" : "Style preferences, constraints..."}
            disabled={isInputConnected("system")}
            className={cn(
              "nodrag node-input min-h-[40px] resize-y",
              isInputConnected("system") && "node-input:disabled"
            )}
          />
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

          {/* Style Preset */}
          <ConfigSelect
            label="Style"
            value={currentStylePreset}
            options={STYLE_PRESETS}
            onChange={(value) => updateNodeData(id, { stylePreset: value as ReactStylePreset })}
          />

          {/* Cache toggle */}
          <CacheToggle nodeId={id} checked={data.cacheable ?? false} className="pt-1" />
        </div>
      </div>
    </NodeFrame>
  );
}
