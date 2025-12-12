"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
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
import { Loader } from "@/components/ai-elements/loader";
import { Check, Sparkles } from "lucide-react";
import type { AutopilotMessage } from "@/lib/autopilot/types";

interface AutopilotChatProps {
  messages: AutopilotMessage[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string) => void;
  onApplyChanges: (messageId: string) => void;
}

export function AutopilotChat({
  messages,
  isLoading,
  error,
  onSendMessage,
  onApplyChanges,
}: AutopilotChatProps) {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Conversation className="flex-1">
        {messages.length === 0 ? (
          <ConversationEmptyState
            title="Flow Autopilot"
            description="Describe what you want to add to your flow and I'll create the nodes and connections for you."
            icon={<Sparkles className="h-8 w-8" />}
          />
        ) : (
          <ConversationContent className="gap-4 p-3">
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.role === "assistant" ? (
                    <>
                      <MessageResponse>{message.content}</MessageResponse>
                      {message.pendingChanges && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                              {message.pendingChanges.actions.length} change
                              {message.pendingChanges.actions.length !== 1 ? "s" : ""} ready
                            </span>
                            {message.applied ? (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <Check className="h-3 w-3" />
                                Applied
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                                onClick={() => onApplyChanges(message.id)}
                              >
                                Apply Changes
                              </Button>
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
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>

      {error && (
        <div className="px-3 py-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20">
          {error}
        </div>
      )}

      <div className="p-3 border-t">
        <PromptInput
          onSubmit={({ text }) => {
            if (text.trim() && !isLoading) {
              onSendMessage(text);
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
          <PromptInputFooter className="justify-end">
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
