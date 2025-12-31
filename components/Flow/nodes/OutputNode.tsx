"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { OutputNodeData } from "@/types/flow";
import { Eye } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortList } from "./PortLabel";
import { NodeFooter } from "./NodeFooter";
import { parseImageOutput, getImageDataUrl } from "@/lib/image-utils";
import { AudioPreview } from "@/components/Flow/ResponsesSidebar/AudioPreview";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";

type OutputNodeType = Node<OutputNodeData, "preview-output">;

export function OutputNode({ id, data }: NodeProps<OutputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected } = useEdgeConnections(id);

  const renderFooter = () => {
    if (data.executionError) {
      return <NodeFooter error={data.executionError} />;
    }

    const hasOutput = data.stringOutput || data.imageOutput || data.audioOutput || data.codeOutput;
    if (!hasOutput) {
      return <NodeFooter emptyMessage="Output appears here" />;
    }

    return (
      <div className="space-y-2 px-3.5 py-2.5">
        {data.stringOutput && (
          <p className="text-xs text-white/75 whitespace-pre-wrap line-clamp-4">
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
          <p className="text-xs text-white/65">
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
            { id: "string", label: "String", colorClass: "cyan", isConnected: isInputConnected("string") },
            { id: "image", label: "Image", colorClass: "purple", isConnected: isInputConnected("image") },
            { id: "audio", label: "Audio", colorClass: "emerald", isConnected: isInputConnected("audio") },
            { id: "code", label: "Code", colorClass: "amber", isConnected: isInputConnected("code") },
          ]}
        />
      }
      footer={renderFooter()}
    />
  );
}
