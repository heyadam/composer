"use client";

import { useRef } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { PromptNodeData } from "@/types/flow";
import { MessageSquare, Upload, X } from "lucide-react";
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

  // Check which input handles are connected
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

  // Parse uploaded image data
  const uploadedImageData = data.imageInput ? parseImageOutput(data.imageInput) : null;

  // Handle image file upload with auto-switch to vision model
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

      // Auto-switch to vision model if current doesn't support it
      if (!modelSupportsVision(currentProvider, currentModel)) {
        const visionModel = getVisionCapableModel(currentProvider, currentModel);
        if (visionModel) {
          updates.model = visionModel;
        }
        // If no vision model available, image still uploads but may fail at execution
      }
      updateNodeData(id, updates);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleClearImage = () => {
    updateNodeData(id, { imageInput: undefined });
    // Don't revert model - user may want to keep it
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
          <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
            {data.executionError}
          </p>
        ) : (data.executionOutput || data.executionReasoning) ? (
          <div className="space-y-2">
            {data.executionReasoning && (
              <ThinkingSummary reasoning={data.executionReasoning} />
            )}
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
            <div
              className={cn(
                "nodrag w-full h-[60px] flex items-center justify-center",
                "rounded-md border border-input bg-muted/50 dark:bg-muted/20",
                "text-muted-foreground text-sm italic"
              )}
            >
              Connected
            </div>
          ) : uploadedImageData ? (
            <div className="relative group">
              <img
                src={getImageDataUrl(uploadedImageData)}
                alt="Uploaded"
                className="w-full max-h-[80px] object-contain rounded-md border border-input bg-background/60"
              />
              <button
                onClick={handleClearImage}
                className={cn(
                  "nodrag absolute top-1 right-1 p-1 rounded-full",
                  "bg-black/60 hover:bg-black/80 text-white",
                  "opacity-0 group-hover:opacity-100 transition-opacity"
                )}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "nodrag w-full h-[60px] flex flex-col items-center justify-center gap-1.5",
                "rounded-md border border-dashed border-input bg-background/60 dark:bg-muted/40",
                "text-muted-foreground text-sm",
                "hover:border-ring hover:bg-muted/50 transition-colors cursor-pointer"
              )}
            >
              <Upload className="h-4 w-4" />
              <span className="text-xs">Upload image</span>
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
