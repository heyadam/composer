"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, X, AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
} from "@/components/ai-elements/context";
import type { AutopilotUsage, AutopilotModel } from "@/lib/autopilot/types";

/** Claude model context window sizes */
const MODEL_CONTEXT_WINDOWS: Record<AutopilotModel, number> = {
  "sonnet-4-5": 200_000,
  "opus-4-5": 200_000,
};

/** Map autopilot model IDs to tokenlens model IDs for cost calculation */
const MODEL_ID_MAP: Record<AutopilotModel, string> = {
  "sonnet-4-5": "anthropic:claude-sonnet-4-5-20250514",
  "opus-4-5": "anthropic:claude-opus-4-20250514",
};

interface AutopilotHeaderProps {
  onClear: () => void;
  onClose: () => void;
  onCopy: () => void;
  hasMessages: boolean;
  testModeEnabled?: boolean;
  onTestModeChange?: (enabled: boolean) => void;
  usage?: AutopilotUsage;
  selectedModel?: AutopilotModel;
}

export function AutopilotHeader({
  onClear,
  onClose,
  onCopy,
  hasMessages,
  testModeEnabled,
  onTestModeChange,
  usage,
  selectedModel = "sonnet-4-5",
}: AutopilotHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maxTokens = MODEL_CONTEXT_WINDOWS[selectedModel];
  const modelId = MODEL_ID_MAP[selectedModel];
  const usedTokens = usage?.totalTokens ?? 0;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b glass-divider bg-transparent">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="font-medium text-sm">Composer AI</span>
        {usedTokens > 0 && (
          <Context
            maxTokens={maxTokens}
            usedTokens={usedTokens}
            modelId={modelId}
            usage={{
              inputTokens: usage?.inputTokens ?? 0,
              outputTokens: usage?.outputTokens ?? 0,
              totalTokens: usage?.totalTokens ?? 0,
              reasoningTokens: usage?.reasoningTokens ?? 0,
              cachedInputTokens: usage?.cachedInputTokens ?? 0,
            }}
          >
            <ContextTrigger className="h-6 px-2 text-xs gap-1.5" />
            <ContextContent>
              <ContextContentHeader />
              <ContextContentBody className="space-y-1">
                <ContextInputUsage />
                <ContextOutputUsage />
                <ContextReasoningUsage />
                <ContextCacheUsage />
              </ContextContentBody>
              <ContextContentFooter />
            </ContextContent>
          </Context>
        )}
        {process.env.NEXT_PUBLIC_DEV_MODE === "true" && onTestModeChange && (
          <Button
            variant="ghost"
            size="sm"
            className={`h-5 px-1.5 text-[10px] gap-1 ${
              testModeEnabled
                ? "text-orange-600 hover:text-orange-700 bg-orange-100 dark:bg-orange-950/30"
                : "text-muted-foreground hover:text-foreground hover:bg-white/10"
            }`}
            onClick={() => onTestModeChange(!testModeEnabled)}
            title={testModeEnabled ? "Disable test mode (bad JSON)" : "Enable test mode (bad JSON)"}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Test</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {hasMessages && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-white/10"
              onClick={handleCopy}
              title="Copy transcript"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-white/10"
              onClick={onClear}
              title="Clear"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-white/10"
          onClick={onClose}
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
