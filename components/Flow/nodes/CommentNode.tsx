"use client";

import { useState } from "react";
import { NodeProps, NodeResizer, useReactFlow } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommentNodeData, CommentColor } from "@/types/flow";

// Color theme mappings
const COMMENT_COLORS: Record<
  CommentColor,
  {
    headerBg: string;
    headerText: string;
    border: string;
    bg: string;
  }
> = {
  gray: {
    headerBg: "bg-gray-500/20",
    headerText: "text-gray-700 dark:text-gray-300",
    border: "border-t-gray-500",
    bg: "bg-gray-500/5",
  },
  blue: {
    headerBg: "bg-blue-500/20",
    headerText: "text-blue-700 dark:text-blue-300",
    border: "border-t-blue-500",
    bg: "bg-blue-500/5",
  },
  green: {
    headerBg: "bg-green-500/20",
    headerText: "text-green-700 dark:text-green-300",
    border: "border-t-green-500",
    bg: "bg-green-500/5",
  },
  yellow: {
    headerBg: "bg-yellow-500/20",
    headerText: "text-yellow-700 dark:text-yellow-300",
    border: "border-t-yellow-500",
    bg: "bg-yellow-500/5",
  },
  purple: {
    headerBg: "bg-purple-500/20",
    headerText: "text-purple-700 dark:text-purple-300",
    border: "border-t-purple-500",
    bg: "bg-purple-500/5",
  },
  pink: {
    headerBg: "bg-pink-500/20",
    headerText: "text-pink-700 dark:text-pink-300",
    border: "border-t-pink-500",
    bg: "bg-pink-500/5",
  },
  orange: {
    headerBg: "bg-orange-500/20",
    headerText: "text-orange-700 dark:text-orange-300",
    border: "border-t-orange-500",
    bg: "bg-orange-500/5",
  },
};

export function CommentNode({
  id,
  data,
  selected,
}: NodeProps & { data: CommentNodeData }) {
  const { updateNodeData } = useReactFlow();
  const theme = COMMENT_COLORS[data.color] || COMMENT_COLORS.gray;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(data.label);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescValue, setEditDescValue] = useState(data.description || "");

  const handleTitleSubmit = () => {
    updateNodeData(id, { label: editTitleValue });
    setIsEditingTitle(false);
  };

  const handleDescSubmit = () => {
    updateNodeData(id, { description: editDescValue });
    setIsEditingDesc(false);
  };

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={100}
        isVisible={selected}
        lineClassName="!border-primary/50"
        handleClassName="!bg-primary/80 !size-2.5 !rounded-sm"
      />
      <div
        className={cn(
          "size-full rounded-lg border border-t-[3px] overflow-hidden",
          theme.border,
          "border-border/40",
          theme.bg,
          selected && "ring-2 ring-primary/30"
        )}
      >
        {/* Header bar */}
        <div
          className={cn(
            "flex items-start gap-2 px-3 py-2 border-b border-border/30",
            theme.headerBg
          )}
        >
          <MessageSquare className={cn("size-4 mt-0.5 shrink-0", theme.headerText)} />
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                autoFocus
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") {
                    setEditTitleValue(data.label);
                    setIsEditingTitle(false);
                  }
                }}
                className={cn(
                  "nodrag w-full bg-transparent border-none outline-none text-sm font-medium",
                  theme.headerText
                )}
              />
            ) : (
              <div
                onClick={() => {
                  setEditTitleValue(data.label);
                  setIsEditingTitle(true);
                }}
                className={cn(
                  "text-sm font-medium cursor-text hover:bg-background/20 rounded px-1 -mx-1 truncate",
                  theme.headerText
                )}
              >
                {data.label || "Untitled Comment"}
              </div>
            )}
            {/* Description */}
            {isEditingDesc ? (
              <textarea
                autoFocus
                value={editDescValue}
                onChange={(e) => setEditDescValue(e.target.value)}
                onBlur={handleDescSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditDescValue(data.description || "");
                    setIsEditingDesc(false);
                  }
                }}
                placeholder="Add description..."
                className="nodrag w-full bg-transparent border-none outline-none text-xs mt-1 resize-none opacity-70"
                rows={2}
              />
            ) : (
              <div
                onClick={() => {
                  setEditDescValue(data.description || "");
                  setIsEditingDesc(true);
                }}
                className="text-xs mt-1 opacity-70 cursor-text hover:bg-background/20 rounded px-1 -mx-1 line-clamp-2"
              >
                {data.description || "Add description..."}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
