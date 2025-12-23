"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  KeyRound,
  Link,
  Sparkles,
  Wand2,
  X,
  ArrowRight,
  Key,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApiKeys, type ProviderId } from "@/lib/api-keys";
import { loadVipCode } from "@/lib/api-keys/storage";
import { useNuxState } from "./hooks";
import { DialogShell } from "./DialogShell";
import { ProvidersHero, DemoHero } from "./heroes";

// Re-export for external use
export { isNuxComplete } from "./hooks";

const PROVIDERS: { id: ProviderId; label: string; placeholder: string }[] = [
  { id: "anthropic", label: "Anthropic", placeholder: "Required | sk-ant-..." },
  { id: "openai", label: "OpenAI", placeholder: "Optional | sk-..." },
  { id: "google", label: "Google Gemini", placeholder: "Optional | AI..." },
];

interface WelcomeDialogProps {
  onDone?: () => void;
}

export function WelcomeDialog({ onDone }: WelcomeDialogProps) {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const { step, isLoaded, advanceToStep2, advanceToStep3, completeNux, backToStep1, backToStep2 } = useNuxState();
  const { keys, setKey, removeKey, isDevMode, getKeyStatuses, unlockWithPassword, isUnlocking } = useApiKeys();

  // Step 3 form state
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [password, setPassword] = useState(() => loadVipCode() || "");
  const [passwordError, setPasswordError] = useState("");
  const [vipSuccess, setVipSuccess] = useState(false);

  const statuses = getKeyStatuses();
  const hasAnyKey = statuses.some((s) => s.hasKey);

  // Auto-advance to step 2 when user signs in during step 1
  useEffect(() => {
    if (isLoaded && user && step === "1") {
      advanceToStep2();
    }
  }, [isLoaded, user, step, advanceToStep2]);

  // Auto-submit VIP code when reaching step 3 with pre-filled code
  useEffect(() => {
    if (step === "3" && password && !vipSuccess && !isUnlocking) {
      // Auto-unlock with pre-filled code
      unlockWithPassword(password.trim()).then((result) => {
        if (result.success) {
          setPassword("");
          setVipSuccess(true);
        } else {
          setPasswordError(result.error || "Invalid password");
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleSkipSignIn = () => {
    advanceToStep2();
  };

  const handleSetupApiKeys = () => {
    advanceToStep3();
  };

  const handleDismissApiKeys = () => {
    completeNux();
  };

  const handleBackToSignIn = () => {
    backToStep1();
  };

  const handleBackToStep2 = () => {
    backToStep2();
  };

  const handleDone = () => {
    completeNux();
    onDone?.();
  };

  const handleSaveKey = (provider: ProviderId) => {
    const value = editValues[provider];
    if (value !== undefined) {
      if (value.trim()) {
        setKey(provider, value.trim());
      } else if (keys[provider]) {
        // User cleared the field - remove the key
        removeKey(provider);
      }
      setEditValues((prev) => ({ ...prev, [provider]: "" }));
    }
  };

  const handleRemoveKey = (provider: ProviderId) => {
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
    setVipSuccess(false);
    const result = await unlockWithPassword(password.trim());
    if (result.success) {
      setPassword("");
      setVipSuccess(true);
    } else {
      setPasswordError(result.error || "Invalid password");
    }
  };

  // Early return before Dialog to avoid portal hydration issues
  if (!isLoaded) return null;

  // NUX complete - show nothing
  if (step === "done") return null;

  // Still loading auth - wait
  if (isLoading) return null;

  // Steps 2 and 3 share the same Dialog to preserve Three.js scene
  // Step 2: API Keys intro (show if step is "2" OR if user is signed in and step is "1")
  // Step 3: API Keys form
  if (step === "2" || step === "3" || user) {
    const isStep3 = step === "3";

    return (
      <Dialog open={true}>
        <DialogShell
          step={isStep3 ? 3 : 2}
          title={isStep3 ? <span className="text-lg sm:text-xl">Add Your API Keys</span> : "Bring Your Own API Keys"}
          description={isStep3 ? <span className="text-xs">Enter your keys or unlock with password</span> : "Connect your providers to start building"}
          onBack={isStep3 ? handleBackToStep2 : (!user ? handleBackToSignIn : undefined)}
          hero={<ProvidersHero />}
          preventOutsideClose
        >
          {isStep3 ? (
            // Step 3: API Key form
            <div className="grid gap-3">
              {isDevMode && (
                <p className="text-xs text-green-500">
                  Using keys from environment variables.
                </p>
              )}

              {/* Provider inputs */}
              {PROVIDERS.map((provider) => {
                const status = statuses.find((s) => s.provider === provider.id);
                const hasKey = status?.hasKey ?? false;
                const currentKey = keys[provider.id];
                const editValue = editValues[provider.id] ?? "";

                return (
                  <div key={provider.id} className="flex items-center gap-2">
                    <label className="w-24 shrink-0 text-xs font-medium">
                      {provider.label}
                    </label>

                    {!isDevMode ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="password"
                          placeholder={provider.placeholder}
                          value={editValue || currentKey || ""}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveKey(provider.id);
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          onBlur={() => {
                            handleSaveKey(provider.id);
                          }}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData("text").trim();
                            if (pasted) {
                              const input = e.target as HTMLInputElement;
                              // Use queueMicrotask to run after React processes the paste
                              queueMicrotask(() => {
                                setKey(provider.id, pasted);
                                setEditValues((prev) => ({ ...prev, [provider.id]: "" }));
                                input.blur();
                              });
                            }
                          }}
                          className={[
                            "h-8 w-56 font-mono text-[11px] placeholder:text-[11px] transition-colors",
                            hasKey ? "border-green-500/50 bg-green-500/5" : "",
                          ].join(" ")}
                        />
                        <div className="w-8 shrink-0">
                          {currentKey ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveKey(provider.id)}
                              className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center">
                              <Key className="h-3.5 w-3.5 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Using environment variable
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Divider */}
              {!isDevMode && (
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-2 text-[10px] text-muted-foreground uppercase tracking-wider">or use vip code</span>
                  </div>
                </div>
              )}

              {/* VIP Code unlock row */}
              {!isDevMode && (
                <div className="flex items-center gap-2">
                  <label className="w-24 shrink-0 text-xs font-medium">
                    VIP Code
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="password"
                      placeholder={vipSuccess ? "Success" : "Enter VIP code"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError("");
                        setVipSuccess(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUnlock();
                        }
                      }}
                      className={[
                        "h-8 w-56 font-mono text-[11px] placeholder:text-[11px] transition-colors",
                        passwordError ? "border-red-500/50 bg-red-500/5" : "",
                        vipSuccess ? "border-green-500/50 bg-green-500/5" : "",
                      ].join(" ")}
                    />
                    <div className="w-8 shrink-0">
                      <Button
                        variant="default"
                        size="icon-sm"
                        onClick={handleUnlock}
                        disabled={isUnlocking || !password.trim()}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {/* Done button */}
              <Button
                onClick={handleDone}
                disabled={!keys.anthropic && !isDevMode}
                className="h-9 w-full cursor-pointer mt-4"
              >
                Done
              </Button>
            </div>
          ) : (
            // Step 2: API Keys intro
            <div className="grid gap-5">
              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">You stay in control</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Your keys, your costs, your privacy
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Mix and match providers</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Use OpenAI, Anthropic, and Google together
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Button onClick={handleSetupApiKeys} className="h-10 w-full cursor-pointer">
                  Set up API Keys
                </Button>
              </div>
            </div>
          )}
        </DialogShell>
      </Dialog>
    );
  }

  // Step 1: Sign in (only shown if not signed in)
  return (
    <Dialog open={true}>
      <DialogShell
        step={1}
        title="Welcome to Composer"
        description="A canvas for chaining AI models into creative workflows"
        hero={<DemoHero />}
        preventOutsideClose
        onClose={completeNux}
      >
        <div className="grid gap-6">
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                <Link className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Chain any AI model</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Chain multiple AI models from different providers
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                <Wand2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Composer AI builds with you</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  An AI agent that edits your flow as you describe changes
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Button onClick={signInWithGoogle} className="h-10 w-full cursor-pointer">
              Continue with Google
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipSignIn}
              className="mt-2 h-10 w-full cursor-pointer"
            >
              Continue Without an Account
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You can sign in later from the profile menu
            </p>
          </div>
        </div>
      </DialogShell>
    </Dialog>
  );
}
