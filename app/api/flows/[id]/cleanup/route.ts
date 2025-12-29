import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CleanupRequest {
  nodeCount: number;
}

/**
 * POST /api/flows/[id]/cleanup - Cleanup flow on page unload
 *
 * Called via sendBeacon when user leaves the page.
 * - If flow is empty (nodeCount === 0) and name is "Untitled": DELETE the flow
 * - If flow has nodes and name is "Untitled": RENAME to "Draft - {live_id}"
 * - Otherwise: no-op (flow was explicitly named/saved)
 *
 * This endpoint is idempotent - safe to call multiple times.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // No auth for sendBeacon - just return success to avoid errors
      return NextResponse.json({ success: true, action: "skipped", reason: "no_auth" });
    }

    // Parse request body
    let body: CleanupRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { nodeCount } = body;

    if (typeof nodeCount !== "number") {
      return NextResponse.json(
        { success: false, error: "nodeCount is required" },
        { status: 400 }
      );
    }

    // Fetch the flow record to check ownership and name
    const { data: flowRecord, error: fetchError } = await supabase
      .from("flows")
      .select("name, live_id, storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !flowRecord) {
      // Flow doesn't exist or user doesn't own it - no-op
      return NextResponse.json({ success: true, action: "skipped", reason: "not_found" });
    }

    // Only process flows named "Untitled"
    if (flowRecord.name !== "Untitled") {
      return NextResponse.json({ success: true, action: "skipped", reason: "already_named" });
    }

    // Empty flow - delete it
    if (nodeCount === 0) {
      // Delete from storage (best effort)
      await supabase.storage.from("flows").remove([flowRecord.storage_path]);

      // Delete the flow record (cascades to flow_nodes/flow_edges via FK)
      const { error: deleteError } = await supabase
        .from("flows")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Error deleting empty flow:", deleteError);
        return NextResponse.json(
          { success: false, error: "Failed to delete flow" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, action: "deleted" });
    }

    // Non-empty flow - rename to draft
    const draftName = `Draft - ${flowRecord.live_id}`;

    const { error: updateError } = await supabase
      .from("flows")
      .update({ name: draftName })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error renaming flow to draft:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to rename flow" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, action: "renamed", name: draftName });
  } catch (error) {
    console.error("Error in POST /api/flows/[id]/cleanup:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
