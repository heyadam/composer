import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SavedFlow } from "@/lib/flow-storage/types";
import type { FlowListItem, FlowRecord } from "@/lib/flows/types";

/**
 * GET /api/flows - List all flows for the current user
 */
export async function GET() {
  try {
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

    // Fetch user's flows (metadata only)
    const { data: flows, error } = await supabase
      .from("flows")
      .select("id, name, description, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching flows:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch flows" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      flows: flows as FlowListItem[],
    });
  } catch (error) {
    console.error("Error in GET /api/flows:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flows - Create a new flow
 */
export async function POST(request: NextRequest) {
  try {
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

    // Parse the request body
    const body = await request.json();
    const flow = body.flow as SavedFlow;

    if (!flow || !flow.metadata?.name) {
      return NextResponse.json(
        { success: false, error: "Invalid flow data" },
        { status: 400 }
      );
    }

    // Generate a unique ID for this flow
    const flowId = crypto.randomUUID();
    const storagePath = `${user.id}/${flowId}.json`;

    // Upload flow content to storage
    const flowJson = JSON.stringify(flow);
    const { error: uploadError } = await supabase.storage
      .from("flows")
      .upload(storagePath, flowJson, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading flow to storage:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload flow content" },
        { status: 500 }
      );
    }

    // Create the database record
    const { data: flowRecord, error: insertError } = await supabase
      .from("flows")
      .insert({
        id: flowId,
        user_id: user.id,
        name: flow.metadata.name,
        description: flow.metadata.description || null,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating flow record:", insertError);
      // Try to clean up the uploaded file
      await supabase.storage.from("flows").remove([storagePath]);
      return NextResponse.json(
        { success: false, error: "Failed to create flow record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      flow: flowRecord as FlowRecord,
    });
  } catch (error) {
    console.error("Error in POST /api/flows:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
