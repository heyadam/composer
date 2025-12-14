"use client";

import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { OutputNodeData } from "@/types/flow";
import { Square, ImageIcon } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { isImageOutput } from "@/lib/image-utils";

type OutputNodeType = Node<OutputNodeData, "output">;

export function OutputNode({ id, data }: NodeProps<OutputNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();

  // Check if input is connected (handle undefined when default handle is used)
  const isInputConnected = edges.some(
    (edge) => edge.target === id && (edge.targetHandle === "input" || !edge.targetHandle)
  );

  const renderFooter = () => {
    if (data.executionError) {
      return (
        <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
          {data.executionError}
        </p>
      );
    }

    if (data.executionOutput) {
      // Don't render image data in the node, just show a placeholder
      if (isImageOutput(data.executionOutput)) {
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Image (view in sidebar)</span>
          </div>
        );
      }

      return (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
          {data.executionOutput}
        </p>
      );
    }

    return (
      <p className="text-xs text-muted-foreground">Output appears here</p>
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
        <PortRow
          nodeId={id}
          input={{ id: "input", label: "response", colorClass: "amber", isConnected: isInputConnected }}
        />
      }
      footer={renderFooter()}
    />
  );
}
