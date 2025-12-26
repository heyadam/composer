"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ArrowLeft, X } from "lucide-react";
import { StepIndicator } from "./StepIndicator";

interface DialogShellProps {
  step: 1 | 2 | 3;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  hero: ReactNode;
  preventOutsideClose?: boolean;
  onClose?: () => void;
}

/**
 * Shared dialog layout for NUX steps.
 * Two-column layout with content on left and hero panel on right.
 */
export function DialogShell({
  step,
  title,
  description,
  children,
  onBack,
  hero,
  preventOutsideClose,
  onClose,
}: DialogShellProps) {
  const closeButton = (
    <Button
      variant="ghost"
      size="icon-sm"
      className="glass-panel-subtle absolute right-4 top-4 z-30 cursor-pointer rounded-full border bg-zinc-900/40 backdrop-blur-md hover:bg-zinc-800/60"
      aria-label="Close"
      onClick={onClose}
    >
      <X className="h-4 w-4" />
    </Button>
  );

  return (
    <DialogContent
      showCloseButton={false}
      overlayClassName="glass-backdrop"
      className="glass-panel h-[100dvh] w-screen max-w-none gap-0 rounded-none border-0 p-0 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-[980px] sm:rounded-xl sm:border"
      onInteractOutside={preventOutsideClose ? (e) => e.preventDefault() : undefined}
      onEscapeKeyDown={preventOutsideClose ? (e) => e.preventDefault() : undefined}
    >
      {/* Show close button if onClose is provided (for skip) OR if not preventing outside close */}
      {onClose ? closeButton : (!preventOutsideClose && <DialogClose asChild>{closeButton}</DialogClose>)}
      <div className="flex h-full flex-col overflow-y-auto sm:grid sm:overflow-hidden md:min-h-[580px] md:grid-cols-[1fr_1.15fr]">
        {/* Left: content */}
        <div className="relative flex shrink-0 flex-col justify-between p-6 sm:p-8">
          <div className="flex h-8 items-center justify-between gap-3 pr-12 md:pr-0">
            <div className="flex h-8 items-center">
              {onBack ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="-ml-2 h-8 cursor-pointer px-2 text-muted-foreground hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div className="flex h-8 items-center gap-2">
                  <div
                    aria-hidden
                    className="grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-[radial-gradient(120%_120%_at_20%_20%,hsl(var(--primary)/0.55),transparent_55%),radial-gradient(100%_100%_at_80%_80%,hsl(var(--foreground)/0.18),transparent_55%)] shadow-xs"
                  >
                    <div className="h-2.5 w-2.5 rounded-full bg-white" />
                  </div>
                  <span className="text-sm font-medium tracking-tight text-white/90">Composer</span>
                </div>
              )}
            </div>

            <StepIndicator currentStep={step} />
          </div>

          <div className={step === 3 ? "mt-2 sm:mt-3" : "mt-6 sm:mt-10"}>
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                {title}
              </DialogTitle>
              <DialogDescription className={step === 3 ? "mt-0 text-sm text-zinc-400 sm:text-[15px]" : "mt-2 text-sm text-zinc-400 sm:mt-3 sm:text-[15px]"}>
                {description}
              </DialogDescription>
            </DialogHeader>

            <div className={step === 1 ? "mt-5 sm:mt-7" : "mt-2 sm:mt-3"}>{children}</div>
          </div>

          <div className="mt-6 sm:mt-10" />
        </div>

        {/* Right: hero */}
        <div className="glass-divider min-h-[280px] flex-1 border-t sm:min-h-[220px] md:border-l md:border-t-0">
          {hero}
        </div>
      </div>
    </DialogContent>
  );
}
