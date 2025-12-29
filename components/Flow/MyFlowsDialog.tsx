"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, Loader2, Trash2, FolderOpen, RefreshCw, X, Search, AlertTriangle } from "lucide-react";
import { listFlows, deleteFlow } from "@/lib/flows/api";
import type { FlowListItem } from "@/lib/flows/types";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface MyFlowsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadFlow: (flowId: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

function MyFlowsDialogContent({
  onLoadFlow,
  onClose,
}: {
  onLoadFlow: (flowId: string) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Filter flows by search query
  const filteredFlows = flows.filter((flow) =>
    flow.name.toLowerCase().includes(search.toLowerCase())
  );

  const fetchFlows = async () => {
    setIsLoading(true);
    setError(null);
    const result = await listFlows();
    if (result.success && result.flows) {
      setFlows(result.flows);
    } else {
      setError(result.error || "Failed to load flows");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchFlows();
    }
  }, [user]);

  const handleDelete = async (flowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) return;

    if (!confirm("Are you sure you want to delete this flow?")) {
      return;
    }

    setDeletingId(flowId);
    const result = await deleteFlow(flowId);
    if (result.success) {
      setFlows((prev) => prev.filter((f) => f.id !== flowId));
    } else {
      alert(result.error || "Failed to delete flow");
    }
    setDeletingId(null);
  };

  const handleLoad = async (flowId: string) => {
    if (loadingId) return;
    setLoadingId(flowId);
    onLoadFlow(flowId);
  };

  const handleDeleteAll = async () => {
    if (isDeletingAll || flows.length === 0) return;

    setIsDeletingAll(true);
    let failedCount = 0;

    for (const flow of flows) {
      const result = await deleteFlow(flow.id);
      if (!result.success) {
        failedCount++;
      }
    }

    if (failedCount > 0) {
      alert(`Failed to delete ${failedCount} flow(s)`);
    }

    setFlows([]);
    setShowDeleteAllConfirm(false);
    setIsDeletingAll(false);
    setSearch("");
  };

  // Not signed in state
  if (!user) {
    return (
      <DialogContent
        showCloseButton={false}
        overlayClassName="glass-backdrop"
        className="glass-panel sm:max-w-[480px] p-0 gap-0"
      >
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Cloud className="w-5 h-5 text-purple-400" />
              My Flows
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="px-6 pb-8 pt-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10">
            <Cloud className="w-8 h-8 text-zinc-500" />
          </div>
          <p className="text-zinc-400 text-sm">
            Sign in with Google to save and load flows from the cloud
          </p>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent
      showCloseButton={false}
      overlayClassName="glass-backdrop"
      className="glass-panel sm:max-w-[480px] p-0 gap-0"
    >
      <div className="relative">
      {/* Header */}
      <DialogHeader className="p-6 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Cloud className="w-5 h-5 text-purple-400" />
            My Flows
          </DialogTitle>
          <div className="flex items-center gap-2">
            {!isLoading && !error && flows.length > 0 && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowDeleteAllConfirm(true)}
                      className="rounded-full border border-white/10 bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 hover:border-red-500/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-zinc-900 text-zinc-300 border border-white/10">
                    Delete all flows
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={fetchFlows}
                      className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-zinc-900 text-zinc-300 border border-white/10">
                    Refresh
                  </TooltipContent>
                </Tooltip>
              </>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mt-1">Your saved flows in the cloud</p>
      </DialogHeader>

      {/* Search - only show when there are flows */}
      {!isLoading && !error && flows.length > 0 && (
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flows..."
              className={cn(
                "w-full pl-9 pr-3 py-2 rounded-lg text-sm",
                "bg-white/5 border border-white/10",
                "text-white placeholder:text-zinc-500",
                "focus:outline-none focus:border-white/20 focus:bg-white/[0.07]",
                "transition-colors"
              )}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="min-h-[200px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-3" />
            <p className="text-sm text-zinc-500">Loading flows...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <Cloud className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <Button
              variant="ghost"
              onClick={fetchFlows}
              className="text-zinc-400 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          </div>
        ) : flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10">
              <FolderOpen className="w-8 h-8 text-zinc-500" />
            </div>
            <p className="text-zinc-300 font-medium">No saved flows yet</p>
            <p className="text-sm text-zinc-500 mt-1">Save a flow to see it here</p>
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10">
              <Search className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-zinc-400 text-sm">No flows matching &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto p-2">
            {filteredFlows.map((flow) => (
              <div
                key={flow.id}
                role="button"
                tabIndex={loadingId || deletingId ? -1 : 0}
                onClick={() => !loadingId && !deletingId && handleLoad(flow.id)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !loadingId && !deletingId) {
                    e.preventDefault();
                    handleLoad(flow.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all group text-left cursor-pointer",
                  "hover:bg-white/5",
                  (loadingId || deletingId) && "opacity-50 pointer-events-none"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate flex items-center gap-2">
                    {flow.name}
                    {flow.name.startsWith("Draft -") && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {formatDate(flow.updated_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {loadingId === flow.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  ) : deletingId === flow.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(flow.id, e)}
                      disabled={!!deletingId}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        "text-zinc-600 hover:text-red-400",
                        "hover:bg-red-500/10",
                        "opacity-0 group-hover:opacity-100"
                      )}
                      title="Delete flow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end px-6 py-4 border-t border-white/10">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-zinc-400 hover:text-white hover:bg-white/10"
        >
          Close
        </Button>
      </div>

      {/* Delete All Confirmation Overlay - positioned over entire dialog */}
      {showDeleteAllConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm rounded-xl">
          <div className="text-center px-8 max-w-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Delete all flows?</h3>
            <p className="text-sm text-zinc-400 mb-6">
              This will permanently delete {flows.length} flow{flows.length !== 1 ? "s" : ""}. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteAllConfirm(false)}
                disabled={isDeletingAll}
                className="text-zinc-400 hover:text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAll}
                disabled={isDeletingAll}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete All"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DialogContent>
  );
}

export function MyFlowsDialog({
  open,
  onOpenChange,
  onLoadFlow,
}: MyFlowsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <MyFlowsDialogContent
          onLoadFlow={(flowId) => {
            onLoadFlow(flowId);
            onOpenChange(false);
          }}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}
