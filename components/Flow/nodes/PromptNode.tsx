"use client";

import { useRef } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { PromptNodeData } from "@/types/flow";
import { Zap, Upload, X } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { ProviderModelSelector } from "./ProviderModelSelector";
import { ConfigSelect } from "./ConfigSelect";
import { ThinkingSummary } from "@/components/ThinkingSummary";
import { cn } from "@/lib/utils";
import {
  parseImageOutput,
  getImageDataUrl,
  stringifyImageOutput,
} from "@/lib/image-utils";
import { modelSupportsVision, getVisionCapableModel } from "@/lib/vision";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check which handles are connected
  const isPromptConnected = edges.some(
    (edge) => edge.target === id && (edge.targetHandle === "prompt" || !edge.targetHandle)
  );
  const isSystemConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "system"
  );
  const isImageConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "image"
  );
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );
  const isDoneConnected = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "done"
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
    supportsVision?: boolean;
  } | undefined;

  const uploadedImageData = data.imageInput ? parseImageOutput(data.imageInput) : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      const imageData = stringifyImageOutput({
        type: "image",
        value: base64,
        mimeType: file.type || "image/png",
      });

      const updates: Record<string, unknown> = { imageInput: imageData };

      if (!modelSupportsVision(currentProvider, currentModel)) {
        const visionModel = getVisionCapableModel(currentProvider, currentModel);
        if (visionModel) {
          updates.model = visionModel;
        }
      }
      updateNodeData(id, updates);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleClearImage = () => {
    updateNodeData(id, { imageInput: undefined });
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Zap />}
      accentColor="cyan"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isDoneConnected }}
          />
        </>
      }
      footer={
        data.executionError ? (
          <p className="text-xs text-rose-400 whitespace-pre-wrap line-clamp-4">
            {data.executionError}
          </p>
        ) : (data.executionOutput || data.executionReasoning) ? (
          <div className="space-y-2">
            {data.executionReasoning && (
              <ThinkingSummary reasoning={data.executionReasoning} />
            )}
            {data.executionOutput && (
              <p className="text-xs text-white/60 whitespace-pre-wrap line-clamp-4">
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
              "nodrag node-input min-h-[60px] resize-y",
              isPromptConnected && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Image Input */}
        <InputWithHandle
          id="image"
          label="Image"
          colorClass="purple"
          required={false}
          isConnected={isImageConnected}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {isImageConnected ? (
            <div className="node-input min-h-[50px] flex items-center justify-center text-white/40 italic text-sm">
              Connected
            </div>
          ) : uploadedImageData ? (
            <div className="relative group">
              <img
                src={getImageDataUrl(uploadedImageData)}
                alt="Uploaded"
                className="w-full max-h-[80px] object-contain rounded-lg border border-white/10 bg-black/30"
              />
              <button
                onClick={handleClearImage}
                className={cn(
                  "nodrag absolute top-1.5 right-1.5 p-1 rounded-md",
                  "bg-black/70 hover:bg-black/90 text-white/80 hover:text-white",
                  "opacity-0 group-hover:opacity-100 transition-all duration-200",
                  "border border-white/10"
                )}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="nodrag node-upload-zone min-h-[50px]"
            >
              <Upload className="h-4 w-4" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Upload</span>
            </button>
          )}
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
              "nodrag node-input min-h-[60px] resize-y",
              isSystemConnected && "node-input:disabled"
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

          {currentModelConfig?.supportsThinkingLevel && (
            <ConfigSelect
              label="Thinking"
              value={data.googleThinkingConfig?.thinkingLevel || "low"}
              options={GOOGLE_THINKING_LEVEL_OPTIONS}
              onChange={(val) =>
                updateNodeData(id, {
                  googleThinkingConfig: {
                    ...data.googleThinkingConfig,
                    thinkingLevel: val as "low" | "high",
                  },
                })
              }
              width="w-[120px]"
            />
          )}

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

          {/* Cache toggle */}
          <label className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-white/40 cursor-pointer select-none nodrag pt-1">
            <input
              type="checkbox"
              checked={data.cacheable ?? false}
              onChange={(e) => updateNodeData(id, { cacheable: e.target.checked })}
              className="node-checkbox"
            />
            <span>Cache output</span>
          </label>
        </div>
      </div>
    </NodeFrame>
  );
}
