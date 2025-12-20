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

const SYSTEM_PROMPT = `Generate 4 short workflow ideas (4-8 words each, NO MORE).

CRITICAL RULES:
- Each suggestion MUST be 4-8 words only
- NO code, NO React, NO programming, NO technical tasks
- Focus on: images, art, stories, translations, comparing AI outputs
- Be creative and varied

Good examples (4-8 words):
- "Generate portraits in 3 art styles"
- "Write a poem and illustrate it"
- "Translate a story to 5 languages"
- "Compare haikus from different AIs"
- "Create movie posters from plots"
- "Design album art from lyrics"
- "Generate image then stylize it"

BAD (too long, don't do this):
- "Add a Theme Switcher node between Generator and Preview to transform components"

Icons: Image, Sparkles, Languages, Bot, Palette, Wand2, Lightbulb, Pencil, BookOpen, Globe

Output RAW JSON only (no markdown, no code blocks):
[{"icon":"Image","text":"4-8 words here"},{"icon":"Sparkles","text":"4-8 words here"},{"icon":"Languages","text":"4-8 words here"},{"icon":"Bot","text":"4-8 words here"}]`;

function buildPrompt(flowSnapshot: FlowSnapshot): string {
  const nodeCount = flowSnapshot.nodes.length;

  if (nodeCount <= 1) {
    return "Generate 4 creative workflow ideas for someone just starting.";
  }

  return "Generate 4 creative workflow ideas. Be varied and surprising.";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SuggestionsRequest;
    const { flowSnapshot, apiKeys } = body;

    const apiKey = apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.log("[suggestions] No API key, returning defaults");
      return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS });
    }

    console.log("[suggestions] Generating new suggestions...");

    const anthropic = createAnthropic({ apiKey });

    const result = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(flowSnapshot || { nodes: [], edges: [] }),
      maxOutputTokens: 400,
      temperature: 0.9,
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
        console.log("[suggestions] Generated:", suggestions.map(s => s.text));
        return NextResponse.json({ suggestions });
      }
      console.log("[suggestions] Validation failed for:", text);
    } catch {
      // Try to extract array from response
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          const suggestions = validateAndNormalize(parsed);
          if (suggestions) {
            console.log("[suggestions] Generated (extracted):", suggestions.map(s => s.text));
            return NextResponse.json({ suggestions });
          }
        } catch {
          // Fall through to default
        }
      }
      console.log("[suggestions] Failed to parse:", text);
    }

    // Fallback to defaults
    console.log("[suggestions] Returning defaults");
    return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS });
  } catch (error) {
    console.error("[suggestions] Error:", error);
    return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS });
  }
}
