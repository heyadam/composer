"use client";

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { ReactNodeData, ReactStylePreset } from "@/types/flow";
import { Code } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { ProviderModelSelector } from "./ProviderModelSelector";
import { cn } from "@/lib/utils";
import { PROVIDERS, DEFAULT_REACT_PROVIDER, DEFAULT_REACT_MODEL, type ProviderId } from "@/lib/providers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ReactNodeType = Node<ReactNodeData, "react-component">;

// Style preset options
const STYLE_PRESETS: { value: ReactStylePreset; label: string }[] = [
  { value: "simple", label: "v0 Style" },
  { value: "none", label: "No styling" },
  { value: "robust", label: "Robust UI" },
];

export function ReactNode({ id, data }: NodeProps<ReactNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  // Check which input handles are connected
  const isPromptConnected = edges.some(
    (edge) => edge.target === id && (edge.targetHandle === "prompt" || !edge.targetHandle)
  );
  const isSystemConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "system"
  );
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );
  const isDoneConnected = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "done"
  );

  const currentProvider = (data.provider || DEFAULT_REACT_PROVIDER) as ProviderId;
  const currentModel = data.model || DEFAULT_REACT_MODEL;
  const currentStylePreset = data.stylePreset || "simple";

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Code className="h-4 w-4" />}
      iconClassName="bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
      accentBorderClassName=""
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            output={{ id: "output", label: "React", colorClass: "amber", isConnected: isOutputConnected }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isDoneConnected }}
          />
        </>
      }
      footer={
        data.executionError ? (
          <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
            {data.executionError}
          </p>
        ) : data.executionOutput ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
            Component generated
          </p>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* Component Description Input */}
        <InputWithHandle
          id="prompt"
          label="Component Description"
          colorClass="cyan"
          isConnected={isPromptConnected}
        >
          <textarea
            value={isPromptConnected ? "" : (data.userPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
            placeholder={isPromptConnected ? "Connected" : "Describe the component..."}
            disabled={isPromptConnected}
            className={cn(
              "nodrag w-full min-h-[60px] resize-y rounded-md border border-input px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
              isPromptConnected
                ? "bg-muted/50 dark:bg-muted/20 cursor-not-allowed placeholder:italic placeholder:text-muted-foreground"
                : "bg-background/60 dark:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            )}
          />
        </InputWithHandle>

        {/* Additional Instructions Input */}
        <InputWithHandle
          id="system"
          label="Additional Instructions"
          colorClass="cyan"
          required={false}
          isConnected={isSystemConnected}
        >
          <textarea
            value={isSystemConnected ? "" : (data.systemPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            placeholder={isSystemConnected ? "Connected" : "Style preferences, constraints..."}
            disabled={isSystemConnected}
            className={cn(
              "nodrag w-full min-h-[40px] resize-y rounded-md border border-input px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
              isSystemConnected
                ? "bg-muted/50 dark:bg-muted/20 cursor-not-allowed placeholder:italic placeholder:text-muted-foreground"
                : "bg-background/60 dark:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            )}
          />
        </InputWithHandle>

        {/* Configuration */}
        <div className="space-y-2 pt-2 border-t">
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
            width="w-[120px]"
          />

          {/* Style Preset */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-muted-foreground">Style</div>
            <Select
              value={currentStylePreset}
              onValueChange={(value: ReactStylePreset) => updateNodeData(id, { stylePreset: value })}
            >
              <SelectTrigger className="nodrag h-7 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value} className="text-xs">
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </NodeFrame>
  );
}
