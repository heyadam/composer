"use client";

import { nodeDefinitions, type NodeType } from "@/types/flow";
import { Keyboard, Square, MessageSquare, ImageIcon, X, Upload, Sparkles, MessageSquarePlus, Code, Mic, AudioWaveform, FileAudio } from "lucide-react";
import type { DragEvent } from "react";
import { Button } from "@/components/ui/button";

const iconMap: Record<NodeType, typeof Keyboard> = {
  "text-input": Keyboard,
  "image-input": Upload,
  "audio-input": AudioWaveform,
  "preview-output": Square,
  "text-generation": MessageSquare,
  "image-generation": ImageIcon,
  "ai-logic": Sparkles,
  "comment": MessageSquarePlus,
  "react-component": Code,
  "realtime-conversation": Mic,
  "audio-transcription": FileAudio,
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
      className={`absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-56 border border-neutral-700 rounded-lg bg-neutral-800/95 backdrop-blur shadow-lg transition-all duration-200 origin-bottom ${
        isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2 pointer-events-none"
      }`}
    >
      <div className="px-2.5 py-2 border-b border-neutral-700 flex items-center justify-between">
        <div className="text-xs font-semibold text-white">Add Node</div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="text-neutral-400 hover:text-white h-5 w-5"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-1.5 space-y-0.5 max-h-[280px] overflow-y-auto">
        {nodeDefinitions.map((node) => {
          const Icon = iconMap[node.type];
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="group flex items-center gap-2 px-2 py-1.5 border border-neutral-700 rounded-md cursor-grab hover:bg-neutral-700/50 hover:border-neutral-600 transition-colors active:cursor-grabbing"
            >
              <div className={`p-1 ${node.color} rounded border border-neutral-600`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white">{node.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
