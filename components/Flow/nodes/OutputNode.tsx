"use client";

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { OutputNodeData } from "@/types/flow";
import { Square } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortList } from "./PortLabel";
import { parseImageOutput, getImageDataUrl } from "@/lib/image-utils";
import { AudioPreview } from "@/components/Flow/ResponsesSidebar/AudioPreview";

type OutputNodeType = Node<OutputNodeData, "preview-output">;

export function OutputNode({ id, data }: NodeProps<OutputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  // Check if inputs are connected
  const isStringConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "string"
  );
  const isImageConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "image"
  );
  const isAudioConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "audio"
  );

  const renderFooter = () => {
    if (data.executionError) {
      return (
        <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
          {data.executionError}
        </p>
      );
    }

    const hasOutput = data.stringOutput || data.imageOutput || data.audioOutput;
    if (!hasOutput) {
      return <p className="text-xs text-muted-foreground">Output appears here</p>;
    }

    return (
      <div className="space-y-2">
        {/* String output */}
        {data.stringOutput && (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {data.stringOutput}
          </p>
        )}

        {/* Image output */}
        {data.imageOutput && (() => {
          const imageData = parseImageOutput(data.imageOutput);
          return imageData ? (
            <div className="rounded-md overflow-hidden border border-border/50">
              <img
                src={getImageDataUrl(imageData)}
                alt="Generated image"
                className="w-full h-auto max-h-[160px] object-contain bg-muted/30"
              />
            </div>
          ) : null;
        })()}

        {/* Audio output */}
        {data.audioOutput && (
          <AudioPreview output={data.audioOutput} compact />
        )}
      </div>
    );
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Square className="h-4 w-4" />}
      iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-300"
      accentBorderClassName="border-blue-500"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortList
          nodeId={id}
          inputs={[
            { id: "string", label: "String", colorClass: "cyan", isConnected: isStringConnected },
            { id: "image", label: "Image", colorClass: "purple", isConnected: isImageConnected },
            { id: "audio", label: "Audio", colorClass: "emerald", isConnected: isAudioConnected },
          ]}
        />
      }
      footer={renderFooter()}
    />
  );
}
