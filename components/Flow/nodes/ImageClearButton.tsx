"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageClearButtonProps {
  onClear: () => void;
  className?: string;
}

/**
 * Clear button for image previews in nodes.
 *
 * Appears on hover over the parent container (requires parent to have `group` class).
 * Standardizes the clear button pattern across ImageInputNode, PromptNode, and ImageNode.
 */
export function ImageClearButton({ onClear, className }: ImageClearButtonProps) {
  return (
    <button
      onClick={onClear}
      className={cn(
        "nodrag absolute top-1.5 right-1.5 p-1 rounded-md",
        "bg-black/70 hover:bg-black/90 text-white/90 hover:text-white",
        "opacity-0 group-hover:opacity-100 transition-all duration-200",
        "border border-white/10",
        className
      )}
    >
      <X className="h-3 w-3" />
    </button>
  );
}
