"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, KeyRound, Play, Sparkles, X } from "lucide-react";

const STORAGE_KEY = "avy-nux-step";

function StepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <div
      className="inline-flex min-w-[106px] items-center justify-center gap-2 whitespace-nowrap rounded-full border bg-background/60 px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground backdrop-blur-sm"
      aria-label={`Step ${currentStep} of 2`}
    >
      <span>Step {currentStep} of 2</span>
      <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
      <span aria-hidden className="inline-flex items-center gap-1">
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            currentStep === 1 ? "bg-foreground" : "bg-muted-foreground/30",
          ].join(" ")}
        />
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            currentStep === 2 ? "bg-foreground" : "bg-muted-foreground/30",
          ].join(" ")}
        />
      </span>
    </div>
  );
}

type NuxStep = "1" | "2" | "done";

interface WelcomeDialogProps {
  onOpenSettings: () => void;
}

function HeroVideo({
  src = "/welcome.mp4",
  poster = "/welcome-poster.png",
  title = "Composer preview video",
  overlay,
}: {
  src?: string;
  poster?: string;
  title?: string;
  overlay?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    return () => {
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (hasError) return;

    // Try to autoplay (muted) for a modern "hero" feel, but degrade gracefully.
    el.muted = true;
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // Autoplay may be blocked; user can click to play.
      });
    }
  }, [hasError]);

  const togglePlayback = async () => {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      try {
        await el.play();
      } catch {
        // ignore
      }
      return;
    }

    el.pause();
  };

  return (
    <div className="relative h-full w-full overflow-hidden border bg-muted/40">
      {/* Background polish */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_30%_20%,hsl(var(--primary)/0.20),transparent_55%),radial-gradient(900px_circle_at_70%_80%,hsl(var(--foreground)/0.10),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <button
        type="button"
        onClick={togglePlayback}
        className="group absolute inset-0 z-10 grid cursor-pointer place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={isPlaying ? "Pause video" : "Play video"}
        aria-pressed={isPlaying}
      >
        <span className="sr-only">{isPlaying ? "Pause video" : "Play video"}</span>

        {/* Play affordance */}
        <span
          className={[
            "grid place-items-center rounded-full border bg-background/70 text-foreground shadow-sm backdrop-blur-sm transition-all",
            "h-12 w-12 sm:h-14 sm:w-14",
            isPlaying ? "opacity-0 scale-95" : "opacity-100 scale-100",
            "group-hover:scale-105 group-hover:bg-background/80",
            "group-focus-visible:opacity-100 group-focus-visible:scale-105",
          ].join(" ")}
        >
          <Play className="h-5 w-5 translate-x-[1px]" />
        </span>
      </button>

      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        loop
        preload="metadata"
        poster={poster}
        aria-label={title}
        disablePictureInPicture
        disableRemotePlayback
        controls={false}
        onError={() => setHasError(true)}
      >
        {!hasError && <source src={src} type="video/mp4" />}
      </video>

      {/* Soft vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent"
      />

      {hasError && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center">
          <div className="max-w-sm rounded-xl border bg-background/75 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
            <div className="font-medium text-foreground">Add a product video</div>
            <div className="mt-1">
              Place <span className="font-medium text-foreground">welcome.mp4</span> in{" "}
              <span className="font-medium text-foreground">/public</span> to enable this hero
            </div>
          </div>
        </div>
      )}

      {overlay}
    </div>
  );
}

function DialogShell({
  step,
  title,
  description,
  children,
  onBack,
}: {
  step: 1 | 2;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  onBack?: () => void;
}) {
  return (
    <DialogContent
      showCloseButton={false}
      className="max-h-[calc(100vh-2rem)] p-0 gap-0 overflow-hidden sm:max-w-[980px]"
    >
      <DialogClose asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-4 top-4 z-30 rounded-full border bg-background/70 backdrop-blur-sm hover:bg-background/80"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </DialogClose>
      <div className="grid h-full md:min-h-[560px] grid-rows-[auto_minmax(220px,1fr)] md:grid-cols-[1fr_1.15fr] md:grid-rows-1">
        {/* Left: content */}
        <div className="relative flex min-h-0 flex-col justify-between p-6 sm:p-8">
          <div className="flex h-8 items-center justify-between gap-3 pr-12 md:pr-0">
            <div className="flex h-8 items-center">
              {onBack ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div className="flex h-8 items-center gap-2">
                  <div
                    aria-hidden
                    className="h-7 w-7 rounded-md border shadow-xs bg-[radial-gradient(120%_120%_at_20%_20%,hsl(var(--primary)/0.55),transparent_55%),radial-gradient(100%_100%_at_80%_80%,hsl(var(--foreground)/0.18),transparent_55%)]"
                  />
                  <span className="text-sm font-medium tracking-tight">Composer</span>
                </div>
              )}
            </div>

            <StepIndicator currentStep={step} />
          </div>

          <div className="mt-10 min-h-0">
            <DialogHeader className="text-left">
              <DialogTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-3 text-base sm:text-[15px]">
                {description}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-7">{children}</div>
          </div>

          <div className="mt-10" />
        </div>

        {/* Right: hero */}
        <div className="min-h-[220px] border-t md:min-h-0 md:border-t-0 md:border-l">
          <HeroVideo />
        </div>
      </div>
    </DialogContent>
  );
}

