"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { ImageInputNodeData } from "@/types/flow";
import { ImagePlus } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { ImageClearButton } from "./ImageClearButton";
import { parseImageOutput, getImageDataUrl } from "@/lib/image-utils";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";
import { useImageFileInput } from "@/lib/hooks/useImageFileInput";

type ImageInputNodeType = Node<ImageInputNodeData, "image-input">;

export function ImageInputNode({ id, data }: NodeProps<ImageInputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isOutputConnected } = useEdgeConnections(id);
  const { fileInputRef, handleFileChange, handleClear, triggerFileSelect } = useImageFileInput({
    nodeId: id,
    dataKey: "uploadedImage",
  });

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
          output={{ id: "output", label: "Image", colorClass: "purple", isConnected: isOutputConnected("output", true) }}
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
          <ImageClearButton onClear={handleClear} />
        </div>
      ) : (
        <button
          onClick={triggerFileSelect}
          className="nodrag node-upload-zone min-h-[72px]"
        >
          <ImagePlus className="h-5 w-5" />
          <span className="text-[11px] font-medium">Upload image</span>
        </button>
      )}
    </NodeFrame>
  );
}
