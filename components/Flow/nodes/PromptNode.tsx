"use client";

import { useState } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { PromptNodeData } from "@/types/flow";
import { MessageSquare, Brain, ChevronDown, ChevronRight } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { ProviderModelSelector } from "./ProviderModelSelector";
import { ConfigSelect } from "./ConfigSelect";
import { cn } from "@/lib/utils";
import {
  PROVIDERS,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL,
  VERBOSITY_OPTIONS,
  THINKING_OPTIONS,
  GOOGLE_THINKING_LEVEL_OPTIONS,
  GOOGLE_THINKING_BUDGET_OPTIONS,
  GOOGLE_SAFETY_PRESET_OPTIONS,
  type ProviderId,
} from "@/lib/providers";

type PromptNodeType = Node<PromptNodeData, "text-generation">;

export function PromptNode({ id, data }: NodeProps<PromptNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

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

  const currentProvider = (data.provider || DEFAULT_PROVIDER) as ProviderId;
  const currentModel = data.model || DEFAULT_MODEL;
  const currentModelConfig = PROVIDERS[currentProvider].models.find((m) => m.value === currentModel) as {
    value: string;
    label: string;
    supportsVerbosity: boolean;
    supportsThinking: boolean;
    supportsThinkingBudget?: boolean;
    supportsThinkingLevel?: boolean;
  } | undefined;

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
          output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected }}
        />
      }
      footer={
        data.executionError ? (
          <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
            {data.executionError}
          </p>
        ) : (data.executionOutput || data.executionReasoning) ? (
          <div className="space-y-2">
            {/* Reasoning section (collapsible) */}
            {data.executionReasoning && (
              <div className="border border-purple-500/20 rounded-md overflow-hidden">
                <button
                  onClick={() => setReasoningExpanded(!reasoningExpanded)}
                  className="nodrag w-full flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                >
                  <Brain className="h-3 w-3" />
                  <span>Thinking</span>
                  {reasoningExpanded ? (
                    <ChevronDown className="h-3 w-3 ml-auto" />
                  ) : (
                    <ChevronRight className="h-3 w-3 ml-auto" />
                  )}
                </button>
                {reasoningExpanded && (
                  <p className="px-2 py-1.5 text-xs text-purple-600/80 dark:text-purple-400/80 whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                    {data.executionReasoning}
                  </p>
                )}
              </div>
            )}
            {/* Output */}
            {data.executionOutput && (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                {data.executionOutput}
              </p>
            )}
          </div>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* User Prompt Input */}
        <InputWithHandle
          id="prompt"
          label="User Prompt"
          colorClass="cyan"
          isConnected={isPromptConnected}
        >
          <textarea
            value={isPromptConnected ? "" : (data.userPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
            placeholder={isPromptConnected ? "Connected" : "Enter prompt..."}
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
          isConnected={isSystemConnected}
        >
          <textarea
            value={isSystemConnected ? "" : (data.systemPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            placeholder={isSystemConnected ? "Connected" : "Enter instructions..."}
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

          {currentModelConfig?.supportsVerbosity && (
            <ConfigSelect
              label="Verbosity"
              value={data.verbosity || "medium"}
              options={VERBOSITY_OPTIONS}
              onChange={(verbosity) => updateNodeData(id, { verbosity })}
              width="w-[120px]"
            />
          )}

          {currentModelConfig?.supportsThinking && (
            <ConfigSelect
              label="Thinking"
              value={data.thinking ? "on" : "off"}
              options={THINKING_OPTIONS}
              onChange={(val) => updateNodeData(id, { thinking: val === "on" })}
              width="w-[120px]"
            />
          )}

          {/* Google Gemini 3 - Thinking Level */}
          {currentModelConfig?.supportsThinkingLevel && (
            <ConfigSelect
              label="Thinking"
              value={data.googleThinkingConfig?.thinkingLevel || "off"}
              options={GOOGLE_THINKING_LEVEL_OPTIONS}
              onChange={(val) =>
                updateNodeData(id, {
                  googleThinkingConfig: {
                    ...data.googleThinkingConfig,
                    thinkingLevel: val === "off" ? undefined : (val as "low" | "high"),
                  },
                })
              }
              width="w-[120px]"
            />
          )}

          {/* Google Gemini 2.5 - Thinking Budget */}
          {currentModelConfig?.supportsThinkingBudget && (
            <ConfigSelect
              label="Thinking"
              value={String(data.googleThinkingConfig?.thinkingBudget ?? "0")}
              options={GOOGLE_THINKING_BUDGET_OPTIONS}
              onChange={(val) =>
                updateNodeData(id, {
                  googleThinkingConfig: {
                    ...data.googleThinkingConfig,
                    thinkingBudget: val === "0" ? undefined : Number(val),
                  },
                })
              }
              width="w-[120px]"
            />
          )}

          {/* Google Safety Settings */}
          {currentProvider === "google" && (
            <ConfigSelect
              label="Safety"
              value={data.googleSafetyPreset || "default"}
              options={GOOGLE_SAFETY_PRESET_OPTIONS}
              onChange={(val) =>
                updateNodeData(id, {
                  googleSafetyPreset: val as "default" | "strict" | "relaxed" | "none",
                })
              }
              width="w-[120px]"
            />
          )}
        </div>
      </div>
    </NodeFrame>
  );
}
