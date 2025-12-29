"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, Download, Loader2, X } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

export type SaveMode = "cloud" | "download";

interface SaveFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, mode: SaveMode) => void | Promise<void> | Promise<string | null>;
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
  onSave: (name: string, mode: SaveMode) => void | Promise<void> | Promise<string | null>;
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
    <DialogContent
      showCloseButton={false}
      overlayClassName="glass-backdrop"
      className="glass-panel sm:max-w-[420px] p-0 gap-0"
    >
      {/* Header */}
      <DialogHeader className="p-6 pb-0">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold">Save Flow</DialogTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-zinc-400 mt-1">
          {existingFlowId && mode === "cloud"
            ? "Update your saved flow or download as a file"
            : "Choose a name and where to save your flow"}
        </p>
      </DialogHeader>

      {/* Content */}
      <div className="p-6 space-y-5">
        {/* Name input */}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-zinc-300">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter flow name..."
            autoFocus
            disabled={isSaving}
            className={cn(
              "w-full px-3 py-2.5 rounded-lg text-sm",
              "bg-white/5 border border-white/10",
              "text-white placeholder:text-zinc-500",
              "focus:outline-none focus:border-white/20 focus:bg-white/[0.07]",
              "transition-colors",
              "disabled:opacity-50"
            )}
          />
        </div>

        {/* Save mode toggle */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Save to</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => isAuthenticated && setMode("cloud")}
              disabled={!isAuthenticated || isSaving}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all",
                mode === "cloud"
                  ? "bg-purple-500/15 border-purple-500/50 text-purple-300"
                  : isAuthenticated
                    ? "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
                    : "bg-white/[0.02] border-white/5 text-zinc-600 cursor-not-allowed"
              )}
            >
              <Cloud className="w-4 h-4" />
              <span className="text-sm font-medium">Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("download")}
              disabled={isSaving}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all",
                mode === "download"
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
              )}
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Download</span>
            </button>
          </div>
          {!isAuthenticated && (
            <p className="text-xs text-zinc-500">
              Sign in to save flows to the cloud
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/10">
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={isSaving}
          className="text-zinc-400 hover:text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className={cn(
            "text-white font-medium disabled:opacity-50",
            mode === "cloud"
              ? "bg-purple-600 hover:bg-purple-500"
              : "bg-emerald-600 hover:bg-emerald-500"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : mode === "cloud" ? (
            existingFlowId ? "Update" : "Save"
          ) : (
            "Download"
          )}
        </Button>
      </div>
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
