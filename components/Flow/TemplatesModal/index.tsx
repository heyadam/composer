"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { TemplateCard } from "./TemplateCard";
import { templates, type TemplateDefinition } from "./templates";
import type { SavedFlow } from "@/lib/flow-storage/types";

interface TemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (flow: SavedFlow) => void;
  onDismiss: () => void;
  onDismissPermanently: () => void;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
}

export function TemplatesModal({
  open,
  onOpenChange,
  onSelectTemplate,
  onDismiss,
  onDismissPermanently,
  canvasRef,
}: TemplatesModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset checkbox state when modal opens
  useEffect(() => {
    if (open) {
      // Safe: resetting local UI state when modal opens
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDontShowAgain(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      onDismissPermanently();
    }
    onDismiss();
    onOpenChange(false);
  }, [dontShowAgain, onDismiss, onDismissPermanently, onOpenChange]);

  // Handle clicks on the canvas (outside the panel but inside the canvas area)
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsidePanel = panelRef.current && !panelRef.current.contains(target);
      const isInsideCanvas = canvasRef?.current && canvasRef.current.contains(target);

      // Only dismiss if clicking inside the canvas area but outside the modal
      // This prevents dismissing when clicking on sidebars or other UI elements
      if (isOutsidePanel && isInsideCanvas) {
        handleClose();
      }
    };

    // Delay adding listener to avoid immediate trigger
    // Use capture phase (true) because React Flow stops propagation in bubble phase
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [open, handleClose, canvasRef]);

  const handleSelect = (template: TemplateDefinition) => {
    if (dontShowAgain) {
      onDismissPermanently();
    }
    onSelectTemplate(template.flow);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        ref={panelRef}
        className="pointer-events-auto bg-background border rounded-lg shadow-xl p-6 w-full max-w-2xl animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Choose a template</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Start with a pre-built flow or begin with a blank canvas
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 -mr-2 -mt-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Grid of template cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Footer with checkbox and dismiss button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <span className="text-sm text-muted-foreground">
              Don&apos;t show this again
            </span>
          </label>
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Start blank
          </Button>
        </div>
      </div>
    </div>
  );
}
