"use client";

import { useState } from "react";
import { NodeProps, NodeResizer, useReactFlow } from "@xyflow/react";
import { MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommentNodeData, CommentColor } from "@/types/flow";
import { useCommentEdit } from "../CommentEditContext";

// Map comment colors to CSS classes
const COMMENT_COLOR_CLASS: Record<CommentColor, string> = {
  gray: "node-comment-gray",
  blue: "node-comment-blue",
  green: "node-comment-green",
  yellow: "node-comment-yellow",
  purple: "node-comment-purple",
  pink: "node-comment-pink",
  orange: "node-comment-orange",
};

export function CommentNode({
  id,
  data,
  selected,
}: NodeProps & { data: CommentNodeData }) {
  const { updateNodeData } = useReactFlow();
  const { markUserEdited } = useCommentEdit();
  const colorClass = COMMENT_COLOR_CLASS[data.color] || COMMENT_COLOR_CLASS.gray;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(data.label);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescValue, setEditDescValue] = useState(data.description || "");

  // Cancel AI generation when user starts editing
  const handleStartEditTitle = () => {
    markUserEdited(id);
    setEditTitleValue(data.label);
    setIsEditingTitle(true);
  };

  const handleStartEditDesc = () => {
    markUserEdited(id);
    setEditDescValue(data.description || "");
    setIsEditingDesc(true);
  };

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
          "node-comment size-full",
          colorClass,
          selected && "ring-2 ring-primary/30"
        )}
      >
        {/* Header bar */}
        <div className="node-comment-header">
          {data.isGenerating ? (
            <Loader2 className="node-comment-icon animate-spin" />
          ) : (
            <MessageSquare className="node-comment-icon" />
          )}
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
                className="nodrag node-comment-title w-full bg-transparent border-none outline-none"
              />
            ) : (
              <div
                onClick={handleStartEditTitle}
                className="node-comment-title"
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
                className="nodrag node-comment-description w-full bg-transparent border-none outline-none mt-1 resize-none"
                rows={2}
              />
            ) : (
              <div
                onClick={handleStartEditDesc}
                className="node-comment-description"
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
