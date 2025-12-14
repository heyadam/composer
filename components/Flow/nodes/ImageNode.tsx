"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { ImageNodeData } from "@/types/flow";
import { ImageIcon } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
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
import { parseImageOutput, getImageDataUrl } from "@/lib/image-utils";

type ImageNodeType = Node<ImageNodeData, "image">;

export function ImageNode({ id, data }: NodeProps<ImageNodeType>) {
  const { updateNodeData } = useReactFlow();

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
        <PortRow
          nodeId={id}
          input={{ id: "prompt", label: "prompt", colorClass: "cyan" }}
          output={{ id: "output", label: "image", colorClass: "purple" }}
        />
      }
      footer={renderFooter()}
    >
      <div className="space-y-2">
        <textarea
          value={typeof data.prompt === "string" ? data.prompt : ""}
          onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
          placeholder="Additional instructions (optional)…"
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
