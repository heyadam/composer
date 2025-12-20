import { NextRequest, NextResponse } from "next/server";
import { evaluateFlowChanges } from "@/lib/autopilot/evaluator";
import type { FlowSnapshot, FlowChanges } from "@/lib/autopilot/types";

interface EvaluateRequest {
  userRequest: string;
  flowSnapshot: FlowSnapshot;
  changes: FlowChanges;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EvaluateRequest;
    const { userRequest, flowSnapshot, changes } = body;

    if (!userRequest || !flowSnapshot || !changes) {
      return NextResponse.json(
        { error: "userRequest, flowSnapshot, and changes are required" },
        { status: 400 }
      );
    }

    // Programmatic validation - fast and deterministic
    const result = evaluateFlowChanges({
      userRequest,
      flowSnapshot,
      changes,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Evaluate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Evaluation failed" },
      { status: 500 }
    );
  }
}
