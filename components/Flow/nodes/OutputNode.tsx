"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import type { OutputNodeData } from "@/types/flow";
import { Square, ImageIcon } from "lucide-react";
import { NodeFrame } from "./NodeFrame";

type OutputNodeType = Node<OutputNodeData, "output">;

// Check if output is image JSON data
function isImageOutput(output?: string): boolean {
  if (!output) return false;
  try {
    const parsed = JSON.parse(output);
    return parsed.type === "image" && parsed.value;
  } catch {
    return false;
  }
}

export function OutputNode({ id, data }: NodeProps<OutputNodeType>) {
  const { updateNodeData } = useReactFlow();

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
            <span>Image output (see sidebar)</span>
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
      <p className="text-xs text-muted-foreground">Final result is shown here.</p>
    );
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Square className="h-4 w-4" />}
      iconClassName="bg-red-500/10 text-red-600 dark:text-red-300"
      accentBorderClassName="border-l-red-500"
      status={data.executionStatus}
      className="min-w-[190px]"
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
      {/* no body content */}
    </NodeFrame>
  );
}
