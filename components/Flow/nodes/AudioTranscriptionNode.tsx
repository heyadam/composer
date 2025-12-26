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

  const model = data.model || "gpt-4o-transcribe";

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<FileAudio className="h-4 w-4" />}
      iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      accentBorderClassName="border-emerald-500"
      status={data.executionStatus}
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
          ]}
        />
      }
      footer={
        data.executionOutput || data.executionError ? (
          <div
            className={cn(
              "text-xs max-h-[100px] overflow-y-auto",
              data.executionError ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {data.executionError || data.executionOutput}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
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
            <label className="text-xs font-medium text-muted-foreground">
              Language (optional)
            </label>
            <Input
              value={data.language || ""}
              onChange={(e) => updateNodeData(id, { language: e.target.value })}
              placeholder="e.g., en, es, fr"
              className="nodrag h-7 text-xs"
            />
          </div>
        )}
      </div>
    </NodeFrame>
  );
}
