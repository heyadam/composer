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

interface SaveFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  defaultName?: string;
}

function SaveFlowDialogContent({
  onSave,
  onClose,
  defaultName,
}: {
  onSave: (name: string) => void;
  onClose: () => void;
  defaultName: string;
}) {
  const [name, setName] = useState(defaultName);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onSave(trimmedName);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      handleSave();
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-700 text-white">
      <DialogHeader>
        <DialogTitle>Save Flow</DialogTitle>
        <DialogDescription className="text-neutral-400">
          Enter a name for your flow. It will be saved as a JSON file.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium text-neutral-300">
            Flow Name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="My Flow"
            className="bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500 focus:border-neutral-500"
            autoFocus
          />
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
          onClick={handleSave}
          disabled={!name.trim()}
          className="bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
        >
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function SaveFlowDialog({
  open,
  onOpenChange,
  onSave,
  defaultName = "My Flow",
}: SaveFlowDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Use key to reset internal state when dialog opens */}
      {open && (
        <SaveFlowDialogContent
          key={defaultName}
          onSave={onSave}
          onClose={() => onOpenChange(false)}
          defaultName={defaultName}
        />
      )}
    </Dialog>
  );
}
