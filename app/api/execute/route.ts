import { NextRequest, NextResponse } from "next/server";
import { streamText, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";

function getModel(provider: string, model: string): LanguageModel {
  switch (provider) {
    case "google":
      return google(model);
    case "anthropic":
      return anthropic(model);
    default:
      return openai(model);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, input } = body;

    if (type === "prompt") {
      const { prompt, provider, model, verbosity, thinking } = body;
      const messages: { role: "system" | "user"; content: string }[] = [];
      if (typeof prompt === "string" && prompt.trim().length > 0) {
        messages.push({ role: "system", content: prompt.trim() });
      }
      messages.push({ role: "user", content: String(input ?? "") });

      // Build provider options for OpenAI
      const openaiOptions: Record<string, string> = {};
      if (provider === "openai" || !provider) {
        if (verbosity) {
          openaiOptions.textVerbosity = verbosity;
        }
        if (thinking) {
          openaiOptions.reasoningSummary = "auto";
        }
      }

      const result = streamText({
        model: getModel(provider || "openai", model || "gpt-5"),
        messages,
        maxOutputTokens: 1000,
        ...(Object.keys(openaiOptions).length > 0 && {
          providerOptions: { openai: openaiOptions },
        }),
      });

      return result.toTextStreamResponse();
    }

    return NextResponse.json({ error: "Unknown execution type" }, { status: 400 });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}
