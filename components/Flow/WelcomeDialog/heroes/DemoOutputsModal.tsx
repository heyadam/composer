"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { isImageOutput, parseImageOutput, getImageDataUrl } from "@/lib/image-utils";

interface DemoOutputsModalProps {
  prompt: string | undefined;
  story: string | undefined;
  image: string | undefined;
  onClose: () => void;
}

export function DemoOutputsModal({ prompt, story, image, onClose }: DemoOutputsModalProps) {
  const renderImage = () => {
    if (image && isImageOutput(image)) {
      const imageData = parseImageOutput(image);
      if (imageData) {
        return (
          <img
            src={getImageDataUrl(imageData)}
            alt="Generated illustration"
            className="h-auto w-full"
          />
        );
      }
    }
    return (
      <div className="p-3 text-sm text-muted-foreground">
        No image generated
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass-panel relative m-4 flex max-h-[90%] w-full max-w-lg flex-col rounded-xl border border-white/10 bg-zinc-950/90 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="glass-divider flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-white">Flow Outputs</h3>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="cursor-pointer rounded-full text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="text-xs text-zinc-500">Composer Agent</div>

            {/* Input Prompt */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Prompt
              </div>
              <div className="rounded-lg border border-white/5 bg-white/5 p-3 text-sm text-zinc-200">
                {prompt || "No prompt"}
              </div>
            </div>

            {/* Generated Story */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Story
              </div>
              <div className="whitespace-pre-wrap rounded-lg border border-white/5 bg-white/5 p-3 text-sm text-zinc-200">
                {story || "No story generated"}
              </div>
            </div>

            {/* Generated Image */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Illustration
              </div>
              <div className="overflow-hidden rounded-lg border border-white/5 bg-white/5">
                {renderImage()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
