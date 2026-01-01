import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import {
  buildSystemPrompt,
  buildPlanModeSystemPrompt,
  buildExecuteFromPlanSystemPrompt,
} from "@/lib/autopilot/system-prompt";
import { buildRetryContext } from "@/lib/autopilot/evaluator";
import { getRandomBadJson } from "@/lib/autopilot/test-fixtures";
import type { AutopilotRequest, FlowChanges, EvaluationResult } from "@/lib/autopilot/types";
import type { ApiKeys } from "@/lib/api-keys/types";
import { getAnthropicClient } from "@/lib/api/providers";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AutopilotRequest & { apiKeys?: ApiKeys };
    const {
      messages,
      flowSnapshot,
      model = "sonnet-4-5",
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

    // Test mode: Return intentionally bad JSON for validator testing (dev only)
    const testMode = request.headers.get("x-autopilot-test-mode");
    if (testMode === "bad-json") {
      const badJson = getRandomBadJson();
      const mockResponse = `I'll create this flow for you.

\`\`\`json
${JSON.stringify(badJson, null, 2)}
\`\`\`

This should work perfectly!`;
      return new Response(mockResponse, {
        headers: { "Content-Type": "text/plain" },
      });
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
    const anthropic = getAnthropicClient(apiKeys);

    // Map model selection to Anthropic model ID
    const modelIdMap: Record<string, string> = {
      "sonnet-4-5": "claude-sonnet-4-5",
      "opus-4-5": "claude-opus-4-5",
    };
    const anthropicModelId = modelIdMap[model] || "claude-sonnet-4-5";

    // Check if this is a retry request with error context
    const retryContext = (body as { retryContext?: { failedChanges: FlowChanges; evalResult: EvaluationResult } }).retryContext;

    let finalSystemPrompt = systemPrompt;
    if (retryContext) {
      // Append retry context to system prompt
      finalSystemPrompt = systemPrompt + "\n\n" + buildRetryContext(retryContext.failedChanges, retryContext.evalResult);
    }

    // Build provider options based on thinking settings
    const providerOptions: AnthropicProviderOptions = {};

    if (thinkingEnabled) {
      providerOptions.thinking = {
        type: "enabled",
        budgetTokens: 10000,
      };
    }

    // Stream response from selected Claude model
    const result = streamText({
      model: anthropic(anthropicModelId),
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
            // Send usage data at the end
            const usage = await result.usage;
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: "usage", usage }) + "\n")
            );
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

    // For non-thinking mode, stream NDJSON with text and usage
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of result.fullStream) {
            if (part.type === "text-delta") {
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: "text", content: part.text }) + "\n")
              );
            }
          }
          // Send usage data at the end
          const usage = await result.usage;
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "usage", usage }) + "\n")
          );
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
  } catch (error) {
    console.error("Autopilot error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Autopilot failed" },
      { status: 500 }
    );
  }
}
