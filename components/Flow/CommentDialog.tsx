"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CommentColor } from "@/types/flow";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS: { value: CommentColor; label: string; className: string }[] = [
  { value: "gray", label: "Gray", className: "bg-gray-500" },
  { value: "blue", label: "Blue", className: "bg-blue-500" },
  { value: "green", label: "Green", className: "bg-green-500" },
  { value: "yellow", label: "Yellow", className: "bg-yellow-500" },
  { value: "purple", label: "Purple", className: "bg-purple-500" },
  { value: "pink", label: "Pink", className: "bg-pink-500" },
  { value: "orange", label: "Orange", className: "bg-orange-500" },
];

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: { title: string; description: string; color: CommentColor }) => void;
}

function CommentDialogContent({
  onSubmit,
  onClose,
}: {
  onSubmit: (config: { title: string; description: string; color: CommentColor }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<CommentColor>("gray");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), color });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && title.trim()) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-700 text-white">
      <DialogHeader>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogDescription className="text-neutral-400">
          Wrap selected nodes in a comment box
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <label htmlFor="comment-title" className="text-sm font-medium text-neutral-300">
            Title
          </label>
          <Input
            id="comment-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter title..."
            className="bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500 focus:border-neutral-500"
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="comment-desc" className="text-sm font-medium text-neutral-300">
            Description
          </label>
          <Textarea
            id="comment-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description..."
            className="bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500 focus:border-neutral-500 resize-none"
            rows={3}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-neutral-300">Color</label>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                className={cn(
                  "size-8 rounded-full transition-all",
                  opt.className,
                  color === opt.value
                    ? "ring-2 ring-offset-2 ring-offset-neutral-900 ring-white scale-110"
                    : "opacity-60 hover:opacity-100"
                )}
                title={opt.label}
              />
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-neutral-400 hover:text-white hover:bg-neutral-800"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Create Comment
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function CommentDialog({
  open,
  onOpenChange,
  onSubmit,
}: CommentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CommentDialogContent
          onSubmit={onSubmit}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}
