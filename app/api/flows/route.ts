import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SavedFlow } from "@/lib/flow-storage/types";
import type { FlowListItem, FlowRecord } from "@/lib/flows/types";
import { nodesToRecords, edgesToRecords } from "@/lib/flows/transform";

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
 *
 * Saves to both Storage (backup) and DB tables (primary).
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

    // Create the flow record atomically with tokens using RPC
    // RPC generates unique ID and storage path internally
    const tempStoragePath = `${user.id}/${crypto.randomUUID()}.json`;
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "create_flow_with_tokens",
      {
        p_user_id: user.id,
        p_name: flow.metadata.name,
        p_storage_path: tempStoragePath,
      }
    );

    if (rpcError || !rpcResult || rpcResult.length === 0) {
      console.error("Error creating flow with tokens:", rpcError);
      return NextResponse.json(
        { success: false, error: "Failed to create flow record" },
        { status: 500 }
      );
    }

    // RPC returns array, get first row
    const createdFlow = rpcResult[0];
    const actualFlowId = createdFlow.id;
    const actualStoragePath = createdFlow.storage_path;

    // Upload flow content to storage (backup)
    const flowJson = JSON.stringify(flow);
    const { error: uploadError } = await supabase.storage
      .from("flows")
      .upload(actualStoragePath, flowJson, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading flow to storage:", uploadError);
      // Continue anyway - DB is the primary storage now
    }

    // Fetch the full flow record for response
    const { data: flowRecord, error: fetchError } = await supabase
      .from("flows")
      .select()
      .eq("id", actualFlowId)
      .single();

    if (fetchError) {
      console.error("Error fetching created flow:", fetchError);
      // Flow was created, just can't return full record
    }

    // Insert nodes into DB
    if (flow.nodes.length > 0) {
      const nodeRecords = nodesToRecords(flow.nodes, actualFlowId);
      const { error: insertNodesError } = await supabase
        .from("flow_nodes")
        .insert(nodeRecords);

      if (insertNodesError) {
        console.error("Error inserting nodes:", insertNodesError);
        // Clean up on failure
        const { error: cleanupFlowError } = await supabase
          .from("flows")
          .delete()
          .eq("id", actualFlowId);
        if (cleanupFlowError) {
          console.error("Cleanup: failed to delete flow:", cleanupFlowError);
        }
        const { error: cleanupStorageError } = await supabase.storage
          .from("flows")
          .remove([actualStoragePath]);
        if (cleanupStorageError) {
          console.error("Cleanup: failed to delete storage:", cleanupStorageError);
        }
        return NextResponse.json(
          { success: false, error: "Failed to save nodes" },
          { status: 500 }
        );
      }
    }

    // Insert edges into DB
    if (flow.edges.length > 0) {
      const edgeRecords = edgesToRecords(flow.edges, actualFlowId);
      const { error: insertEdgesError } = await supabase
        .from("flow_edges")
        .insert(edgeRecords);

      if (insertEdgesError) {
        console.error("Error inserting edges:", insertEdgesError);
        // Clean up on failure
        const { error: cleanupNodesError } = await supabase
          .from("flow_nodes")
          .delete()
          .eq("flow_id", actualFlowId);
        if (cleanupNodesError) {
          console.error("Cleanup: failed to delete nodes:", cleanupNodesError);
        }
        const { error: cleanupFlowError } = await supabase
          .from("flows")
          .delete()
          .eq("id", actualFlowId);
        if (cleanupFlowError) {
          console.error("Cleanup: failed to delete flow:", cleanupFlowError);
        }
        const { error: cleanupStorageError } = await supabase.storage
          .from("flows")
          .remove([actualStoragePath]);
        if (cleanupStorageError) {
          console.error("Cleanup: failed to delete storage:", cleanupStorageError);
        }
        return NextResponse.json(
          { success: false, error: "Failed to save edges" },
          { status: 500 }
        );
      }
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
