"use client";

import { nodeDefinitions, type NodeType } from "@/types/flow";
import { Keyboard, Square, MessageSquare, ImageIcon, X } from "lucide-react";
import type { DragEvent } from "react";
import { Button } from "@/components/ui/button";

const iconMap = {
  input: Keyboard,
  output: Square,
  prompt: MessageSquare,
  image: ImageIcon,
};

interface NodeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NodeSidebar({ isOpen, onClose }: NodeSidebarProps) {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside
      className={`absolute top-4 left-4 z-10 w-64 border border-neutral-700 rounded-xl bg-neutral-800/95 backdrop-blur shadow-lg transition-all duration-200 ${
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
    >
      <div className="p-3 border-b border-neutral-700 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Node Palette</div>
          <div className="text-xs text-neutral-400 mt-0.5">Drag nodes onto the canvas</div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="text-neutral-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
        {nodeDefinitions.map((node) => {
          const Icon = iconMap[node.type];
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="group flex items-center gap-3 p-2.5 border border-neutral-700 rounded-lg cursor-grab hover:bg-neutral-700/50 hover:border-neutral-600 transition-colors active:cursor-grabbing"
            >
              <div className={`p-1.5 ${node.color} rounded-md border border-neutral-600`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{node.label}</p>
                <p className="text-[11px] text-neutral-400 truncate">{node.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
