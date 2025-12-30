"use client";

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { AudioTranscriptionNodeData } from "@/types/flow";
import { FileAudio } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortList } from "./PortLabel";
import { ConfigSelect, type ConfigOption } from "./ConfigSelect";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AudioTranscriptionNodeType = Node<AudioTranscriptionNodeData, "audio-transcription">;

const MODEL_OPTIONS: readonly ConfigOption[] = [
  { value: "gpt-4o-transcribe", label: "GPT-4o" },
  { value: "gpt-4o-mini-transcribe", label: "GPT-4o Mini" },
] as const;

export function AudioTranscriptionNode({ id, data }: NodeProps<AudioTranscriptionNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  // Check connected handles
  const isAudioConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "audio"
  );
  const isLanguageConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "language"
  );
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );
  const isDoneConnected = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "done"
  );

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
            { id: "audio", label: "audio", colorClass: "emerald", required: true, isConnected: isAudioConnected },
            { id: "language", label: "language", colorClass: "cyan", required: false, isConnected: isLanguageConnected },
          ]}
          outputs={[
            { id: "output", label: "string", colorClass: "cyan", isConnected: isOutputConnected },
            { id: "done", label: "Done", colorClass: "orange", isConnected: isDoneConnected },
          ]}
        />
      }
      footer={
        data.executionOutput || data.executionError ? (
          <div
            className={cn(
              "text-[12px] max-h-[80px] overflow-y-auto",
              data.executionError ? "text-rose-400" : "text-white/50"
            )}
          >
            {data.executionError || data.executionOutput}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-2.5">
        {/* Model selector */}
        <ConfigSelect
          label="Model"
          value={model}
          options={MODEL_OPTIONS}
          onChange={(value) => updateNodeData(id, { model: value })}
          width="w-[120px]"
        />

        {/* Language input (when not connected) */}
        {!isLanguageConnected && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-white/40">
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
        <label className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-white/40 cursor-pointer select-none nodrag pt-2 border-t border-white/[0.04]">
          <input
            type="checkbox"
            checked={data.cacheable ?? false}
            onChange={(e) => updateNodeData(id, { cacheable: e.target.checked })}
            className="node-checkbox"
          />
          <span>Cache output</span>
        </label>
      </div>
    </NodeFrame>
  );
}
