"use client";

import { useEffect, useRef } from "react";
import { nodeDefinitions, type NodeType } from "@/types/flow";
import { Keyboard, Square, MessageSquare, ImageIcon, Upload, Sparkles, MessageSquarePlus, Code, Mic, AudioWaveform, FileAudio } from "lucide-react";

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

interface NodeToolbarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (nodeType: NodeType) => void;
}

export function NodeToolbar({ isOpen, onClose, onAddNode }: NodeToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Ignore clicks on the toggle button (let it handle its own toggle)
      if (target.closest("[data-node-toolbar-toggle]")) {
        return;
      }

      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(target)
      ) {
        onClose();
      }
    };

    // Delay adding listener to avoid closing on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div
      ref={toolbarRef}
      className={`absolute bottom-24 left-1/2 -translate-x-1/2 z-20 transition-all duration-200 origin-bottom ${
        isOpen
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-2 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-1 p-1.5 rounded-full bg-neutral-900/95 backdrop-blur border border-neutral-700 shadow-lg">
        {nodeDefinitions.map((node) => {
          const Icon = iconMap[node.type];
          return (
            <button
              key={node.type}
              onClick={() => onAddNode(node.type)}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors whitespace-nowrap"
            >
              <Icon className={`h-4 w-4 shrink-0 ${node.color.split(' ').filter(c => c.startsWith('text-')).join(' ')}`} />
              <span className="text-xs font-medium">{node.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
