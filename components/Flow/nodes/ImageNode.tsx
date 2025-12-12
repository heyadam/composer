"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
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
import { cn } from "@/lib/utils";
import {
  IMAGE_PROVIDERS,
  DEFAULT_IMAGE_PROVIDER,
  DEFAULT_IMAGE_MODEL,
  ASPECT_RATIO_OPTIONS,
  type ImageProviderId,
} from "@/lib/providers";

type ImageNodeType = Node<ImageNodeData, "image">;

const OUTPUT_FORMAT_OPTIONS = [
  { value: "webp", label: "WebP" },
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
];

const SIZE_OPTIONS = [
  { value: "1024x1024", label: "Square" },
  { value: "1024x1792", label: "Portrait" },
  { value: "1792x1024", label: "Landscape" },
];

const QUALITY_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const PARTIAL_IMAGES_OPTIONS = [
  { value: "0", label: "0 (None)" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
];

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

  // Parse image from executionOutput if it's JSON
  const renderFooter = () => {
    if (data.executionError) {
      return (
        <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
          {data.executionError}
        </p>
      );
    }

    if (data.executionOutput) {
      try {
        const parsed = JSON.parse(data.executionOutput);
        if (parsed.type === "image" && parsed.value) {
          return (
            <div
              className="w-full rounded overflow-hidden bg-muted/20"
              style={{ minHeight: "80px" }}
            >
              <img
                src={`data:${parsed.mimeType};base64,${parsed.value}`}
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
      } catch {
        // Not JSON, show as text
        return (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {data.executionOutput}
          </p>
        );
      }
    }

    return null;
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<ImageIcon className="h-4 w-4" />}
      iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-300"
      accentBorderClassName="border-l-purple-500"
      status={data.executionStatus}
      className="w-[240px]"
      footer={renderFooter()}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-teal-500 !w-2.5 !h-2.5 !border-2 !border-background !shadow-sm"
      />
      <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 -left-10">
        <span className="rounded bg-background/80 px-1 py-0.5 text-[10px] text-muted-foreground shadow-xs border">
          string
        </span>
      </div>

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

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-teal-500 !w-2.5 !h-2.5 !border-2 !border-background !shadow-sm"
      />
      <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 -right-10">
        <span className="rounded bg-background/80 px-1 py-0.5 text-[10px] text-muted-foreground shadow-xs border">
          image
        </span>
      </div>
    </NodeFrame>
  );
}
