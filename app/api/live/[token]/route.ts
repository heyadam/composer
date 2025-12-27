import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { FlowNodeRecord, FlowEdgeRecord } from "@/lib/flows/types";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/live/[token] - Get a live flow by share token
 *
 * Token-gated access using the get_live_flow RPC.
 * Anyone with a valid token can access the full flow data.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Validate token format
    if (!token || !/^[a-zA-Z0-9]{12}$/.test(token)) {
      return NextResponse.json(
        { success: false, error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Call the RPC to get the flow
    const { data, error } = await supabase.rpc("get_live_flow", {
      p_share_token: token,
    });

    if (error) {
      console.error("Error calling get_live_flow RPC:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch flow" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Flow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Error in GET /api/live/[token]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/live/[token] - Update a live flow via share token
 *
 * Token-gated write access for collaboration.
 * Anyone with a valid token can update nodes, edges, and metadata.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Validate token format
    if (!token || !/^[a-zA-Z0-9]{12}$/.test(token)) {
      return NextResponse.json(
        { success: false, error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const {
      nodes = [],
      edges = [],
      deletedNodeIds = [],
      deletedEdgeIds = [],
      name,
      description,
      allowPublicExecute,
    } = body;

    // Transform node data for the RPC
    const nodePayloads = nodes.map((node: FlowNodeRecord) => ({
      id: node.id,
      type: node.type,
      position_x: node.position_x,
      position_y: node.position_y,
      width: node.width,
      height: node.height,
      data: node.data,
      private_data: node.private_data,
      parent_id: node.parent_id,
    }));

    // Transform edge data for the RPC
    const edgePayloads = edges.map((edge: FlowEdgeRecord) => ({
      id: edge.id,
      source_node_id: edge.source_node_id,
      source_handle: edge.source_handle,
      target_node_id: edge.target_node_id,
      target_handle: edge.target_handle,
      edge_type: edge.edge_type,
      data: edge.data,
    }));

    // Call the RPC to update the flow
    const { data, error } = await supabase.rpc("update_live_flow", {
      p_share_token: token,
      p_nodes: nodePayloads,
      p_edges: edgePayloads,
      p_deleted_node_ids: deletedNodeIds,
      p_deleted_edge_ids: deletedEdgeIds,
      p_name: name ?? null,
      p_description: description ?? null,
      p_allow_public_execute: allowPublicExecute ?? null,
    });

    if (error) {
      console.error("Error calling update_live_flow RPC:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update flow" },
        { status: 500 }
      );
    }

    if (!data?.success) {
      return NextResponse.json(
        { success: false, error: data?.error || "Update failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/live/[token]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
