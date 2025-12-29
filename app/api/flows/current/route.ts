import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FlowRecord } from "@/lib/flows/types";

/**
 * Response type for current flow API
 */
interface CurrentFlowResponse {
  success: boolean;
  flow?: FlowRecord;
  isNew?: boolean;
  error?: string;
}

/**
 * GET /api/flows/current - Get or create the user's current (most recently accessed) flow
 *
 * Returns the most recently accessed flow for the authenticated user.
 * If no flows exist, creates a new one with auto-generated tokens.
 * Updates last_accessed_at to mark this flow as current.
 */
export async function GET(): Promise<NextResponse<CurrentFlowResponse>> {
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

    // Use RPC to get or create current flow atomically
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "get_or_create_current_flow",
      { p_user_id: user.id }
    );

    if (rpcError) {
      console.error("Error getting current flow:", rpcError);
      return NextResponse.json(
        { success: false, error: "Failed to get current flow" },
        { status: 500 }
      );
    }

    if (!rpcResult || rpcResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "No flow returned" },
        { status: 500 }
      );
    }

    const result = rpcResult[0];

    // Fetch full flow record if this is an existing flow
    // (RPC returns minimal data, we need full record for client)
    const { data: flowRecord, error: fetchError } = await supabase
      .from("flows")
      .select()
      .eq("id", result.id)
      .single();

    if (fetchError) {
      console.error("Error fetching flow record:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch flow record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      flow: flowRecord as FlowRecord,
      isNew: result.is_new,
    });
  } catch (error) {
    console.error("Error in GET /api/flows/current:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
