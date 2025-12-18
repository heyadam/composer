import { NextRequest, NextResponse } from "next/server";

const VALID_PASSWORD = process.env.API_KEYS_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    // Fail closed if password not configured
    if (!VALID_PASSWORD) {
      return NextResponse.json(
        { error: "Password unlock not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (password !== VALID_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Return the API keys from environment variables
    const keys = {
      openai: process.env.OPENAI_API_KEY || undefined,
      google: process.env.GOOGLE_GENERATIVE_AI_API_KEY || undefined,
      anthropic: process.env.ANTHROPIC_API_KEY || undefined,
    };

    // Filter out undefined values
    const filteredKeys = Object.fromEntries(
      Object.entries(keys).filter(([, v]) => v !== undefined)
    );

    return NextResponse.json({ keys: filteredKeys });
  } catch (error) {
    console.error("Auth keys error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed" },
      { status: 500 }
    );
  }
}
