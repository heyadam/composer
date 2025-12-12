"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { PromptNodeData } from "@/types/flow";
import { MessageSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeFrame } from "./NodeFrame";
import { cn } from "@/lib/utils";
import { PROVIDERS, DEFAULT_PROVIDER, DEFAULT_MODEL, VERBOSITY_OPTIONS, THINKING_OPTIONS, type ProviderId } from "@/lib/providers";

type PromptNodeType = Node<PromptNodeData, "prompt">;

export function PromptNode({ id, data }: NodeProps<PromptNodeType>) {
  const { updateNodeData } = useReactFlow();

  const currentProvider = (data.provider || DEFAULT_PROVIDER) as ProviderId;
  const providerConfig = PROVIDERS[currentProvider];
  const currentModel = data.model || DEFAULT_MODEL;
  const currentModelConfig = providerConfig.models.find((m) => m.value === currentModel);

  const handleProviderChange = (provider: string) => {
    const newProvider = provider as ProviderId;
    const firstModel = PROVIDERS[newProvider].models[0];
    updateNodeData(id, { provider: newProvider, model: firstModel.value, label: firstModel.label });
  };

  const handleModelChange = (model: string) => {
    const modelConfig = providerConfig.models.find((m) => m.value === model);
    updateNodeData(id, { model, label: modelConfig?.label || model });
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<MessageSquare className="h-4 w-4" />}
      iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-300"
      accentBorderClassName="border-l-blue-500"
      status={data.executionStatus}
      className="w-[240px]"
      footer={
        data.executionError ? (
          <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
            {data.executionError}
          </p>
        ) : data.executionOutput ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {data.executionOutput}
          </p>
        ) : null
      }
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-teal-500 !w-2.5 !h-2.5 !border-2 !border-background !shadow-sm"
      />
      <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 -left-10">
        <span className="rounded bg-background/80 px-1 py-0.5 text-[10px] text-muted-foreground shadow-xs border">
          string
        </span>
      </div>

      <div className="space-y-2">
        <textarea
          value={typeof data.prompt === "string" ? data.prompt : ""}
          onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
          placeholder="System instructions (optional)…"
          className={cn(
            "nodrag w-full min-h-[84px] resize-y rounded-md border border-input bg-background/60 dark:bg-muted/40 px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          )}
        />

        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">Provider</div>
          <Select
            value={currentProvider}
            onValueChange={handleProviderChange}
          >
            <SelectTrigger className="h-7 text-xs nodrag w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDERS).map(([key, provider]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {provider.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">Model</div>
          <Select
            value={currentModel}
            onValueChange={handleModelChange}
          >
            <SelectTrigger className="h-7 text-xs nodrag w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providerConfig.models.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentModelConfig?.supportsVerbosity && (
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">Verbosity</div>
            <Select
              value={data.verbosity || "medium"}
              onValueChange={(verbosity) => updateNodeData(id, { verbosity })}
            >
              <SelectTrigger className="h-7 text-xs nodrag w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERBOSITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {currentModelConfig?.supportsThinking && (
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">Thinking</div>
            <Select
              value={data.thinking ? "on" : "off"}
              onValueChange={(val) => updateNodeData(id, { thinking: val === "on" })}
            >
              <SelectTrigger className="h-7 text-xs nodrag w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THINKING_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-teal-500 !w-2.5 !h-2.5 !border-2 !border-background !shadow-sm"
      />
      <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 -right-10">
        <span className="rounded bg-background/80 px-1 py-0.5 text-[10px] text-muted-foreground shadow-xs border">
          string
        </span>
      </div>
    </NodeFrame>
  );
}
