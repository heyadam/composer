"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { ImageNodeData } from "@/types/flow";
import { ImageIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
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
  const providerConfig = IMAGE_PROVIDERS[currentProvider];
  const currentModel = data.model || DEFAULT_IMAGE_MODEL;
  const currentModelConfig = providerConfig.models.find((m) => m.value === currentModel);

  const handleProviderChange = (provider: string) => {
    const newProvider = provider as ImageProviderId;
    const firstModel = IMAGE_PROVIDERS[newProvider].models[0];
    updateNodeData(id, { provider: newProvider, model: firstModel.value, label: firstModel.label });
  };

  const handleModelChange = (model: string) => {
    const modelConfig = providerConfig.models.find((m) => m.value === model);
    updateNodeData(id, { model, label: modelConfig?.label || model });
  };

  // Render image footer using shared utilities
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
      // Not image data, show as text
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

        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground">Provider</div>
          <Select
            value={currentProvider}
            onValueChange={handleProviderChange}
          >
            <SelectTrigger className="h-7 text-xs nodrag w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(IMAGE_PROVIDERS).map(([key, provider]) => (
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
            <SelectTrigger className="h-7 text-xs nodrag w-[100px]">
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

        {/* OpenAI-specific options */}
        {currentProvider === "openai" && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">Format</div>
              <Select
                value={data.outputFormat || "webp"}
                onValueChange={(outputFormat) => updateNodeData(id, { outputFormat })}
              >
                <SelectTrigger className="h-7 text-xs nodrag w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">Size</div>
              <Select
                value={data.size || "1024x1024"}
                onValueChange={(size) => updateNodeData(id, { size })}
              >
                <SelectTrigger className="h-7 text-xs nodrag w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-muted-foreground">Quality</div>
              <Select
                value={data.quality || "low"}
                onValueChange={(quality) => updateNodeData(id, { quality })}
              >
                <SelectTrigger className="h-7 text-xs nodrag w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentModelConfig?.supportsPartialImages && (
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">Partials</div>
                <Select
                  value={String(data.partialImages ?? 3)}
                  onValueChange={(val) => updateNodeData(id, { partialImages: Number(val) })}
                >
                  <SelectTrigger className="h-7 text-xs nodrag w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTIAL_IMAGES_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {/* Google-specific options */}
        {currentProvider === "google" && (
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">Aspect</div>
            <Select
              value={data.aspectRatio || "1:1"}
              onValueChange={(aspectRatio) => updateNodeData(id, { aspectRatio })}
            >
              <SelectTrigger className="h-7 text-xs nodrag w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </NodeFrame>
  );
}
