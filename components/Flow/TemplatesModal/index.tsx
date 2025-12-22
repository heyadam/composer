"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TemplateCard } from "./TemplateCard";
import { templates, type TemplateDefinition } from "./templates";
import type { SavedFlow } from "@/lib/flow-storage/types";

interface TemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (flow: SavedFlow) => void;
  onDismiss: () => void;
  onDismissPermanently: () => void;
}

function TemplatesModalContent({
  open,
  onSelectTemplate,
  onDismiss,
  onDismissPermanently,
  onClose,
}: {
  open: boolean;
  onSelectTemplate: (flow: SavedFlow) => void;
  onDismiss: () => void;
  onDismissPermanently: () => void;
  onClose: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Reset checkbox state when dialog opens
  useEffect(() => {
    if (open) {
      // Safe: resetting local UI state when dialog opens
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDontShowAgain(false);
    }
  }, [open]);

  const handleSelect = (template: TemplateDefinition) => {
    if (dontShowAgain) {
      onDismissPermanently();
    }
    onSelectTemplate(template.flow);
    onClose();
  };

  const handleDismiss = () => {
    if (dontShowAgain) {
      onDismissPermanently();
    }
    onDismiss();
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Choose a template</DialogTitle>
        <DialogDescription>
          Start with a pre-built flow or begin with a blank canvas
        </DialogDescription>
      </DialogHeader>

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
      <div className="flex items-center justify-between pt-2 border-t">
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
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          Start blank
        </Button>
      </div>
    </DialogContent>
  );
}

export function TemplatesModal({
  open,
  onOpenChange,
  onSelectTemplate,
  onDismiss,
  onDismissPermanently,
}: TemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <TemplatesModalContent
        open={open}
        onSelectTemplate={onSelectTemplate}
        onDismiss={onDismiss}
        onDismissPermanently={onDismissPermanently}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
