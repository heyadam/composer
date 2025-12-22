"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Check,
  Sparkles,
  ChevronDown,
  Play,
  Zap,
  ListTodo,
  AlertTriangle,
  Brain,
  RefreshCw,
  FileText,
  Image,
  Languages,
  BarChart,
  Palette,
  Bot,
  Mail,
  Lightbulb,
  Code,
  MessageSquare,
  Search,
  Wand2,
  Pencil,
  BookOpen,
  Globe,
  GitBranch,
  type LucideIcon,
} from "lucide-react";
import { ThinkingSummary } from "@/components/ThinkingSummary";
import { ChangesPreview } from "./ChangesPreview";
import { CollapsibleJson, parseMessageContent } from "./CollapsibleJson";
import type { AutopilotMessage, AutopilotModel, AutopilotMode, FlowPlan } from "@/lib/autopilot/types";
import type { Suggestion } from "@/lib/hooks/useSuggestions";
import type { Node, Edge } from "@xyflow/react";

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Image,
  Languages,
  BarChart,
  Palette,
  Sparkles,
  Bot,
  Mail,
  Lightbulb,
  Code,
  MessageSquare,
  Search,
  Wand2,
  Pencil,
  BookOpen,
  Globe,
  Zap,
  GitBranch,
};

const MODELS: { id: AutopilotModel; name: string }[] = [
  { id: "sonnet-4-5", name: "Sonnet 4.5" },
  { id: "opus-4-5", name: "Opus 4.5" },
];

const MODES: { id: AutopilotMode; name: string; icon: typeof Zap }[] = [
  { id: "execute", name: "Execute", icon: Zap },
  { id: "plan", name: "Plan", icon: ListTodo },
];

interface AutopilotChatProps {
  messages: AutopilotMessage[];
  isLoading: boolean;
  error: string | null;
  mode: AutopilotMode;
  onModeChange: (mode: AutopilotMode) => void;
  thinkingEnabled: boolean;
  onThinkingChange: (enabled: boolean) => void;
  onSendMessage: (content: string, model: AutopilotModel) => void;
  onApprovePlan: (messageId: string, model: AutopilotModel) => void;
  onUndoChanges: (messageId: string) => void;
  onApplyAnyway?: (messageId: string) => void;
  onRetryFix?: (messageId: string, model: AutopilotModel) => void;
  nodes: Node[];
  edges: Edge[];
  suggestions: Suggestion[];
  suggestionsLoading: boolean;
  onRefreshSuggestions: () => void;
}

