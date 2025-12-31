"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { ImageInputNodeData } from "@/types/flow";
import { ImagePlus, Upload } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { ImageClearButton } from "./ImageClearButton";
import { NodeImagePreview } from "./NodeImagePreview";
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

  const hasUploadedImage = !!data.uploadedImage;

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

      {hasUploadedImage ? (
        <div className="relative group">
          <NodeImagePreview src={data.uploadedImage!} alt="Uploaded" />
          <ImageClearButton onClear={handleClear} />
        </div>
      ) : (
        <button
          onClick={triggerFileSelect}
          className="nodrag node-upload-zone w-full min-h-[72px]"
        >
          <Upload className="h-4 w-4" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Upload</span>
        </button>
      )}
    </NodeFrame>
  );
}
