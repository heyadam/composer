/**
 * MCP Job Cleanup Endpoint
 *
 * Cron endpoint to clean up expired MCP jobs.
 * Should be called periodically (e.g., every hour via Vercel Cron).
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/mcp/cleanup",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/mcp/job-store";

// Vercel Cron sends this header to authenticate
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/mcp/cleanup
 *
 * Triggers cleanup of expired jobs. Protected by CRON_SECRET when configured.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret if configured
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const deletedCount = await jobStore.cleanup();

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("MCP cleanup failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
