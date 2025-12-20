import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createAnthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import {
  buildSystemPrompt,
  buildPlanModeSystemPrompt,
  buildExecuteFromPlanSystemPrompt,
} from "@/lib/autopilot/system-prompt";
import { buildRetryContext } from "@/lib/autopilot/evaluator";
import type { AutopilotRequest, FlowChanges, EvaluationResult } from "@/lib/autopilot/types";

interface ApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AutopilotRequest & { apiKeys?: ApiKeys };
    const {
      messages,
      flowSnapshot,
      model = "opus-4-5-medium",
      apiKeys,
      mode = "execute",
      approvedPlan,
      thinkingEnabled: thinkingEnabledParam,
    } = body;

    // Enable thinking by default in plan mode, optional in execute mode
    const thinkingEnabled = thinkingEnabledParam ?? (mode === "plan");

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    if (!flowSnapshot) {
      return NextResponse.json(
        { error: "Flow snapshot is required" },
        { status: 400 }
      );
    }

    // Build system prompt based on mode
    let systemPrompt: string;
    if (approvedPlan) {
      // Executing an approved plan
      systemPrompt = buildExecuteFromPlanSystemPrompt(flowSnapshot, approvedPlan);
    } else if (mode === "plan") {
      // Plan mode - ask questions, then present plan
      systemPrompt = buildPlanModeSystemPrompt(flowSnapshot);
    } else {
      // Execute mode - current behavior
      systemPrompt = buildSystemPrompt(flowSnapshot);
    }

    // Create Anthropic client with custom or env API key
    const anthropic = createAnthropic({
      apiKey: apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY,
    });

    // Map model selection to effort level
    const effortMap: Record<string, "low" | "medium" | "high"> = {
      "opus-4-5-low": "low",
      "opus-4-5-medium": "medium",
      "opus-4-5-high": "high",
    };
    const effort = effortMap[model] || "medium";

    // Check if this is a retry request with error context
    const retryContext = (body as { retryContext?: { failedChanges: FlowChanges; evalResult: EvaluationResult } }).retryContext;

    let finalSystemPrompt = systemPrompt;
    if (retryContext) {
      // Append retry context to system prompt
      finalSystemPrompt = systemPrompt + "\n\n" + buildRetryContext(retryContext.failedChanges, retryContext.evalResult);
    }

    // Build provider options based on thinking and effort settings
    const providerOptions: AnthropicProviderOptions = {
      effort,
    };

    if (thinkingEnabled) {
      providerOptions.thinking = {
        type: "enabled",
        budgetTokens: 10000,
      };
    }

    // Stream response from Claude Opus 4.5 with effort parameter
    const result = streamText({
      model: anthropic("claude-opus-4-5-20251101"),
      system: finalSystemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      maxOutputTokens: 16000,
      providerOptions: {
        anthropic: providerOptions,
      },
    });

    // If thinking is enabled, stream NDJSON with separate thinking and text
    if (thinkingEnabled) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const part of result.fullStream) {
              if (part.type === "reasoning-delta") {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ type: "thinking", content: part.text }) + "\n")
                );
              } else if (part.type === "text-delta") {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ type: "text", content: part.text }) + "\n")
                );
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Autopilot error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Autopilot failed" },
      { status: 500 }
    );
  }
}
