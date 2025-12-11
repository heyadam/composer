import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, input, context } = body;

    switch (type) {
      case "prompt": {
        const { prompt, model } = body;
        const userInput = context?.userInput || input;

        const messages: { role: "system" | "user"; content: string }[] = [];
        if (typeof prompt === "string" && prompt.trim().length > 0) {
          messages.push({ role: "system", content: prompt.trim() });
        }

        const completion = await openai.chat.completions.create({
          model: model || "gpt-4",
          messages: messages.concat([
            {
              role: "user",
              content: `Original user question: ${userInput}\n\nCurrent input from previous step: ${input}`,
            },
          ]),
          max_tokens: 1000,
        });

        const output = completion.choices[0]?.message?.content || "";
        return NextResponse.json({ output });
      }

      case "tool": {
        const { toolName } = body;
        const userInput = context?.userInput || input;

        // Simple tool implementations
        switch (toolName) {
          case "web_search": {
            // Simulated web search - in production, integrate with a real search API
            const searchQuery = userInput;
            return NextResponse.json({
              output: `[Web Search Results for: "${searchQuery}"]\n\nThis is a simulated search result. In production, integrate with Serper, Tavily, or Google Custom Search API.\n\nTop results for "${searchQuery}":\n1. Relevant information about ${searchQuery}\n2. Additional findings related to your query\n3. More context and details\n\nNote: This is simulated data. Connect a real search API for actual results.`,
            });
          }

          case "calculator": {
            try {
              // Simple math evaluation (be careful with eval in production!)
              const result = Function(`"use strict"; return (${input})`)();
              return NextResponse.json({ output: String(result) });
            } catch {
              return NextResponse.json({ output: `Could not calculate: ${input}` });
            }
          }

          case "current_time": {
            return NextResponse.json({
              output: new Date().toLocaleString(),
            });
          }

          default:
            return NextResponse.json({
              output: `Tool "${toolName}" executed with input: ${input}`,
            });
        }
      }

      case "condition": {
        const { condition } = body;

        // Use LLM to evaluate the condition based on the input
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are evaluating a condition. Based on the input provided, determine if the following condition is true or false: "${condition}"\n\nRespond with ONLY "true" or "false", nothing else.`,
            },
            {
              role: "user",
              content: input,
            },
          ],
          max_tokens: 10,
        });

        const response = completion.choices[0]?.message?.content?.toLowerCase().trim();
        const result = response === "true";

        return NextResponse.json({ result, output: result ? "Condition: true" : "Condition: false" });
      }

      default:
        return NextResponse.json({ error: "Unknown execution type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}
