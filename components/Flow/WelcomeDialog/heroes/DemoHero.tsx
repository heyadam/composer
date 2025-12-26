"use client";

import { useState } from "react";
import { ReactFlow } from "@xyflow/react";
import { Check, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { nodeTypes } from "../../nodes";
import { edgeTypes } from "../../edges/ColoredEdge";
import { useDemoExecution } from "../hooks/useDemoExecution";
import { HeroPanel } from "./HeroPanel";
import { DemoOutputsModal } from "./DemoOutputsModal";

/**
 * Interactive React Flow demo that executes on mount.
 * Shows a story generation flow with live progress and output viewing.
 */
export function DemoHero() {
  const { nodes, edges, isRunning, progressLabel, outputs, retry } = useDemoExecution();
  const [showOutputs, setShowOutputs] = useState(false);

  return (
    <HeroPanel>
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <div className="absolute inset-x-0 -top-12 h-[calc(100%+48px)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.15, minZoom: 0.1, maxZoom: 0.65 }}
            minZoom={0.1}
            maxZoom={1.0}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            panOnScroll={false}
            panOnDrag={false}
          />
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 z-30 w-[300px] -translate-x-1/2">
        {isRunning ? (
          <div className="glass-panel-subtle pointer-events-none rounded-xl border border-white/10 bg-zinc-900/60 p-4 shadow-xl backdrop-blur-md">
            <p className="text-xs leading-relaxed text-zinc-400">
              Takes a prompt, generates a short story, then illustrates a key scene.
            </p>
            <hr className="glass-divider my-3 opacity-20" />
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase leading-none tracking-wider text-zinc-500">
              <span>Composer Agent</span>
              <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
            </div>
            <Shimmer className="text-sm font-medium text-white" duration={1.5}>
              {progressLabel}
            </Shimmer>
          </div>
        ) : (
          <div className="glass-panel-subtle rounded-xl border border-white/10 bg-zinc-900/60 p-4 shadow-xl backdrop-blur-md">
            <p className="text-xs leading-relaxed text-zinc-400">
              Takes a prompt, generates a short story, then illustrates a key scene.
            </p>
            <hr className="glass-divider my-3 opacity-20" />
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase leading-none tracking-wider text-zinc-500">
              <span>Composer Agent</span>
              <Check className="h-2.5 w-2.5 text-green-400" />
              <RotateCcw
                className="h-2.5 w-2.5 cursor-pointer text-zinc-400 transition-colors hover:text-white"
                onClick={retry}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowOutputs(true)}
              className="group flex cursor-pointer items-center gap-1.5 text-sm font-medium text-white transition-colors hover:text-white/80"
            >
              View outputs
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>

      {showOutputs && (
        <DemoOutputsModal
          prompt={outputs.prompt}
          story={outputs.story}
          image={outputs.image}
          onClose={() => setShowOutputs(false)}
        />
      )}
    </HeroPanel>
  );
}
