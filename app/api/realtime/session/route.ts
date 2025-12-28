import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptKeys } from "@/lib/encryption";

// In-memory rate limiting (should use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;  // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;      // 10 sessions per minute per IP/token
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;  // Cleanup every 5 minutes
let lastCleanup = Date.now();

function cleanupRateLimitMap(): void {
  const now = Date.now();
  // Only cleanup if enough time has passed
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();

  // Periodic cleanup to prevent memory leak
  cleanupRateLimitMap();

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * POST /api/realtime/session - Get ephemeral token for WebRTC connection
 *
 * Supports two modes:
 * 1. User-provided API key: { apiKeys: { openai: "..." }, voice, instructions }
 * 2. Owner-funded execution: { shareToken, voice, instructions }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKeys, voice, instructions, shareToken } = body;

    // Rate limit by IP or share token
    const clientId = shareToken || request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before starting another session." },
        { status: 429 }
      );
    }

    let openaiKey: string | undefined;

    // Owner-funded execution path
    if (shareToken) {
      const supabase = await createClient();

      // Check rate limits via database
      const { data: minuteLimit, error: minuteError } = await supabase
        .rpc("check_minute_rate_limit", {
          p_share_token: shareToken,
          p_limit: 10,
        })
        .single<{ allowed: boolean; current_count: number; reset_at: string }>();

      if (minuteError) {
        console.error("Rate limit check failed:", minuteError);
        return NextResponse.json(
          { error: "Rate limit check unavailable" },
          { status: 503 }
        );
      }

      if (!minuteLimit?.allowed) {
        return NextResponse.json(
          { error: "Rate limit exceeded for this flow" },
          { status: 429 }
        );
      }

      // Log execution
      const { error: logError } = await supabase.rpc("log_execution", { p_share_token: shareToken });
      if (logError) {
        console.error("Failed to log execution:", logError);
      }

      // Get owner's encrypted keys
      const { data: encryptedKeys, error: keysError } = await supabase.rpc(
        "get_owner_keys_for_execution",
        { p_share_token: shareToken }
      );

      if (keysError) {
        console.error("Failed to fetch owner keys:", keysError);
        return NextResponse.json(
          { error: "Failed to fetch owner keys" },
          { status: 500 }
        );
      }

      if (encryptedKeys) {
        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
          console.error("ENCRYPTION_KEY not configured");
          return NextResponse.json(
            { error: "Server configuration error" },
            { status: 500 }
          );
        }

        try {
          const decrypted = decryptKeys(encryptedKeys, encryptionKey);
          openaiKey = decrypted.openai;
        } catch (err) {
          console.error("Error decrypting owner keys:", err);
        }
      }

      if (!openaiKey) {
        return NextResponse.json(
          { error: "Flow owner has not configured OpenAI API key" },
          { status: 400 }
        );
      }
    } else {
      // User-provided API key path
      openaiKey = apiKeys?.openai;
    }

    if (!openaiKey) {
      return NextResponse.json(
        { error: "OpenAI API key required" },
        { status: 400 }
      );
    }

    // Request ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: voice || "marin",
        instructions: instructions || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI Realtime API error:", error);
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      clientSecret: data.client_secret.value,
      expiresAt: data.client_secret.expires_at,
    });
  } catch (error) {
    console.error("Realtime session error:", error);
    return NextResponse.json(
      { error: "Failed to create realtime session" },
      { status: 500 }
    );
  }
}
