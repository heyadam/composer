"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Wand2, Zap, ListTodo, ChevronDown, Brain, Check } from "lucide-react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { templates, type TemplateDefinition } from "./templates";
import type { SavedFlow } from "@/lib/flow-storage/types";
import type { AutopilotMode, AutopilotModel } from "@/lib/autopilot/types";

const templateIcons = [Sparkles, Wand2, Zap];

const MODES: { id: AutopilotMode; name: string; icon: typeof Zap }[] = [
  { id: "execute", name: "Execute", icon: Zap },
  { id: "plan", name: "Plan", icon: ListTodo },
];

const MODELS: { id: AutopilotModel; name: string }[] = [
  { id: "sonnet-4-5", name: "Sonnet 4.5" },
  { id: "opus-4-5", name: "Opus 4.5" },
];

interface TemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onDismissPermanently: () => void;
  onSelectTemplate: (flow: SavedFlow) => void;
  onSubmitPrompt?: (prompt: string, mode: AutopilotMode, model: AutopilotModel, thinkingEnabled: boolean) => void;
}

export function TemplatesModal({
  open,
  onClose,
  onDismissPermanently,
  onSelectTemplate,
  onSubmitPrompt,
}: TemplatesModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [mode, setMode] = useState<AutopilotMode>("execute");
  const [selectedModel, setSelectedModel] = useState<AutopilotModel>("sonnet-4-5");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const currentModel = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0];

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      // Safe: resetting local UI state when modal opens
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDontShowAgain(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue("");
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      onDismissPermanently();
    } else {
      onClose();
    }
  }, [dontShowAgain, onClose, onDismissPermanently]);

  // Handle clicks on the React Flow pane (the actual canvas background)
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isOutsidePanel = panelRef.current && !panelRef.current.contains(target);

      // Only dismiss if clicking specifically on the React Flow pane
      // This prevents dismissing when clicking on UI elements like buttons, sidebars, etc.
      const isOnReactFlowPane = target.classList?.contains("react-flow__pane");

      if (isOutsidePanel && isOnReactFlowPane) {
        handleClose();
      }
    };

    // Delay adding listener to avoid immediate trigger
    // Use capture phase (true) because React Flow stops propagation in bubble phase
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [open, handleClose]);

  const handleSelect = (template: TemplateDefinition) => {
    if (dontShowAgain) {
      onDismissPermanently();
    } else {
      onClose();
    }
    onSelectTemplate(template.flow);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop overlay - pointer-events-none allows clicks to pass through to canvas */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none animate-in fade-in-0 duration-200" />
      <div
        ref={panelRef}
        className="relative z-10 pointer-events-auto bg-background border rounded-lg shadow-2xl shadow-black/40 p-6 w-full max-w-2xl animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">What do you want to create?</h2>
        </div>

        {/* AI Prompt Input */}
        <div className="mb-6 prompt-input-glow">
          <PromptInput
            onSubmit={({ text }) => {
              if (text.trim() && onSubmitPrompt) {
                if (dontShowAgain) {
                  onDismissPermanently();
                } else {
                  onClose();
                }
                onSubmitPrompt(text, mode, selectedModel, thinkingEnabled);
                setInputValue("");
              }
            }}
          >
            <PromptInputTextarea
              placeholder="Ask Composer to build..."
              className="min-h-[80px] text-sm"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <PromptInputFooter className="justify-between items-center pt-2">
              <div className="flex items-center gap-1">
                {/* Mode Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 bg-muted"
                    >
                      {(() => {
                        const CurrentIcon = MODES.find((m) => m.id === mode)?.icon ?? Zap;
                        return <CurrentIcon className="h-3 w-3" />;
                      })()}
                      <span>{MODES.find((m) => m.id === mode)?.name}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[120px]">
                    {MODES.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => {
                          setMode(m.id);
                          if (m.id === "plan" && !thinkingEnabled) {
                            setThinkingEnabled(true);
                          }
                        }}
                        className="text-xs gap-2"
                      >
                        <m.icon className="h-3.5 w-3.5" />
                        <span className="flex-1">{m.name}</span>
                        {m.id === mode && <Check className="h-3 w-3" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Model Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <span>{currentModel.name}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[120px]">
                    {MODELS.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className="text-xs gap-2"
                      >
                        <span className="flex-1">{model.name}</span>
                        {model.id === selectedModel && <Check className="h-3 w-3" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Thinking Toggle */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 text-xs gap-1 ${
                    thinkingEnabled
                      ? "text-purple-600 hover:text-purple-700"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setThinkingEnabled(!thinkingEnabled)}
                  title={thinkingEnabled ? "Disable extended thinking" : "Enable extended thinking"}
                >
                  <Brain className="h-3 w-3" />
                  <span>Think</span>
                </Button>
              </div>
              <PromptInputSubmit className="h-7 w-7" disabled={!inputValue.trim() || !onSubmitPrompt} />
            </PromptInputFooter>
          </PromptInput>
        </div>

        {/* Template section */}
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">Or start with a template</p>
        </div>

        {/* Template pill buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {templates.map((template, index) => {
            const Icon = templateIcons[index] || Sparkles;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelect(template)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-background text-sm font-medium transition-all hover:border-primary hover:bg-muted cursor-pointer"
              >
                <Icon className="h-4 w-4" />
                {template.title}
              </button>
            );
          })}
        </div>

        {/* Footer with checkbox and dismiss button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <span className="text-sm text-muted-foreground">
              Don&apos;t show this again
            </span>
          </label>
          <Button
            variant="secondary"
            onClick={handleClose}
          >
            Start blank
          </Button>
        </div>
      </div>
    </div>
  );
}
