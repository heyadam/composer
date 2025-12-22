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
import { Cloud, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

export type SaveMode = "cloud" | "download";

interface SaveFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, mode: SaveMode) => void | Promise<void>;
  defaultName?: string;
  isSaving?: boolean;
  existingFlowId?: string | null;
}

function SaveFlowDialogContent({
  onSave,
  onClose,
  defaultName,
  isSaving,
  isAuthenticated,
  existingFlowId,
}: {
  onSave: (name: string, mode: SaveMode) => void | Promise<void>;
  onClose: () => void;
  defaultName: string;
  isSaving: boolean;
  isAuthenticated: boolean;
  existingFlowId?: string | null;
}) {
  const [name, setName] = useState(defaultName);
  const [mode, setMode] = useState<SaveMode>(isAuthenticated ? "cloud" : "download");

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName && !isSaving) {
      await onSave(trimmedName, mode);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim() && !isSaving) {
      handleSave();
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-700 text-white">
      <DialogHeader>
        <DialogTitle>Save Flow</DialogTitle>
        <DialogDescription className="text-neutral-400">
          {existingFlowId && mode === "cloud"
            ? "Update your saved flow or save as a new file"
            : "Choose a name and where to save your flow"}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium text-neutral-300">
            Name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter name..."
            className="bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500 focus:border-neutral-500"
            autoFocus
            disabled={isSaving}
          />
        </div>

        {/* Save mode toggle */}
        <div className="grid gap-2">
          <label className="text-sm font-medium text-neutral-300">
            Save to
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => isAuthenticated && setMode("cloud")}
              disabled={!isAuthenticated || isSaving}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border transition-colors ${
                mode === "cloud"
                  ? "bg-purple-600/20 border-purple-500 text-purple-300"
                  : isAuthenticated
                  ? "bg-neutral-800 border-neutral-600 text-neutral-400 hover:border-neutral-500"
                  : "bg-neutral-800/50 border-neutral-700 text-neutral-500 cursor-not-allowed"
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span className="text-sm font-medium">Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("download")}
              disabled={isSaving}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border transition-colors ${
                mode === "download"
                  ? "bg-green-600/20 border-green-500 text-green-300"
                  : "bg-neutral-800 border-neutral-600 text-neutral-400 hover:border-neutral-500"
              }`}
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Download</span>
            </button>
          </div>
          {!isAuthenticated && (
            <p className="text-xs text-neutral-500">
              Sign in to save flows to the cloud
            </p>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={isSaving}
          className="text-neutral-400 hover:text-white hover:bg-neutral-800"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className={`text-white disabled:opacity-50 ${
            mode === "cloud"
              ? "bg-purple-600 hover:bg-purple-500"
              : "bg-green-600 hover:bg-green-500"
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : mode === "cloud" ? (
            existingFlowId ? "Update" : "Save to Cloud"
          ) : (
            "Download"
          )}
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
  isSaving = false,
  existingFlowId,
}: SaveFlowDialogProps) {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Use key to reset internal state when dialog opens */}
      {open && (
        <SaveFlowDialogContent
          key={defaultName}
          onSave={onSave}
          onClose={() => onOpenChange(false)}
          defaultName={defaultName}
          isSaving={isSaving}
          isAuthenticated={isAuthenticated}
          existingFlowId={existingFlowId}
        />
      )}
    </Dialog>
  );
}