export function AutopilotChat({
  messages,
  isLoading,
  error,
  mode,
  onModeChange,
  thinkingEnabled,
  onThinkingChange,
  onSendMessage,
  onApprovePlan,
  onUndoChanges,
  onApplyAnyway,
  onRetryFix,
  nodes,
  edges,
  suggestions,
  suggestionsLoading,
  onRefreshSuggestions,
}: AutopilotChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState<AutopilotModel>("sonnet-4-5");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const currentModel = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="text-muted-foreground">
              <Sparkles className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-sm">Composer AI</h3>
              <p className="text-muted-foreground text-xs">
                Describe what to build
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[280px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Suggestions</span>
                <button
                  onClick={onRefreshSuggestions}
                  disabled={suggestionsLoading}
                  className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title="Refresh suggestions"
                >
                  <RefreshCw className={`h-3 w-3 ${suggestionsLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              {suggestionsLoading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-8 rounded-lg border border-border/50 bg-muted/30 animate-pulse"
                    />
                  ))}
                </>
              ) : (
                suggestions.map((suggestion) => {
                  const Icon = ICON_MAP[suggestion.icon] || Sparkles;
                  return (
                    <button
                      key={suggestion.text}
                      onClick={() => onSendMessage(suggestion.text, selectedModel)}
                      disabled={isLoading}
                      className="flex items-center gap-2 text-left text-xs px-3 py-2 rounded-lg border border-border/50 hover:border-purple-500/50 hover:bg-purple-500/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{suggestion.text}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-3">
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.role === "assistant" ? (
                    <>
                      {/* Thinking summary - shown first since thinking happens before response */}
                      {message.thinking && (
                        <ThinkingSummary
                          reasoning={message.thinking}
                          defaultExpanded
                          maxHeight="150px"
                          className="mb-2"
                          isStreaming={isLoading && messages[messages.length - 1]?.id === message.id && !message.content}
                        />
                      )}
                      {(() => {
                        const { textBefore, jsonBlocks, textAfter, hasOpenCodeBlock } = parseMessageContent(message.content);
                        const isThisMessageStreaming = isLoading && messages[messages.length - 1]?.id === message.id;
                        return (
                          <>
                            {textBefore && (
                              <MessageResponse className="[&_pre]:text-[8px] [&_pre]:leading-[1.2] [&_pre]:p-1.5 [&_code]:text-[8px]">
                                {textBefore}
                              </MessageResponse>
                            )}
                            {jsonBlocks.map((json, i) => (
                              <CollapsibleJson
                                key={i}
                                json={json}
                                isStreaming={isThisMessageStreaming && hasOpenCodeBlock}
                              />
                            ))}
                            {textAfter && (
                              <MessageResponse className="[&_pre]:text-[8px] [&_pre]:leading-[1.2] [&_pre]:p-1.5 [&_code]:text-[8px]">
                                {textAfter}
                              </MessageResponse>
                            )}
                          </>
                        );
                      })()}
                      {/* Plan awaiting approval */}
                      {message.pendingPlan && !message.planApproved && (
                        <PlanCard
                          plan={message.pendingPlan}
                          onApprove={() => onApprovePlan(message.id, selectedModel)}
                          isLoading={isLoading}
                        />
                      )}

                      {/* Plan approved */}
                      {message.pendingPlan && message.planApproved && (
                        <div className="mt-3 pt-3 border-t">
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <Check className="h-3 w-3" />
                            Plan Approved
                          </span>
                        </div>
                      )}

                      {/* Flow changes card */}
                      {message.pendingChanges && (
                        <div className="mt-3">
                          <ChangesPreview
                            changes={message.pendingChanges}
                            nodes={nodes}
                            edges={edges}
                            evaluationState={message.evaluationState}
                            applied={message.applied}
                            onUndo={() => onUndoChanges(message.id)}
                          />

                          {/* Validation errors - shown during retrying */}
                          {message.evaluationState === "retrying" && message.evaluationResult && (
                            <div className="mt-2">
                              <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3">
                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span className="text-xs font-medium">
                                    Validation flags
                                  </span>
                                </div>
                                <ul className="text-xs space-y-1 text-amber-800 dark:text-amber-300">
                                  {message.evaluationResult.issues.map((issue, i) => (
                                    <li key={i}>• {issue}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* Validation errors - shown after retry fails */}
                          {message.evaluationState === "failed" && message.evaluationResult && !message.evaluationResult.valid && (
                            <div className="mt-2 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3">
                              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-xs font-medium">
                                  Validation Issues{message.wasRetried ? " (after retry)" : ""}
                                </span>
                              </div>
                              <ul className="text-xs space-y-1 text-amber-800 dark:text-amber-300 mb-2">
                                {message.evaluationResult.issues.map((issue, i) => (
                                  <li key={i}>• {issue}</li>
                                ))}
                              </ul>
                              <div className="flex gap-2">
                                {onRetryFix && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs border-blue-500/50 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                    onClick={() => onRetryFix(message.id, selectedModel)}
                                    disabled={isLoading}
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Fix Again
                                  </Button>
                                )}
                                {onApplyAnyway && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs border-amber-500/50 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                    onClick={() => onApplyAnyway(message.id)}
                                  >
                                    Apply Anyway
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <span>{message.content}</span>
                  )}
                </MessageContent>
              </Message>
            ))}
            {isLoading && messages[messages.length - 1]?.content === "" && (
              <Shimmer className="text-sm" duration={1.5}>
                Running AI agents...
              </Shimmer>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20">
          {error}
        </div>
      )}

      <div className="p-3 border-t">
        <PromptInput
          onSubmit={({ text }) => {
            if (text.trim() && !isLoading) {
              onSendMessage(text, selectedModel);
              setInputValue("");
            }
          }}
        >
          <PromptInputTextarea
            placeholder="Describe what to build..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="min-h-[60px] text-sm"
          />
          <PromptInputFooter className="justify-between">
            <div className="flex items-center gap-1">
              {/* Mode Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
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
                        onModeChange(m.id);
                        // Auto-enable thinking when switching to plan mode
                        if (m.id === "plan" && !thinkingEnabled) {
                          onThinkingChange(true);
                        }
                      }}
                      className="text-xs gap-2"
                    >
                      <m.icon className="h-3.5 w-3.5" />
                      <span className="flex-1">{m.name}</span>
                      {m.id === mode && (
                        <Check className="h-3 w-3" />
                      )}
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
                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
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
                      {model.id === selectedModel && (
                        <Check className="h-3 w-3" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Thinking Toggle */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-[11px] gap-1 ${
                  thinkingEnabled
                    ? "text-purple-600 hover:text-purple-700"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onThinkingChange(!thinkingEnabled)}
                title={thinkingEnabled ? "Disable extended thinking" : "Enable extended thinking"}
              >
                <Brain className="h-3 w-3" />
                <span>Think</span>
              </Button>
            </div>
            <PromptInputSubmit
              disabled={!inputValue.trim() || isLoading}
              status={isLoading ? "streaming" : undefined}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

interface PlanCardProps {
  plan: FlowPlan;
  onApprove: () => void;
  isLoading: boolean;
}

function PlanCard({ plan, onApprove, isLoading }: PlanCardProps) {
  return (
    <div className="mt-3 pt-3 border-t">
      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-medium">{plan.summary}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plan.estimatedChanges.nodesToAdd} node
              {plan.estimatedChanges.nodesToAdd !== 1 ? "s" : ""},{" "}
              {plan.estimatedChanges.edgesToAdd} edge
              {plan.estimatedChanges.edgesToAdd !== 1 ? "s" : ""}
              {plan.estimatedChanges.edgesToRemove > 0 && (
                <>, {plan.estimatedChanges.edgesToRemove} removal
                  {plan.estimatedChanges.edgesToRemove !== 1 ? "s" : ""}</>
              )}
            </p>
          </div>
        </div>

        {plan.steps.length > 0 && (
          <ul className="space-y-1.5 text-xs">
            {plan.steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                <span>{step.description}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isLoading}
            className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700"
          >
            <Play className="h-3 w-3 mr-1.5" />
            Execute Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
