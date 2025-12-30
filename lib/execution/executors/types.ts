/**
 * Node executor types and interfaces
 *
 * Defines the contract for node executors and their execution context.
 */

import type { Node, Edge } from "@xyflow/react";
import type { ApiKeys } from "@/lib/api-keys";
import type { DebugInfo, NodeExecutionState, ExecuteOptions } from "../types";

/**
 * Result returned by a node executor
 */
export interface ExecuteNodeResult {
  /** Primary output value */
  output: string;
  /** Reasoning/thinking output (for models that support it) */
  reasoning?: string;
  /** Debug information for API calls */
  debugInfo?: DebugInfo;
  /** Auto-generated code for ai-logic nodes */
  generatedCode?: string;
  /** Explanation for auto-generated code */
  codeExplanation?: string;
  /** Output node: string/text input */
  stringOutput?: string;
  /** Output node: image input */
  imageOutput?: string;
  /** Output node: audio input */
  audioOutput?: string;
  /** Output node: code input (renders as website preview) */
  codeOutput?: string;
  /** Switch node: updated state after execution */
  switchState?: boolean;
}

/**
 * Callback for streaming output updates
 */
export type StreamUpdateCallback = (
  output: string,
  debugInfo?: DebugInfo,
  reasoning?: string
) => void;

/**
 * Callback for node state changes (used for awaiting input states)
 */
export type NodeStateChangeCallback = (
  nodeId: string,
  state: NodeExecutionState
) => void;

/**
 * Context provided to node executors
 */
export interface ExecutionContext {
  /** The node being executed */
  node: Node;
  /** Inputs collected from upstream nodes, keyed by handle ID */
  inputs: Record<string, string>;
  /** Shared context for the flow execution */
  context: Record<string, unknown>;
  /** API keys for provider authentication */
  apiKeys?: ApiKeys;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Options for owner-funded execution */
  options?: ExecuteOptions;
  /** All edges in the flow (for checking connections) */
  edges?: Edge[];
  /** Callback for streaming output updates */
  onStreamUpdate?: StreamUpdateCallback;
  /** Callback for node state changes */
  onNodeStateChange?: NodeStateChangeCallback;
}

/**
 * Interface for node executors
 *
 * Each node type should implement this interface to handle its execution logic.
 */
export interface NodeExecutor {
  /** The node type this executor handles (e.g., "text-generation") */
  type: string;

  /**
   * Whether this node has a "done" pulse output.
   * When true, the engine will emit a pulse when execution completes.
   */
  hasPulseOutput?: boolean;

  /**
   * Whether downstream output nodes should be marked as running when this node executes.
   * Used for streaming nodes that produce output visible in downstream preview nodes.
   */
  shouldTrackDownstream?: boolean;

  /**
   * Execute the node with the given context.
   * @param ctx - The execution context
   * @returns The execution result
   */
  execute(ctx: ExecutionContext): Promise<ExecuteNodeResult>;
}

/**
 * Helper to create a simple executor that just passes through inputs
 */
export function createPassthroughExecutor(type: string): NodeExecutor {
  return {
    type,
    execute: async (ctx) => ({
      output: ctx.inputs["prompt"] || ctx.inputs["input"] || Object.values(ctx.inputs)[0] || "",
    }),
  };
}
