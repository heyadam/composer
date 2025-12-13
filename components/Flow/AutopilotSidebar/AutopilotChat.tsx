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
import { Loader } from "@/components/ai-elements/loader";
import { Check, Sparkles, Undo2, ChevronDown } from "lucide-react";
import type { AutopilotMessage, AutopilotModel } from "@/lib/autopilot/types";

const MODELS: { id: AutopilotModel; name: string }[] = [
  { id: "claude-sonnet-4-5", name: "Sonnet 4.5" },
  { id: "claude-opus-4-5", name: "Opus 4.5" },
];

const SUGGESTED_PROMPTS = [
  "Add a prompt node that summarizes the input",
  "Create an image generation pipeline",
  "Add a node that translates text to Spanish",
  "Build a chain that analyzes sentiment",
];

interface AutopilotChatProps {
  messages: AutopilotMessage[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string, model: AutopilotModel) => void;
  onUndoChanges: (messageId: string) => void;
}

export function AutopilotChat({
  messages,
  isLoading,
  error,
  onSendMessage,
  onUndoChanges,
}: AutopilotChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState<AutopilotModel>("claude-sonnet-4-5");
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
              <h3 className="font-medium text-sm">Flow Autopilot</h3>
              <p className="text-muted-foreground text-xs">
                Describe what you want to add to your flow.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[280px]">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt, selectedModel)}
                  disabled={isLoading}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-border/50 hover:border-purple-500/50 hover:bg-purple-500/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-3">
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.role === "assistant" ? (
                    <>
                      <MessageResponse className="[&_pre]:text-[8px] [&_pre]:leading-[1.2] [&_pre]:p-1.5 [&_code]:text-[8px]">{message.content}</MessageResponse>
                      {message.pendingChanges && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                              {message.pendingChanges.actions.length} change
                              {message.pendingChanges.actions.length !== 1 ? "s" : ""}
                            </span>
                            {message.applied ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-xs text-green-600">
                                  <Check className="h-3 w-3" />
                                  Applied
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => onUndoChanges(message.id)}
                                >
                                  <Undo2 className="h-3 w-3 mr-1" />
                                  Undo
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Undone
                              </span>
                            )}
                          </div>
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
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader className="h-4 w-4" />
                <span className="text-sm">Thinking...</span>
              </div>
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
            placeholder="Describe nodes to add..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="min-h-[60px] text-sm"
            disabled={isLoading}
          />
          <PromptInputFooter className="justify-between">
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
