"use client";

import { useRef } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { ImageInputNodeData } from "@/types/flow";
import { Upload, X } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { cn } from "@/lib/utils";
import {
  parseImageOutput,
  getImageDataUrl,
  stringifyImageOutput,
} from "@/lib/image-utils";

type ImageInputNodeType = Node<ImageInputNodeData, "image-input">;

export function ImageInputNode({ id, data }: NodeProps<ImageInputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if output is connected (handle undefined when default handle is used)
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]; // Remove data URL prefix
      const imageData = stringifyImageOutput({
        type: "image",
        value: base64,
        mimeType: file.type || "image/png",
      });
      updateNodeData(id, { uploadedImage: imageData });
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleClear = () => {
    updateNodeData(id, { uploadedImage: undefined });
  };

  const uploadedImageData = data.uploadedImage
    ? parseImageOutput(data.uploadedImage)
    : null;

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Upload className="h-4 w-4" />}
      iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-300"
      accentBorderClassName="border-purple-500"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          output={{ id: "output", label: "image", colorClass: "purple", isConnected: isOutputConnected }}
        />
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {uploadedImageData ? (
        <div className="relative group">
          <img
            src={getImageDataUrl(uploadedImageData)}
            alt="Uploaded"
            className="w-full max-h-[120px] object-contain rounded-md border border-input bg-background/60"
          />
          <button
            onClick={handleClear}
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
            "nodrag w-full min-h-[84px] flex flex-col items-center justify-center gap-2",
            "rounded-md border border-dashed border-input bg-background/60 dark:bg-muted/40",
            "text-muted-foreground text-sm",
            "hover:border-ring hover:bg-muted/50 transition-colors cursor-pointer"
          )}
        >
          <Upload className="h-6 w-6" />
          <span>Upload image</span>
        </button>
      )}
    </NodeFrame>
  );
}
