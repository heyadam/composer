"use client";

import { type ReactNode } from "react";
import { MessageSquarePlus } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FlowContextMenuProps {
  children: ReactNode;
  hasSelection: boolean;
  onCommentAround: () => void;
}

export function FlowContextMenu({
  children,
  hasSelection,
  onCommentAround,
}: FlowContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56 bg-neutral-900 border-neutral-700">
        <ContextMenuItem
          onClick={onCommentAround}
          disabled={!hasSelection}
          className="gap-2"
        >
          <MessageSquarePlus className="size-4" />
          Comment Around...
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
