"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Globe,
  Key,
} from "lucide-react";
import { getUserKeysStatus, updatePublishSettings } from "@/lib/flows/api";
import { useAuth } from "@/lib/auth";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string | null;
  flowName: string;
  /** Flow's live_id (always populated for saved flows) */
  liveId?: string | null;
  /** Flow's share_token (always populated for saved flows) */
  shareToken?: string | null;
  /** Current owner-funded execution setting */
  useOwnerKeys?: boolean;
  /** Callback when owner keys setting changes */
  onOwnerKeysChange?: (enabled: boolean) => void;
  /** Callback to save the flow (for unsaved flows) */
  onSaveFlow?: (name: string) => Promise<string | null>;
  /** True while flow is being saved */
  isSaving?: boolean;
}

export function ShareDialog({
  open,
  onOpenChange,
  flowId,
  flowName,
  liveId,
  shareToken,
  useOwnerKeys: initialUseOwnerKeys = false,
  onOwnerKeysChange,
  onSaveFlow,
  isSaving = false,
}: ShareDialogProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save flow state (for when flow is not saved yet)
  const [saveName, setSaveName] = useState(flowName || "My Flow");

  // Owner-funded execution state
  const [useOwnerKeys, setUseOwnerKeys] = useState(initialUseOwnerKeys);
  const [hasStoredKeys, setHasStoredKeys] = useState(false);
  const [isLoadingKeyStatus, setIsLoadingKeyStatus] = useState(false);
  const [isTogglingOwnerKeys, setIsTogglingOwnerKeys] = useState(false);

  // Reset state when dialog opens with new props
  useEffect(() => {
    if (open) {
      setUseOwnerKeys(initialUseOwnerKeys);
      setSaveName(flowName || "My Flow");
      setError(null);
    }
  }, [open, initialUseOwnerKeys, flowName]);

  // Fetch owner key status when dialog opens with a saved flow
  useEffect(() => {
    if (open && flowId) {
      setIsLoadingKeyStatus(true);
      getUserKeysStatus()
        .then((status) => {
          const hasKeys = !!(
            status.hasOpenai ||
            status.hasGoogle ||
            status.hasAnthropic
          );
          setHasStoredKeys(hasKeys);
        })
        .finally(() => setIsLoadingKeyStatus(false));
    }
  }, [open, flowId]);

  // Build share URL using new /f/ format
  const shareUrl =
    liveId && shareToken
      ? `${window.location.origin}/f/${liveId}/${shareToken}`
      : null;

  const handleCopy = async () => {
    if (!shareUrl) return;

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInNewTab = () => {
    if (!shareUrl) return;
    window.open(shareUrl, "_blank");
  };

  const handleToggleOwnerKeys = async (enabled: boolean) => {
    if (!flowId) return;

    setIsTogglingOwnerKeys(true);
    setError(null);

    try {
      const result = await updatePublishSettings(flowId, {
        useOwnerKeys: enabled,
      });
      if (result.success) {
        setUseOwnerKeys(enabled);
        onOwnerKeysChange?.(enabled);
      } else {
        setError(result.error || "Failed to update owner keys setting");
      }
    } catch (err) {
      console.error("Failed to update owner keys setting:", err);
      setError("Failed to update setting");
    } finally {
      setIsTogglingOwnerKeys(false);
    }
  };

  const handleSaveFlow = async () => {
    if (!onSaveFlow || !saveName.trim()) return;

    setError(null);
    const savedFlowId = await onSaveFlow(saveName.trim());

    if (savedFlowId) {
      // Flow saved successfully - close dialog, user can reopen to see share URL
      onOpenChange(false);
    }
  };

  // Not signed in
  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Share Flow
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Sign in to share your flow with others.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-6">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
            <p className="text-center text-neutral-300">
              You need to be signed in to save and share flows.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Flow not saved yet - show save form
  if (!flowId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Share Flow
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Name your flow to save it and get a shareable link.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Flow Name</Label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && saveName.trim() && !isSaving) {
                    handleSaveFlow();
                  }
                }}
                placeholder="Enter a name for your flow..."
                className="bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500"
                autoFocus
                disabled={isSaving}
              />
            </div>

            <p className="text-sm text-neutral-400">
              Your flow will be saved to the cloud with a shareable link.
            </p>

            <Button
              onClick={handleSaveFlow}
              disabled={!saveName.trim() || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Save Flow
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Flow is saved - show share settings
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Share Flow
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Share &ldquo;{flowName}&rdquo; with collaborators
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Share URL */}
          {shareUrl ? (
            <div className="space-y-2">
              <Label className="text-neutral-300">Share URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  className="bg-neutral-800 border-neutral-600 text-neutral-200 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0 bg-neutral-800 border-neutral-600 hover:bg-neutral-700"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenInNewTab}
                  className="shrink-0 bg-neutral-800 border-neutral-600 hover:bg-neutral-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-400 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Share URL not available. Try refreshing the page.</span>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Anyone with this link can edit your flow, including prompts and
              settings. Only share with people you trust.
            </span>
          </div>

          {/* Owner-funded execution toggle */}
          <div className="space-y-3 pt-3 border-t border-neutral-700">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Owner-Funded Execution
                </Label>
                <p className="text-xs text-neutral-400 mt-1">
                  Use your API keys for collaborators&apos; executions
                </p>
              </div>
              <Switch
                checked={useOwnerKeys}
                onCheckedChange={handleToggleOwnerKeys}
                disabled={
                  !hasStoredKeys || isLoadingKeyStatus || isTogglingOwnerKeys
                }
              />
            </div>
            {!hasStoredKeys && !isLoadingKeyStatus && (
              <p className="text-xs text-amber-400">
                Store your API keys in Settings to enable this feature
              </p>
            )}
            {isLoadingKeyStatus && (
              <p className="text-xs text-neutral-500">
                Checking stored keys...
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
