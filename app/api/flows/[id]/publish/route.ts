import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateShareToken, generateLiveId } from "@/lib/encryption";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/flows/[id]/publish - Publish a flow (generate live_id + share_token)
 *
 * Only the flow owner can publish. Returns the share token for sharing.
 * Also handles _method: "DELETE" for sendBeacon-based unpublish on page unload.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check for method override (used by sendBeacon for unpublish on page unload)
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        const body = await request.clone().json();
        if (body._method === "DELETE") {
          // Delegate to DELETE handler
          return DELETE(request, { params: Promise.resolve({ id }) });
        }
      } catch {
        // Not JSON or parse error, continue with normal POST
      }
    }

    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch the flow record to verify ownership
    const { data: flowRecord, error: fetchError } = await supabase
      .from("flows")
      .select("id, live_id, share_token")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !flowRecord) {
      return NextResponse.json(
        { success: false, error: "Flow not found" },
        { status: 404 }
      );
    }

    // If already published, return existing values
    if (flowRecord.live_id && flowRecord.share_token) {
      return NextResponse.json({
        success: true,
        live_id: flowRecord.live_id,
        share_token: flowRecord.share_token,
        already_published: true,
      });
    }

    // Generate new live_id and share_token
    // Try up to 5 times to avoid collisions on live_id
    let live_id: string | null = null;
    let share_token: string | null = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const candidateLiveId = generateLiveId();
      const candidateShareToken = generateShareToken();

      // Try to update - unique constraints will reject duplicates
      const { data: updated, error: updateError } = await supabase
        .from("flows")
        .update({
          live_id: candidateLiveId,
          share_token: candidateShareToken,
          use_owner_keys: true, // Enable owner-funded execution by default
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("live_id, share_token, use_owner_keys")
        .single();

      if (!updateError && updated) {
        live_id = updated.live_id;
        share_token = updated.share_token;
        break;
      }

      // If it's a unique constraint violation, retry with new values
      if (updateError?.code === "23505") {
        attempts++;
        continue;
      }

      // Other error - fail
      console.error("Error publishing flow:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to publish flow" },
        { status: 500 }
      );
    }

    if (!live_id || !share_token) {
      return NextResponse.json(
        { success: false, error: "Failed to generate unique share ID after multiple attempts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      live_id,
      share_token,
      use_owner_keys: true,
      already_published: false,
    });
  } catch (error) {
    console.error("Error in POST /api/flows/[id]/publish:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/flows/[id]/publish - Unpublish a flow (remove live_id + share_token)
 *
 * Only the flow owner can unpublish. This revokes all shared access.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Update the flow to remove live_id and share_token
    const { error: updateError } = await supabase
      .from("flows")
      .update({
        live_id: null,
        share_token: null,
        allow_public_execute: false,
        use_owner_keys: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error unpublishing flow:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to unpublish flow" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/flows/[id]/publish:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/flows/[id]/publish - Update publish settings (owner only)
 *
 * Only the flow owner can update publish settings (use_owner_keys, allow_public_execute).
 * This is separate from the token-gated updateLiveFlow to prevent collaborators from
 * enabling owner-funded execution.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user (owner authentication)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { useOwnerKeys, allowPublicExecute } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof useOwnerKeys === "boolean") {
      updates.use_owner_keys = useOwnerKeys;
    }
    if (typeof allowPublicExecute === "boolean") {
      updates.allow_public_execute = allowPublicExecute;
    }

    // Update with owner verification (user_id check)
    const { error: updateError } = await supabase
      .from("flows")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating publish settings:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/flows/[id]/publish:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
