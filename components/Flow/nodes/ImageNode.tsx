"use client";

import { useRef } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { ImageNodeData } from "@/types/flow";
import { Sparkles, Upload, X } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { ProviderModelSelector } from "./ProviderModelSelector";
import { ConfigSelect } from "./ConfigSelect";
import { cn } from "@/lib/utils";
import {
  IMAGE_PROVIDERS,
  DEFAULT_IMAGE_PROVIDER,
  DEFAULT_IMAGE_MODEL,
  ASPECT_RATIO_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  SIZE_OPTIONS,
  QUALITY_OPTIONS,
  PARTIAL_IMAGES_OPTIONS,
  type ImageProviderId,
} from "@/lib/providers";
import { parseImageOutput, getImageDataUrl, stringifyImageOutput } from "@/lib/image-utils";

type ImageNodeType = Node<ImageNodeData, "image-generation">;

export function ImageNode({ id, data }: NodeProps<ImageNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "image"
  );
  const isPromptConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "prompt"
  );
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );
  const isDoneConnected = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "done"
  );

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
      updateNodeData(id, { imageInput: imageData });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleClearImage = () => {
    updateNodeData(id, { imageInput: undefined });
  };

  const uploadedImageData = data.imageInput ? parseImageOutput(data.imageInput) : null;

  const currentProvider = (data.provider || DEFAULT_IMAGE_PROVIDER) as ImageProviderId;
  const currentModel = data.model || DEFAULT_IMAGE_MODEL;
  const currentModelConfig = IMAGE_PROVIDERS[currentProvider].models.find((m) => m.value === currentModel);

  const renderFooter = () => {
    if (data.executionError) {
      return (
        <p className="text-xs text-rose-400 whitespace-pre-wrap line-clamp-4">
          {data.executionError}
        </p>
      );
    }

    if (data.executionOutput) {
      const imageData = parseImageOutput(data.executionOutput);
      if (imageData) {
        return (
          <div
            className="w-full rounded-lg overflow-hidden bg-black/30 border border-white/10"
            style={{ minHeight: "80px" }}
          >
            <img
              src={getImageDataUrl(imageData)}
              alt="Generated"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "120px",
                objectFit: "cover",
                display: "block"
              }}
            />
          </div>
        );
      }
      return (
        <p className="text-xs text-white/60 whitespace-pre-wrap line-clamp-4">
          {data.executionOutput}
        </p>
      );
    }

    return null;
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Sparkles />}
      accentColor="rose"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            output={{ id: "output", label: "Image", colorClass: "purple", isConnected: isOutputConnected }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isDoneConnected }}
          />
        </>
      }
      footer={renderFooter()}
    >
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Prompt Input */}
        <InputWithHandle
          id="prompt"
          label="Image Prompt"
          colorClass="cyan"
          isConnected={isPromptConnected}
        >
          <textarea
            value={isPromptConnected ? "" : (typeof data.prompt === "string" ? data.prompt : "")}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            placeholder={isPromptConnected ? "Connected" : "Describe the image..."}
            disabled={isPromptConnected}
            className={cn(
              "nodrag node-input min-h-[60px] resize-y",
              isPromptConnected && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Source Image Input */}
        <InputWithHandle
          id="image"
          label="Base Image"
          colorClass="purple"
          required={false}
          isConnected={isImageConnected}
        >
          {isImageConnected ? (
            <div className="node-input min-h-[50px] flex items-center justify-center text-white/40 italic text-sm">
              Connected
            </div>
          ) : uploadedImageData ? (
            <div className="relative group">
              <img
                src={getImageDataUrl(uploadedImageData)}
                alt="Base"
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

        <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
          <ProviderModelSelector
            providers={IMAGE_PROVIDERS}
            currentProvider={currentProvider}
            currentModel={currentModel}
            onProviderChange={(provider, model, label) => {
              updateNodeData(id, { provider, model, label });
            }}
            onModelChange={(model, label) => {
              updateNodeData(id, { model, label });
            }}
          />

          {/* OpenAI-specific options */}
          {currentProvider === "openai" && (
            <>
              <ConfigSelect
                label="Format"
                value={data.outputFormat || "webp"}
                options={OUTPUT_FORMAT_OPTIONS}
                onChange={(outputFormat) => updateNodeData(id, { outputFormat })}
              />
              <ConfigSelect
                label="Size"
                value={data.size || "1024x1024"}
                options={SIZE_OPTIONS}
                onChange={(size) => updateNodeData(id, { size })}
              />
              <ConfigSelect
                label="Quality"
                value={data.quality || "low"}
                options={QUALITY_OPTIONS}
                onChange={(quality) => updateNodeData(id, { quality })}
              />
              {currentModelConfig?.supportsPartialImages && (
                <ConfigSelect
                  label="Partials"
                  value={String(data.partialImages ?? 3)}
                  options={PARTIAL_IMAGES_OPTIONS}
                  onChange={(val) => updateNodeData(id, { partialImages: Number(val) })}
                />
              )}
            </>
          )}

          {/* Google-specific options */}
          {currentProvider === "google" && (
            <ConfigSelect
              label="Aspect"
              value={data.aspectRatio || "1:1"}
              options={ASPECT_RATIO_OPTIONS}
              onChange={(aspectRatio) => updateNodeData(id, { aspectRatio })}
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
