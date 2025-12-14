"use client";

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
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
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { cn } from "@/lib/utils";
import { PROVIDERS, DEFAULT_PROVIDER, DEFAULT_MODEL, VERBOSITY_OPTIONS, THINKING_OPTIONS, type ProviderId } from "@/lib/providers";

type PromptNodeType = Node<PromptNodeData, "prompt">;

export function PromptNode({ id, data }: NodeProps<PromptNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  // Check which input handles are connected
  // Note: edges without targetHandle default to the primary "prompt" input
  const isPromptConnected = edges.some(
    (edge) => edge.target === id && (edge.targetHandle === "prompt" || !edge.targetHandle)
  );
  const isSystemConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "system"
  );

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
      iconClassName="bg-gray-500/10 text-gray-600 dark:text-gray-300"
      accentBorderClassName=""
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          output={{ id: "output", label: "string", colorClass: "cyan" }}
        />
      }
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
      <div className="space-y-4">
        {/* User Prompt Input */}
        <InputWithHandle
          id="prompt"
          label="User Prompt"
          colorClass="cyan"
        >
          <textarea
            value={isPromptConnected ? "" : (data.userPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
            placeholder={isPromptConnected ? "Using connected input" : "Enter user message..."}
            disabled={isPromptConnected}
            className={cn(
              "nodrag w-full min-h-[60px] resize-y rounded-md border border-input px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
              isPromptConnected
                ? "bg-muted/50 dark:bg-muted/20 cursor-not-allowed placeholder:italic placeholder:text-muted-foreground"
                : "bg-background/60 dark:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            )}
          />
        </InputWithHandle>

        {/* System Prompt Input */}
        <InputWithHandle
          id="system"
          label="System Instructions"
          colorClass="cyan"
          required={false}
        >
          <textarea
            value={isSystemConnected ? "" : (data.systemPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            placeholder={isSystemConnected ? "Using connected input" : "Enter system instructions..."}
            disabled={isSystemConnected}
            className={cn(
              "nodrag w-full min-h-[60px] resize-y rounded-md border border-input px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
              isSystemConnected
                ? "bg-muted/50 dark:bg-muted/20 cursor-not-allowed placeholder:italic placeholder:text-muted-foreground"
                : "bg-background/60 dark:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            )}
          />
        </InputWithHandle>

        {/* Configuration */}
        <div className="space-y-2 pt-2 border-t">
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
      </div>
    </NodeFrame>
  );
}
