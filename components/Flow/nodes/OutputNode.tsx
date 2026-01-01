"use client";

import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { OutputNodeData } from "@/types/flow";
import { Eye, PanelRight } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortList } from "./PortLabel";
import { NodeFooter } from "./NodeFooter";
import { NodeImagePreview } from "./NodeImagePreview";
import { AudioPreview } from "@/components/Flow/ResponsesSidebar/AudioPreview";
import { useEdgeConnections } from "@/lib/hooks/useEdgeConnections";
import { useSidebar } from "@/components/Flow/SidebarContext";

type OutputNodeType = Node<OutputNodeData, "preview-output">;

export function OutputNode({ id, data }: NodeProps<OutputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const { isInputConnected } = useEdgeConnections(id);
  const { openResponsesSidebar } = useSidebar();

  const renderFooter = () => {
    if (data.executionError) {
      return <NodeFooter error={data.executionError} />;
    }

    const hasOutput = data.stringOutput || data.imageOutput || data.audioOutput || data.codeOutput || data.threeOutput;
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

        {data.imageOutput && (
          <NodeImagePreview src={data.imageOutput} alt="Generated image" />
        )}

        {data.audioOutput && (
          <AudioPreview output={data.audioOutput} compact />
        )}

        {(data.codeOutput || data.threeOutput) && (
          <button
            onClick={openResponsesSidebar}
            className="flex items-center gap-1.5 text-xs text-white/65 hover:text-white/90 transition-colors cursor-pointer"
          >
            <PanelRight className="w-3.5 h-3.5" />
            Open sidebar to view
          </button>
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
            { id: "three", label: "3D", colorClass: "coral", isConnected: isInputConnected("three") },
          ]}
        />
      }
      footer={renderFooter()}
    />
  );
}
