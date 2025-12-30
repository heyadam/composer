"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { ImageNodeData } from "@/types/flow";
import { Sparkles, Upload } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { NodeFooter } from "./NodeFooter";
import { ProviderModelSelector } from "./ProviderModelSelector";
import { ConfigSelect } from "./ConfigSelect";
import { CacheToggle } from "./CacheToggle";
import { ImageClearButton } from "./ImageClearButton";
import { cn } from "@/lib/utils";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";
import { useImageFileInput } from "@/lib/hooks/useImageFileInput";
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
import { parseImageOutput, getImageDataUrl } from "@/lib/image-utils";

type ImageNodeType = Node<ImageNodeData, "image-generation">;

export function ImageNode({ id, data }: NodeProps<ImageNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected, isOutputConnected } = useEdgeConnections(id);
  const { fileInputRef, handleFileChange, handleClear, triggerFileSelect } = useImageFileInput({
    nodeId: id,
    dataKey: "imageInput",
  });

  const uploadedImageData = data.imageInput ? parseImageOutput(data.imageInput) : null;

  const currentProvider = (data.provider || DEFAULT_IMAGE_PROVIDER) as ImageProviderId;
  const currentModel = data.model || DEFAULT_IMAGE_MODEL;
  const currentModelConfig = IMAGE_PROVIDERS[currentProvider].models.find((m) => m.value === currentModel);

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
            output={{ id: "output", label: "Image", colorClass: "purple", isConnected: isOutputConnected("output", true) }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isOutputConnected("done") }}
          />
        </>
      }
      footer={<NodeFooter error={data.executionError} imageOutput={data.executionOutput} />}
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
          isConnected={isInputConnected("prompt")}
        >
          <textarea
            value={isInputConnected("prompt") ? "" : (typeof data.prompt === "string" ? data.prompt : "")}
            onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            placeholder={isInputConnected("prompt") ? "Connected" : "Describe the image..."}
            disabled={isInputConnected("prompt")}
            className={cn(
              "nodrag node-input min-h-[60px] resize-y",
              isInputConnected("prompt") && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Source Image Input */}
        <InputWithHandle
          id="image"
          label="Base Image"
          colorClass="purple"
          required={false}
          isConnected={isInputConnected("image")}
        >
          {isInputConnected("image") ? (
            <div className="node-input min-h-[50px] flex items-center justify-center text-white/55 italic text-sm">
              Connected
            </div>
          ) : uploadedImageData ? (
            <div className="relative group">
              <img
                src={getImageDataUrl(uploadedImageData)}
                alt="Base"
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
          <CacheToggle nodeId={id} checked={data.cacheable ?? false} className="pt-1" />
        </div>
      </div>
    </NodeFrame>
  );
}