export function WelcomeDialog({ onOpenSettings }: WelcomeDialogProps) {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const [nuxStep, setNuxStep] = useState<NuxStep>("1");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load NUX step from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as NuxStep | null;
      if (stored === "1" || stored === "2" || stored === "done") {
        setNuxStep(stored);
      }
    } catch {
      // localStorage unavailable, default to step 1
    }
    setIsLoaded(true);
  }, []);

  const advanceToStep2 = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "2");
    } catch {
      // localStorage unavailable
    }
    setNuxStep("2");
  };

  const completeNux = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // localStorage unavailable
    }
    setNuxStep("done");
  };

  // Auto-advance to step 2 when user signs in during step 1
  useEffect(() => {
    if (isLoaded && user && nuxStep === "1") {
      advanceToStep2();
    }
  }, [isLoaded, user, nuxStep]);

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
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable
    }
    setNuxStep("1");
  };

  // Early return before Dialog to avoid portal hydration issues
  if (!isLoaded) return null;

  // NUX complete - show nothing
  if (nuxStep === "done") return null;

  // Still loading auth - wait
  if (isLoading) return null;

  // Step 2: API Keys (show if step is "2" OR if user is signed in and hasn't completed NUX)
  if (nuxStep === "2" || user) {
    return (
      <Dialog
        open={true}
        onOpenChange={(open) => {
          if (!open) handleDismissApiKeys();
        }}
      >
        <DialogShell
          step={2}
        title="Connect Your AI Providers"
          description="Add at least one API key to run nodes"
          onBack={!user ? handleBackToSignIn : undefined}
        >
          <div className="grid gap-5">
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">Bring your own keys</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Add OpenAI, Anthropic, and more in Settings
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">Instant previews</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Run nodes and inspect outputs as you build
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Button onClick={handleSetupApiKeys} className="h-10 w-full">
                Open API Keys
              </Button>
            </div>
          </div>
        </DialogShell>
      </Dialog>
    );
  }

  // Step 1: Sign in (only shown if not signed in)
  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) handleSkipSignIn();
      }}
    >
      <DialogShell
        step={1}
        title="Welcome to Composer"
        description="Design, run, and iterate on visual AI workflows"
      >
        <div className="grid gap-6">
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Build like a canvas</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Connect nodes to shape prompts, tools, and transforms
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                <KeyRound className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Save work anywhere</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Sign in to sync flows across devices
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Button onClick={signInWithGoogle} className="h-10 w-full">
              Continue with Google
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipSignIn}
              className="mt-2 h-10 w-full"
            >
              Continue Without an Account
            </Button>
            <p className="text-xs text-muted-foreground">
              You can sign in later from the profile menu
            </p>
          </div>
        </div>
      </DialogShell>
    </Dialog>
  );
}
