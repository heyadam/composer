import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, input } = body;

    if (type === "prompt") {
      const { prompt, model } = body;
      const messages: { role: "system" | "user"; content: string }[] = [];
      if (typeof prompt === "string" && prompt.trim().length > 0) {
        messages.push({ role: "system", content: prompt.trim() });
      }
      messages.push({ role: "user", content: String(input ?? "") });

      const result = streamText({
        model: openai(model || "gpt-5.2"),
        messages,
        maxOutputTokens: 1000,
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
