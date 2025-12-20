import { NextRequest, NextResponse } from "next/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { FlowSnapshot } from "@/lib/autopilot/types";

interface ApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
}

interface SuggestionsRequest {
  flowSnapshot: FlowSnapshot;
  apiKeys?: ApiKeys;
}

export interface Suggestion {
  icon: string;
  text: string;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { icon: "Image", text: "Generate portraits in 3 art styles" },
  { icon: "Sparkles", text: "Write a poem and illustrate it" },
  { icon: "Languages", text: "Translate a story to 5 languages" },
  { icon: "Bot", text: "Compare haikus from different AIs" },
];

// Valid icon names that map to lucide-react icons (no Code icon to discourage code suggestions)
const VALID_ICONS = [
  "FileText", "Image", "Languages", "BarChart", "Palette", "RefreshCw",
  "Sparkles", "Bot", "Mail", "Lightbulb", "MessageSquare",
  "Search", "Wand2", "Pencil", "BookOpen", "Music", "Globe", "Zap", "GitBranch"
];

const SYSTEM_PROMPT = `Generate 4 creative workflow ideas for Composer, a visual tool where users connect AI nodes to build pipelines.

IMPORTANT - Focus on CREATIVE, non-technical workflows:
- Image generation and visual art
- Storytelling with illustrations
- Multi-language content
- Comparing AI model outputs side-by-side
- Text-to-image pipelines
- Creative writing with visuals

DO NOT suggest:
- Code generation or programming
- React components or web development
- Technical/developer tasks
- Data processing or APIs
- Anything code-related

Example good suggestions:
- "Generate portraits in 3 art styles"
- "Write a poem and illustrate it"
- "Translate a story to 5 languages"
- "Compare haikus from different AIs"
- "Create a comic strip from a plot"
- "Design album art from song lyrics"
- "Generate travel postcards from descriptions"
- "Write and visualize a children's story"

Return JSON array with icon and text. Icons: Image, Sparkles, Languages, Bot, Palette, Wand2, Lightbulb, Pencil, BookOpen, Globe.

Output (JSON only, no markdown):
[{"icon":"Image","text":"..."},{"icon":"Sparkles","text":"..."},{"icon":"Languages","text":"..."},{"icon":"Palette","text":"..."}]`;

function buildPrompt(flowSnapshot: FlowSnapshot): string {
  const nodeCount = flowSnapshot.nodes.length;
  const nodeTypes = flowSnapshot.nodes.map(n => n.type);

  if (nodeCount <= 1) {
    return "The workflow is empty. Suggest common starter workflows.";
  }

  const nodeDescriptions = flowSnapshot.nodes.map(n => {
    const label = n.data?.label || n.type;
    return `- ${label} (${n.type})`;
  }).join("\n");

  return `Current workflow has ${nodeCount} nodes:
${nodeDescriptions}

Node types present: ${[...new Set(nodeTypes)].join(", ")}

Suggest ways to extend or modify this workflow.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SuggestionsRequest;
    const { flowSnapshot, apiKeys } = body;

    const apiKey = apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Return defaults if no API key
      return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS });
    }

    const anthropic = createAnthropic({ apiKey });

    const result = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(flowSnapshot || { nodes: [], edges: [] }),
      maxOutputTokens: 200,
    });

    // Parse JSON response
    const text = result.text.trim();

    function isValidSuggestion(s: unknown): s is Suggestion {
      return (
        typeof s === "object" &&
        s !== null &&
        typeof (s as Suggestion).icon === "string" &&
        typeof (s as Suggestion).text === "string" &&
        VALID_ICONS.includes((s as Suggestion).icon)
      );
    }

    function validateAndNormalize(parsed: unknown): Suggestion[] | null {
      if (!Array.isArray(parsed) || parsed.length < 4) return null;
      const valid = parsed.slice(0, 4).filter(isValidSuggestion);
      if (valid.length === 4) return valid;
      return null;
    }

    try {
      const parsed = JSON.parse(text);
      const suggestions = validateAndNormalize(parsed);
      if (suggestions) {
        return NextResponse.json({ suggestions });
      }
    } catch {
      // Try to extract array from response
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          const suggestions = validateAndNormalize(parsed);
          if (suggestions) {
            return NextResponse.json({ suggestions });
          }
        } catch {
          // Fall through to default
        }
      }
    }

    // Fallback to defaults
    return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS });
  } catch (error) {
    console.error("Suggestions error:", error);
    return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS });
  }
}
