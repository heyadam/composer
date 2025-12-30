/**
 * MCP Output Fetch API
 *
 * Serves raw binary outputs (images, audio) for completed MCP jobs.
 * Used by resource links to fetch full output data without bloating context.
 *
 * GET /api/mcp/outputs/:jobId/:outputKey
 *
 * Security:
 * - Job IDs are unguessable (UUID-based)
 * - Jobs expire after 1 hour (cleaned up by cron)
 * - No authentication required (job_id acts as a capability token)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/mcp/job-store";

/**
 * Validate job ID format: job_ followed by 16 alphanumeric characters
 */
function isValidJobId(jobId: string): boolean {
  return /^job_[a-zA-Z0-9]{16}$/.test(jobId);
}

/**
 * Get MIME type to file extension mapping
 */
function getExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "text/jsx": "jsx",
    "text/plain": "txt",
  };
  return mimeToExt[mimeType] || "bin";
}

/**
 * GET /api/mcp/outputs/:jobId/:outputKey
 *
 * Fetches a single output from a completed job.
 * Returns raw binary data with appropriate Content-Type.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; outputKey: string }> }
) {
  const { jobId, outputKey } = await params;

  // Validate job ID format
  if (!isValidJobId(jobId)) {
    return NextResponse.json(
      { error: "Invalid job ID format" },
      { status: 400 }
    );
  }

  // URL-decode the output key (handles spaces and special characters)
  const decodedKey = decodeURIComponent(outputKey);

  // Fetch job from store
  const job = await jobStore.get(jobId);

  if (!job) {
    return NextResponse.json(
      { error: "Job not found. Jobs expire after 1 hour." },
      { status: 404 }
    );
  }

  // Check job is completed
  if (job.status !== "completed") {
    return NextResponse.json(
      { error: `Job is ${job.status}. Outputs are only available for completed jobs.` },
      { status: 400 }
    );
  }

  // Check outputs exist
  if (!job.outputs) {
    return NextResponse.json(
      { error: "No outputs available for this job." },
      { status: 404 }
    );
  }

  // Find the requested output
  const output = job.outputs[decodedKey];

  if (!output) {
    // List available keys in error for debugging
    const availableKeys = Object.keys(job.outputs);
    return NextResponse.json(
      {
        error: `Output "${decodedKey}" not found.`,
        available: availableKeys,
      },
      { status: 404 }
    );
  }

  // Determine content type
  const contentType = output.mimeType || (
    output.type === "image" ? "image/png" :
    output.type === "audio" ? "audio/webm" :
    output.type === "code" ? "text/jsx" :
    "text/plain"
  );

  // Generate filename
  const extension = getExtension(contentType);
  const filename = `${decodedKey}.${extension}`;

  // For binary types (image, audio), decode from base64
  if (output.type === "image" || output.type === "audio") {
    const buffer = Buffer.from(output.value, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour (job TTL)
      },
    });
  }

  // For text types (text, code), return as-is
  return new NextResponse(output.value, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": Buffer.byteLength(output.value, "utf-8").toString(),
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
