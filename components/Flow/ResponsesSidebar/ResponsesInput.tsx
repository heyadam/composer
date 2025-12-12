"use client";

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResponsesInputProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onReset: () => void;
  isRunning: boolean;
}

export function ResponsesInput({
  value,
  onChange,
  onRun,
  onReset,
  isRunning,
}: ResponsesInputProps) {
  const handleSubmit = async () => {
    onRun();
  };

  return (
    <div className="border-t p-3 shrink-0">
      <PromptInput
        onSubmit={handleSubmit}
        className="rounded-lg border bg-background"
      >
        <PromptInputTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your input..."
          disabled={isRunning}
          className="min-h-[60px] max-h-[100px]"
        />
        <PromptInputFooter>
          <Button
            type="button"
            onClick={onReset}
            variant="ghost"
            size="icon-sm"
            disabled={isRunning}
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <PromptInputSubmit disabled={isRunning}>
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : undefined}
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
