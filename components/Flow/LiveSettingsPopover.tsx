"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Users,
} from "lucide-react";
import {
  unpublishFlow,
  getUserKeysStatus,
  updatePublishSettings,
} from "@/lib/flows/api";

interface LiveSettingsPopoverProps {
  flowId?: string;
  liveId: string;
  shareToken: string;
  useOwnerKeys: boolean;
  isOwner: boolean;
  collaboratorCount: number;
  onUnpublish?: () => void;
  onOwnerKeysChange?: (enabled: boolean) => void;
  onDisconnect?: () => void;
  disconnectLabel?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LiveSettingsPopover({
  flowId,
  liveId,
  shareToken,
  useOwnerKeys: initialUseOwnerKeys,
  isOwner,
  collaboratorCount,
  onUnpublish,
  onOwnerKeysChange,
  onDisconnect,
  disconnectLabel = "Disconnect and start fresh",
  children,
  open,
  onOpenChange,
}: LiveSettingsPopoverProps) {
  const [copied, setCopied] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Owner-funded execution state
  const [useOwnerKeys, setUseOwnerKeys] = useState(initialUseOwnerKeys);
  const [hasStoredKeys, setHasStoredKeys] = useState(false);
  const [isLoadingKeyStatus, setIsLoadingKeyStatus] = useState(false);
  const [isTogglingOwnerKeys, setIsTogglingOwnerKeys] = useState(false);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${liveId}/${shareToken}`;

  // Fetch owner key status
  useEffect(() => {
    if (!isOwner) return;

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
  }, [isOwner]);

  // Sync with external state
  useEffect(() => {
    setUseOwnerKeys(initialUseOwnerKeys);
  }, [initialUseOwnerKeys]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInNewTab = () => {
    window.open(shareUrl, "_blank");
  };

  const handleUnpublish = async () => {
    if (!flowId) {
      setError("Missing flow ID for unpublish");
      return;
    }
    if (!onUnpublish) {
      setError("Unpublish is not available");
      return;
    }

    setIsUnpublishing(true);
    setError(null);

    const result = await unpublishFlow(flowId);

    if (result.success) {
      onUnpublish();
    } else {
      setError(result.error || "Failed to unpublish flow");
    }

    setIsUnpublishing(false);
  };

  const handleToggleOwnerKeys = async (enabled: boolean) => {
    if (!isOwner) return;
    if (!flowId) {
      setError("Missing flow ID for settings");
      return;
    }

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

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-neutral-900 border-neutral-700 text-white" align="start">
        <div className="space-y-4">
          {/* Header with collaborator count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium">Live</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <Users className="h-3 w-3" />
              <span>{collaboratorCount} collaborator{collaboratorCount !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-xs">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {error}
            </div>
          )}

          {/* Share URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">Share URL</Label>
            <div className="flex gap-1.5">
              <Input
                readOnly
                value={shareUrl}
                className="h-8 bg-neutral-800 border-neutral-600 text-neutral-200 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="h-8 w-8 shrink-0 bg-neutral-800 border-neutral-600 hover:bg-neutral-700"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenInNewTab}
                className="h-8 w-8 shrink-0 bg-neutral-800 border-neutral-600 hover:bg-neutral-700"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {onDisconnect && (
            <div className="pt-2 border-t border-neutral-700">
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                className="w-full h-8 text-xs"
              >
                {disconnectLabel}
              </Button>
            </div>
          )}

          {/* Owner-only settings */}
          {isOwner && (
            <>
              {/* Owner-funded execution toggle */}
              <div className="space-y-2 pt-2 border-t border-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Key className="h-3 w-3" />
                      Owner-Funded Execution
                    </Label>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Use your API keys for collaborators
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
                  <p className="text-[10px] text-amber-400">
                    Store your API keys in Settings to enable this
                  </p>
                )}
              </div>

              {/* Unpublish */}
              <div className="pt-2 border-t border-neutral-700">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleUnpublish}
                  disabled={isUnpublishing || !flowId || !onUnpublish}
                  className="w-full h-8 text-xs"
                >
                  {isUnpublishing ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      Unpublishing...
                    </>
                  ) : (
                    "Unpublish Flow"
                  )}
                </Button>
                <p className="text-[10px] text-neutral-500 mt-1.5 text-center">
                  This will revoke access for all collaborators
                </p>
              </div>
            </>
          )}

          {/* Non-owner view */}
          {!isOwner && (
            <div className="pt-2 border-t border-neutral-700">
              <p className="text-[10px] text-neutral-400 text-center">
                You are viewing this flow as a collaborator
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
