"use client";

import { useReactFlow } from "@xyflow/react";
import { cn } from "@/lib/utils";

interface CacheToggleProps {
  nodeId: string;
  checked: boolean;
  /** Additional wrapper classes (e.g., for border-top or padding) */
  className?: string;
}

/**
 * Cache toggle checkbox for processing nodes.
 *
 * When enabled, the node's output will be cached and reused if inputs haven't changed.
 * Used by PromptNode, ImageNode, MagicNode, ReactNode, and AudioTranscriptionNode.
 */
export function CacheToggle({ nodeId, checked, className }: CacheToggleProps) {
  const { updateNodeData } = useReactFlow();

  return (
    <label
      className={cn(
        "flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider",
        "text-white/40 cursor-pointer select-none nodrag",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => updateNodeData(nodeId, { cacheable: e.target.checked })}
        className="node-checkbox"
      />
      <span>Cache output</span>
    </label>
  );
}
