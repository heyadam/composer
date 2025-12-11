"use client";

import { nodeDefinitions, type NodeType } from "@/types/flow";
import { Play, Square, MessageSquare, Wrench, GitBranch } from "lucide-react";
import type { DragEvent } from "react";

const iconMap = {
  input: Play,
  output: Square,
  prompt: MessageSquare,
  tool: Wrench,
  condition: GitBranch,
};

export function NodeSidebar() {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-72 h-screen shrink-0 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="p-4 border-b">
        <div className="text-sm font-semibold">Node Palette</div>
        <div className="text-xs text-muted-foreground mt-1">Drag nodes onto the canvas.</div>
      </div>

      <div className="p-3 space-y-2 overflow-y-auto h-[calc(100vh-65px)]">
        {nodeDefinitions.map((node) => {
          const Icon = iconMap[node.type];
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="group flex items-center gap-3 p-3 border rounded-xl cursor-grab hover:bg-muted/40 hover:border-border/70 transition-colors active:cursor-grabbing"
            >
              <div className={`p-2 ${node.color} rounded-lg border border-border/60`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{node.label}</p>
                <p className="text-xs text-muted-foreground truncate">{node.description}</p>
              </div>
              <div className="text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                Drag
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
