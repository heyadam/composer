"use client";

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { OutputNodeData } from "@/types/flow";
import { Eye } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortList } from "./PortLabel";
import { parseImageOutput, getImageDataUrl } from "@/lib/image-utils";
import { AudioPreview } from "@/components/Flow/ResponsesSidebar/AudioPreview";

type OutputNodeType = Node<OutputNodeData, "preview-output">;

export function OutputNode({ id, data }: NodeProps<OutputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  const isStringConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "string"
  );
  const isImageConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "image"
  );
  const isAudioConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "audio"
  );
  const isCodeConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "code"
  );

  const renderFooter = () => {
    if (data.executionError) {
      return (
        <p className="text-xs text-rose-400 whitespace-pre-wrap line-clamp-4">
          {data.executionError}
        </p>
      );
    }

    const hasOutput = data.stringOutput || data.imageOutput || data.audioOutput || data.codeOutput;
    if (!hasOutput) {
      return (
        <p className="text-xs text-white/40 italic">
          Output appears here
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {data.stringOutput && (
          <p className="text-xs text-white/60 whitespace-pre-wrap line-clamp-4">
            {data.stringOutput}
          </p>
        )}

        {data.imageOutput && (() => {
          const imageData = parseImageOutput(data.imageOutput);
          return imageData ? (
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img
                src={getImageDataUrl(imageData)}
                alt="Generated image"
                className="w-full h-auto max-h-[160px] object-contain bg-black/30"
              />
            </div>
          ) : null;
        })()}

        {data.audioOutput && (
          <AudioPreview output={data.audioOutput} compact />
        )}

        {data.codeOutput && (
          <p className="text-xs text-white/50">
            Code preview available in sidebar
          </p>
        )}
      </div>
    );
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Eye />}
      accentColor="emerald"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <PortList
          nodeId={id}
          inputs={[
            { id: "string", label: "String", colorClass: "cyan", isConnected: isStringConnected },
            { id: "image", label: "Image", colorClass: "purple", isConnected: isImageConnected },
            { id: "audio", label: "Audio", colorClass: "emerald", isConnected: isAudioConnected },
            { id: "code", label: "Code", colorClass: "amber", isConnected: isCodeConnected },
          ]}
        />
      }
      footer={renderFooter()}
    />
  );
}
