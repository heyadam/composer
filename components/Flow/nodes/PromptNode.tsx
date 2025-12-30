"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { PromptNodeData } from "@/types/flow";
import { Zap, Upload } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { ProviderModelSelector } from "./ProviderModelSelector";
import { ConfigSelect } from "./ConfigSelect";
import { NodeFooter } from "./NodeFooter";
import { CacheToggle } from "./CacheToggle";
import { ImageClearButton } from "./ImageClearButton";
import { cn } from "@/lib/utils";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";
import { useImageFileInput } from "@/lib/hooks/useImageFileInput";
import { parseImageOutput, getImageDataUrl } from "@/lib/image-utils";
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
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);

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

  // File input hook with vision model auto-switching
  const { fileInputRef, handleFileChange, handleClear, triggerFileSelect } = useImageFileInput({
    nodeId: id,
    dataKey: "imageInput",
    onImageAdded: () => {
      // Auto-switch to vision-capable model if needed
      if (!modelSupportsVision(currentProvider, currentModel)) {
        const visionModel = getVisionCapableModel(currentProvider, currentModel);
        if (visionModel) {
          updateNodeData(id, { model: visionModel });
        }
      }
    },
  });

  const uploadedImageData = data.imageInput ? parseImageOutput(data.imageInput) : null;

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
            output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected("output", true) }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
        </>
      }
      footer={
        <NodeFooter
          error={data.executionError}
          output={data.executionOutput}
          reasoning={data.executionReasoning}
        />
      }
    >
      <div className="space-y-4">
        {/* User Prompt Input */}
        <InputWithHandle
          id="prompt"
          label="User Prompt"
          colorClass="cyan"
          isConnected={isInputConnected("prompt", true)}
        >
          <textarea
            value={isInputConnected("prompt", true) ? "" : (data.userPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { userPrompt: e.target.value })}
            placeholder={isInputConnected("prompt", true) ? "Connected" : "Enter prompt..."}
            disabled={isInputConnected("prompt", true)}
            className={cn(
              "nodrag node-input min-h-[60px] resize-y",
              isInputConnected("prompt", true) && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Image Input */}
        <InputWithHandle
          id="image"
          label="Image"
          colorClass="purple"
          required={false}
          isConnected={isInputConnected("image")}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {isInputConnected("image") ? (
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
              <ImageClearButton onClear={handleClear} />
            </div>
          ) : (
            <button
              onClick={triggerFileSelect}
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
          isConnected={isInputConnected("system")}
        >
          <textarea
            value={isInputConnected("system") ? "" : (data.systemPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            placeholder={isInputConnected("system") ? "Connected" : "Enter instructions..."}
            disabled={isInputConnected("system")}
            className={cn(
              "nodrag node-input min-h-[60px] resize-y",
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
          <CacheToggle nodeId={id} checked={data.cacheable ?? false} className="pt-1" />
        </div>
      </div>
    </NodeFrame>
  );
}
