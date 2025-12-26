"use client";

import { useState } from "react";
import { Eye, EyeOff, Check, AlertCircle, X, RotateCcw, Lock, Unlock, LogOut, Trash2, RefreshCw } from "lucide-react";
import { BackgroundVariant } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiKeys, type ProviderId } from "@/lib/api-keys";
import { useBackgroundSettings, type GradientType, type ShimmerGradientType } from "@/lib/hooks/useBackgroundSettings";
import { useAuth } from "@/lib/auth";

const PROVIDERS: { id: ProviderId; label: string; placeholder: string }[] = [
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "google", label: "Google Gemini", placeholder: "AI..." },
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
];

const VARIANT_OPTIONS = [
  { value: BackgroundVariant.Dots, label: "Dots" },
  { value: BackgroundVariant.Lines, label: "Lines" },
  { value: BackgroundVariant.Cross, label: "Cross" },
];

const GRADIENT_TYPE_OPTIONS: { value: GradientType; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];

const SHIMMER_GRADIENT_OPTIONS: { value: ShimmerGradientType; label: string }[] = [
  { value: "radial", label: "Radial" },
  { value: "linear", label: "Linear" },
  { value: "pulse", label: "Pulse" },
];

interface SettingsDialogControlledProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialogControlled({
  open,
  onOpenChange,
}: SettingsDialogControlledProps) {
  const { keys, setKey, removeKey, isDevMode, getKeyStatuses, unlockWithPassword, isUnlocking } = useApiKeys();
  const { settings: bgSettings, updateSettings: updateBgSettings, resetSettings: resetBgSettings } = useBackgroundSettings();
  const { user, signOut } = useAuth();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

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

  const handleUnlock = async () => {
    if (!password.trim()) {
      setPasswordError("Enter a password");
      return;
    }
    setPasswordError("");
    const result = await unlockWithPassword(password.trim());
    if (result.success) {
      setPassword("");
    } else {
      setPasswordError(result.error || "Invalid password");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure API keys and appearance.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="reset">Reset</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4 pt-4">
            {/* Password unlock section */}
            {!isDevMode && !hasAnyKey && (
              <div className="space-y-2 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm font-medium">Unlock with password</label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnlock();
                      }
                    }}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnlock}
                    disabled={isUnlocking || !password.trim()}
                  >
                    {isUnlocking ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordError && (
                  <p className="text-xs text-red-500">{passwordError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Or add API keys manually below
                </p>
              </div>
            )}

            {!isDevMode && !hasAnyKey && !password && (
              <p className="text-sm text-amber-500 font-medium">
                Configure at least 1 API key to use Composer.
              </p>
            )}
            {isDevMode && (
              <p className="text-sm text-green-500">
                Development mode: Using keys from environment variables.
              </p>
            )}

            {PROVIDERS.map((provider) => {
              const status = statuses.find((s) => s.provider === provider.id);
              const hasKey = status?.hasKey ?? false;
              const currentKey = keys[provider.id];
              const editValue = editValues[provider.id] ?? "";
              const showKey = showKeys[provider.id];

              return (
                <div key={provider.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">{provider.label}</label>
                      {provider.id === "google" && (
                        <p className="text-xs text-muted-foreground">Required for image to image</p>
                      )}
                      {provider.id === "anthropic" && (
                        <p className="text-xs text-muted-foreground">Required for Composer AI</p>
                      )}
                    </div>
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

            <div className="text-xs text-muted-foreground border-t pt-4 space-y-2">
              {!isDevMode && (
                <p>API keys are stored locally in your browser.</p>
              )}
              <p>
                <a href="/privacy.html" target="_blank" className="underline hover:text-foreground">Privacy Policy</a>
                {" · "}
                <a href="/terms.html" target="_blank" className="underline hover:text-foreground">Terms of Service</a>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-5 pt-4">
            {/* Pattern Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pattern</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetBgSettings}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Style</label>
                  <Select
                    value={bgSettings.variant}
                    onValueChange={(value) => updateBgSettings({ variant: value as BackgroundVariant })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIANT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Size</label>
                  <Input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={bgSettings.size}
                    onChange={(e) => updateBgSettings({ size: parseFloat(e.target.value) || 1 })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Gap</label>
                  <Input
                    type="number"
                    min={5}
                    max={100}
                    value={bgSettings.gap}
                    onChange={(e) => updateBgSettings({ gap: parseInt(e.target.value) || 20 })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Color Settings */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Colors</label>

              {/* Gradient Type + Pattern Color */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Canvas type</label>
                  <Select
                    value={bgSettings.gradientType}
                    onValueChange={(value) => updateBgSettings({ gradientType: value as GradientType })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADIENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Pattern</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bgSettings.color}
                      onChange={(e) => updateBgSettings({ color: e.target.value })}
                      className="h-8 w-10 p-1 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={bgSettings.color}
                      onChange={(e) => updateBgSettings({ color: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Solid color */}
              {bgSettings.gradientType === "solid" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Canvas color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={bgSettings.bgColor}
                      onChange={(e) => updateBgSettings({ bgColor: e.target.value })}
                      className="h-8 w-10 p-1 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={bgSettings.bgColor}
                      onChange={(e) => updateBgSettings({ bgColor: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Gradient colors */}
              {bgSettings.gradientType !== "solid" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Start color</label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={bgSettings.gradientColorStart}
                          onChange={(e) => updateBgSettings({ gradientColorStart: e.target.value })}
                          className="h-8 w-10 p-1 cursor-pointer shrink-0"
                        />
                        <Input
                          type="text"
                          value={bgSettings.gradientColorStart}
                          onChange={(e) => updateBgSettings({ gradientColorStart: e.target.value })}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">End color</label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={bgSettings.gradientColorEnd}
                          onChange={(e) => updateBgSettings({ gradientColorEnd: e.target.value })}
                          className="h-8 w-10 p-1 cursor-pointer shrink-0"
                        />
                        <Input
                          type="text"
                          value={bgSettings.gradientColorEnd}
                          onChange={(e) => updateBgSettings({ gradientColorEnd: e.target.value })}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                  {(bgSettings.gradientType === "linear" || bgSettings.gradientType === "conic") && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Angle ({bgSettings.gradientAngle}°)</label>
                      <Input
                        type="range"
                        min={0}
                        max={360}
                        value={bgSettings.gradientAngle}
                        onChange={(e) => updateBgSettings({ gradientAngle: parseInt(e.target.value) || 0 })}
                        className="h-8"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Shimmer Settings */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Execution shimmer</label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Style</label>
                  <Select
                    value={bgSettings.shimmerGradientType}
                    onValueChange={(value) => updateBgSettings({ shimmerGradientType: value as ShimmerGradientType })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIMMER_GRADIENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Duration</label>
                  <Input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={bgSettings.shimmerDuration}
                    onChange={(e) => updateBgSettings({ shimmerDuration: parseFloat(e.target.value) || 2 })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Color</label>
                  <div className="flex gap-1">
                    <Input
                      type="color"
                      value={bgSettings.shimmerColor}
                      onChange={(e) => updateBgSettings({ shimmerColor: e.target.value })}
                      className="h-8 w-10 p-1 cursor-pointer shrink-0"
                    />
                    <Input
                      type="text"
                      value={bgSettings.shimmerColor}
                      onChange={(e) => updateBgSettings({ shimmerColor: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground border-t pt-4">
              <a href="/privacy.html" target="_blank" className="underline hover:text-foreground">Privacy Policy</a>
              {" · "}
              <a href="/terms.html" target="_blank" className="underline hover:text-foreground">Terms of Service</a>
            </p>
          </TabsContent>

          <TabsContent value="reset" className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Sign out</div>
                  <div className="text-xs text-muted-foreground">
                    Sign out of your Google account
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    signOut();
                    onOpenChange(false);
                  }}
                  disabled={!user}
                  className="shrink-0"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Reset localStorage</div>
                  <div className="text-xs text-muted-foreground">
                    Clear all local data including API keys
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Reset NUX</div>
                  <div className="text-xs text-muted-foreground">
                    Show the welcome dialog again
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem("avy-nux-step");
                    window.location.reload();
                  }}
                  className="shrink-0"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-4 space-y-2">
              <p>Reset actions may require page reload to take effect.</p>
              <p>
                <a href="/privacy.html" target="_blank" className="underline hover:text-foreground">Privacy Policy</a>
                {" · "}
                <a href="/terms.html" target="_blank" className="underline hover:text-foreground">Terms of Service</a>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
