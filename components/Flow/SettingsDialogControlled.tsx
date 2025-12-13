"use client";

import { useState } from "react";
import { Eye, EyeOff, Check, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiKeys, type ProviderId } from "@/lib/api-keys";

const PROVIDERS: { id: ProviderId; label: string; placeholder: string }[] = [
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "google", label: "Google Gemini", placeholder: "AI..." },
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
];

interface SettingsDialogControlledProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialogControlled({
  open,
  onOpenChange,
}: SettingsDialogControlledProps) {
  const { keys, setKey, removeKey, isDevMode, getKeyStatuses } = useApiKeys();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const statuses = getKeyStatuses();
  const hasAnyKey = statuses.some((s) => s.hasKey);

  const handleSave = (provider: ProviderId) => {
    const value = editValues[provider];
    if (value?.trim()) {
      setKey(provider, value.trim());
      setEditValues((prev) => ({ ...prev, [provider]: "" }));
    }
  };

  const handleRemove = (provider: ProviderId) => {
    removeKey(provider);
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription>
            {!isDevMode && !hasAnyKey && (
              <span className="block mb-2 text-amber-500 font-medium">
                In order to use avy, you need to configure at least 1 API key.
              </span>
            )}
            Configure your API keys for AI providers.
            {isDevMode && (
              <span className="block mt-1 text-green-500">
                Development mode: Using keys from environment variables.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {PROVIDERS.map((provider) => {
            const status = statuses.find((s) => s.provider === provider.id);
            const hasKey = status?.hasKey ?? false;
            const currentKey = keys[provider.id];
            const editValue = editValues[provider.id] ?? "";
            const showKey = showKeys[provider.id];

            return (
              <div key={provider.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{provider.label}</label>
                  {hasKey ? (
                    <span className="flex items-center gap-1 text-xs text-green-500">
                      <Check className="h-3 w-3" />
                      Configured
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <AlertCircle className="h-3 w-3" />
                      Not configured
                    </span>
                  )}
                </div>

                {currentKey && !isDevMode ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={currentKey}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleShowKey(provider.id)}
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(provider.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : !isDevMode ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="password"
                      placeholder={provider.placeholder}
                      value={editValue}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [provider.id]: e.target.value,
                        }))
                      }
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSave(provider.id)}
                      disabled={!editValue.trim()}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Using environment variable
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {!isDevMode && (
          <p className="text-xs text-muted-foreground border-t pt-4">
            API keys are stored locally in your browser and never sent to our
            servers.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
