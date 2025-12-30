"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { AudioTranscriptionNodeData } from "@/types/flow";
import { FileAudio } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortList } from "./PortLabel";
import { NodeFooter } from "./NodeFooter";
import { CacheToggle } from "./CacheToggle";
import { ConfigSelect, type ConfigOption } from "./ConfigSelect";
import { Input } from "@/components/ui/input";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type AudioTranscriptionNodeType = Node<AudioTranscriptionNodeData, "audio-transcription">;

const MODEL_OPTIONS: readonly ConfigOption[] = [
  { value: "gpt-4o-transcribe", label: "GPT-4o" },
  { value: "gpt-4o-mini-transcribe", label: "GPT-4o Mini" },
] as const;

export function AudioTranscriptionNode({ id, data }: NodeProps<AudioTranscriptionNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

  const model = data.model || "gpt-4o-transcribe";

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<FileAudio />}
      accentColor="teal"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[260px]"
      ports={
        <PortList
          nodeId={id}
          inputs={[
            { id: "audio", label: "audio", colorClass: "emerald", required: true, isConnected: isInputConnected("audio") },
            { id: "language", label: "language", colorClass: "cyan", required: false, isConnected: isInputConnected("language") },
          ]}
          outputs={[
            { id: "output", label: "string", colorClass: "cyan", isConnected: isOutputConnected("output", true) },
            { id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") },
          ]}
        />
      }
      footer={<NodeFooter error={data.executionError} output={data.executionOutput} />}
    >
      <div className="flex flex-col gap-2.5">
        {/* Model selector */}
        <ConfigSelect
          label="Model"
          value={model}
          options={MODEL_OPTIONS}
          onChange={(value) => updateNodeData(id, { model: value })}
        />

        {/* Language input (when not connected) */}
        {!isInputConnected("language") && (
          <div className="flex flex-col gap-1.5">
            <label className="node-config-label">
              Language (optional)
            </label>
            <Input
              value={data.language || ""}
              onChange={(e) => updateNodeData(id, { language: e.target.value })}
              placeholder="e.g., en, es, fr"
              className="nodrag node-input h-8"
            />
          </div>
        )}

        {/* Cache toggle */}
        <CacheToggle nodeId={id} checked={data.cacheable ?? false} className="pt-2 border-t border-white/[0.06]" />
      </div>
    </NodeFrame>
  );
}
