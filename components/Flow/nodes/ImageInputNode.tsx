"use client";

import { useRef } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { ImageInputNodeData } from "@/types/flow";
import { ImagePlus, X } from "lucide-react";
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

  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
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
      updateNodeData(id, { uploadedImage: imageData });
    };
    reader.readAsDataURL(file);
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
      icon={<ImagePlus />}
      accentColor="fuchsia"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <PortRow
          nodeId={id}
          output={{ id: "output", label: "Image", colorClass: "purple", isConnected: isOutputConnected }}
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
            className="w-full max-h-[100px] object-contain rounded-lg border border-white/[0.06] bg-black/20"
          />
          <button
            onClick={handleClear}
            className={cn(
              "nodrag absolute top-1.5 right-1.5 p-1 rounded-md",
              "bg-black/60 hover:bg-black/80 text-white/70 hover:text-white",
              "opacity-0 group-hover:opacity-100 transition-all duration-200",
              "border border-white/[0.08]"
            )}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="nodrag node-upload-zone min-h-[72px]"
        >
          <ImagePlus className="h-5 w-5" />
          <span className="text-[11px] font-medium">Upload image</span>
        </button>
      )}
    </NodeFrame>
  );
}
