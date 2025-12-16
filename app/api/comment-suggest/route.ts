import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

interface ApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
}

interface ChildNodeInfo {
  id: string;
  type: string;
  label?: string;
  data?: Record<string, unknown>;
}

interface CommentSuggestRequest {
  childNodes: ChildNodeInfo[];
  apiKeys?: ApiKeys;
}

const systemPrompt = `You are a helpful labeler for AI workflow diagrams. Given a list of child nodes (with their types, labels, and prompt contents), generate a clear title and informative description.

Format your response EXACTLY as:
TITLE: [title here]
DESCRIPTION: [description here]

Guidelines:
- Title: 2-5 words, Title Case, captures the workflow's purpose
- Description: 1-2 sentences explaining what this workflow does, referencing specific details from the prompts when helpful (e.g., "Analyzes customer feedback and generates a summary report" or "Takes an image and applies artistic style transfer based on the user's prompt")
- Focus on the end-to-end flow: what goes in, what processing happens, what comes out
- Use plain language the user would understand
- No trailing periods on title, but descriptions can have them`;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CommentSuggestRequest;
    const { childNodes, apiKeys } = body;

    if (!childNodes || !Array.isArray(childNodes) || childNodes.length === 0) {
      return NextResponse.json(
        { error: "Child nodes array is required" },
        { status: 400 }
      );
    }

    // Build user prompt describing the child nodes with relevant details
    const nodeDescriptions = childNodes.map((n) => {
      const parts: string[] = [`- ${n.type}`];
      if (n.label) parts.push(`"${n.label}"`);

      // Include relevant data based on node type
      const details: string[] = [];
      if (n.data?.userPrompt) details.push(`prompt: "${n.data.userPrompt}"`);
      if (n.data?.systemPrompt) details.push(`system: "${n.data.systemPrompt}"`);
      if (n.data?.transformPrompt) details.push(`transform: "${n.data.transformPrompt}"`);
      if (n.data?.inputValue) details.push(`input: "${n.data.inputValue}"`);
      if (n.data?.prompt) details.push(`prompt: "${n.data.prompt}"`);
      if (n.data?.provider) details.push(`provider: ${n.data.provider}`);
      if (n.data?.model) details.push(`model: ${n.data.model}`);

      if (details.length > 0) {
        parts.push(`(${details.join(", ")})`);
      }
      return parts.join(" ");
    });

    const userPrompt = `Child nodes:\n${nodeDescriptions.join("\n")}`;

    // Create Anthropic client with custom or env API key
    const anthropic = createAnthropic({
      apiKey: apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY,
    });

    // Stream response from Claude
    const result = streamText({
      model: anthropic("claude-sonnet-4-5"),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 300,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Comment suggest error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Comment suggest failed" },
      { status: 500 }
    );
  }
}
