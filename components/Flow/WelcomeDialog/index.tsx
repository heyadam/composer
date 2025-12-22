"use client";

import { useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KeyRound, Link, Sparkles, Wand2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNuxState } from "./hooks";
import { DialogShell } from "./DialogShell";
import { ProvidersHero, DemoHero } from "./heroes";

// Re-export for external use
export { isNuxComplete } from "./hooks";

interface WelcomeDialogProps {
  onOpenSettings: () => void;
}

export function WelcomeDialog({ onOpenSettings }: WelcomeDialogProps) {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const { step, isLoaded, advanceToStep2, completeNux, backToStep1 } = useNuxState();

  // Auto-advance to step 2 when user signs in during step 1
  useEffect(() => {
    if (isLoaded && user && step === "1") {
      advanceToStep2();
    }
  }, [isLoaded, user, step, advanceToStep2]);

  const handleSkipSignIn = () => {
    advanceToStep2();
  };

  const handleSetupApiKeys = () => {
    // Complete NUX first, then open settings to avoid focus flicker
    completeNux();
    onOpenSettings();
  };

  const handleDismissApiKeys = () => {
    completeNux();
  };

  const handleBackToSignIn = () => {
    backToStep1();
  };

  // Early return before Dialog to avoid portal hydration issues
  if (!isLoaded) return null;

  // NUX complete - show nothing
  if (step === "done") return null;

  // Still loading auth - wait
  if (isLoading) return null;

  // Step 2: API Keys (show if step is "2" OR if user is signed in and hasn't completed NUX)
  if (step === "2" || user) {
    return (
      <Dialog
        open={true}
        onOpenChange={(open) => {
          if (!open) handleDismissApiKeys();
        }}
      >
        <DialogShell
          step={2}
          title="Bring Your Own API Keys"
          description="Connect your providers to start building"
          onBack={!user ? handleBackToSignIn : undefined}
          hero={<ProvidersHero />}
        >
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
