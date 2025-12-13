import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildSystemPrompt } from "@/lib/autopilot/system-prompt";
import type { AutopilotRequest } from "@/lib/autopilot/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AutopilotRequest;
    const { messages, flowSnapshot, model = "claude-sonnet-4-5" } = body;

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

    // Build system prompt with current flow state
    const systemPrompt = buildSystemPrompt(flowSnapshot);

    // Stream response from Claude
    const result = streamText({
      model: anthropic(model),
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      maxOutputTokens: 4000,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Autopilot error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Autopilot failed" },
      { status: 500 }
    );
  }
}
