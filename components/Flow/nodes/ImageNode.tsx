"use client";

import { useRef } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { ImageNodeData } from "@/types/flow";
import { ImageIcon, Upload, X } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortList } from "./PortLabel";
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

type ImageNodeType = Node<ImageNodeData, "image">;

export function ImageNode({ id, data }: NodeProps<ImageNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if inputs/output are connected
  const isImageConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "image"
  );
  const isPromptConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "prompt"
  );
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );

  // File upload handling for inline image input
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
        <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
          {data.executionError}
        </p>
      );
    }

    if (data.executionOutput) {
      const imageData = parseImageOutput(data.executionOutput);
      if (imageData) {
        return (
          <div
            className="w-full rounded overflow-hidden bg-muted/20"
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
        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
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
      icon={<ImageIcon className="h-4 w-4" />}
      iconClassName="bg-gray-500/10 text-gray-600 dark:text-gray-300"
      accentBorderClassName=""
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortList
          nodeId={id}
          inputs={[
            { id: "prompt", label: "prompt", colorClass: "cyan", required: false, isConnected: isPromptConnected },
          ]}
          outputs={[
            { id: "output", label: "image", colorClass: "purple", isConnected: isOutputConnected },
          ]}
        />
      }
      footer={renderFooter()}
    >
      <div className="space-y-2">
        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Source Image Input */}
        <InputWithHandle
          id="image"
          label="Base Image"
          colorClass="purple"
          required={false}
          isConnected={isImageConnected}
        >
          {isImageConnected ? (
            <div className="text-xs text-muted-foreground italic px-3 py-2 border border-dashed border-input rounded-md bg-muted/20">
              Connected
            </div>
          ) : uploadedImageData ? (
            <div className="relative group">
              <img
                src={getImageDataUrl(uploadedImageData)}
                alt="Base"
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
                "nodrag w-full min-h-[50px] flex flex-col items-center justify-center gap-1",
                "rounded-md border border-dashed border-input bg-background/60 dark:bg-muted/40",
                "text-muted-foreground text-xs",
                "hover:border-ring hover:bg-muted/50 transition-colors cursor-pointer"
              )}
            >
              <Upload className="h-4 w-4" />
              <span>Upload image</span>
            </button>
          )}
        </InputWithHandle>

        {/* Prompt Input */}
        <textarea
          value={typeof data.prompt === "string" ? data.prompt : ""}
          onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
          placeholder="Describe the image..."
          className={cn(
            "nodrag w-full min-h-[60px] resize-y rounded-md border border-input bg-background/60 dark:bg-muted/40 px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          )}
        />

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
      </div>
    </NodeFrame>
  );
}
