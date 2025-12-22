"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cloud, Loader2, Trash2, FolderOpen, RefreshCw } from "lucide-react";
import { listFlows, deleteFlow } from "@/lib/flows/api";
import type { FlowListItem } from "@/lib/flows/types";
import { useAuth } from "@/lib/auth/context";

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

  if (!user) {
    return (
      <DialogContent className="sm:max-w-[500px] bg-neutral-900 border-neutral-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            My Flows
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Sign in to access your saved flows
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 text-center text-neutral-500">
          <Cloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Sign in with Google to save and load flows from the cloud</p>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-[500px] bg-neutral-900 border-neutral-700 text-white">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          My Flows
        </DialogTitle>
        <DialogDescription className="text-neutral-400">
          Your saved flows in the cloud
        </DialogDescription>
      </DialogHeader>

      <div className="py-2">
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-neutral-500" />
            <p className="text-neutral-500">Loading flows...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-red-400 mb-3">{error}</p>
            <Button
              variant="ghost"
              onClick={fetchFlows}
              className="text-neutral-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          </div>
        ) : flows.length === 0 ? (
          <div className="py-8 text-center text-neutral-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No saved flows yet</p>
            <p className="text-sm mt-1">Save a flow to see it here</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {flows.map((flow) => (
              <div
                key={flow.id}
                onClick={() => !loadingId && !deletingId && handleLoad(flow.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-neutral-800 transition-colors group text-left cursor-pointer ${
                  loadingId || deletingId ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">
                    {flow.name}
                  </div>
                  <div className="text-xs text-neutral-500">
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
                      onClick={(e) => handleDelete(flow.id, e)}
                      disabled={!!deletingId}
                      className="p-1.5 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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

      <div className="flex justify-end pt-2 border-t border-neutral-800">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-neutral-400 hover:text-white hover:bg-neutral-800"
        >
          Close
        </Button>
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
