"use client";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div
      className="glass-panel-subtle inline-flex min-w-[106px] items-center justify-center gap-2 whitespace-nowrap rounded-full border bg-white/5 px-2.5 py-1 text-xs font-medium tabular-nums text-zinc-400 backdrop-blur-md"
      aria-label={`Step ${currentStep} of 3`}
    >
      <span>Step {currentStep} of 3</span>
      <span aria-hidden className="inline-flex items-center gap-1.5">
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            currentStep === 1 ? "bg-white" : "bg-white/20",
          ].join(" ")}
        />
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            currentStep === 2 ? "bg-white" : "bg-white/20",
          ].join(" ")}
        />
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            currentStep === 3 ? "bg-white" : "bg-white/20",
          ].join(" ")}
        />
      </span>
    </div>
  );
}
