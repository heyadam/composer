/**
 * Flow Execution Engine
 *
 * Orchestrates the execution of flows by traversing the graph and
 * delegating node execution to registered executors.
 */

import type { Node, Edge } from "@xyflow/react";
import type { NodeExecutionState, DebugInfo, ExecuteOptions } from "./types";
import type { ApiKeys } from "@/lib/api-keys";
import {
  getOutgoingEdges,
  getTargetNode,
  getIncomingEdges,
  findDownstreamOutputNodes,
  collectNodeInputs,
} from "./graph-utils";
import { getExecutor, hasPulseOutput } from "./executor-registry";
import type { ExecuteNodeResult, ExecutionContext } from "./executors/types";

// Import executors to register them
import "./executors";

// Re-export ExecuteOptions for backward compatibility
export type { ExecuteOptions } from "./types";

/**
 * Execute a single node using its registered executor.
 */
async function executeNode(
  node: Node,
  inputs: Record<string, string>,
  context: Record<string, unknown>,
  apiKeys?: ApiKeys,
  onStreamUpdate?: (output: string, debugInfo?: DebugInfo, reasoning?: string) => void,
  signal?: AbortSignal,
  options?: ExecuteOptions,
  edges?: Edge[],
  onNodeStateChange?: (nodeId: string, state: NodeExecutionState) => void
): Promise<ExecuteNodeResult> {
  const executor = getExecutor(node.type || "");

  if (!executor) {
    // Fallback for unknown node types - pass through first available input
    return {
      output: inputs["prompt"] || inputs["input"] || Object.values(inputs)[0] || "",
    };
  }

  const executionContext: ExecutionContext = {
    node,
    inputs,
    context,
    apiKeys,
    signal,
    options,
    edges,
    onStreamUpdate,
    onNodeStateChange,
  };

  return executor.execute(executionContext);
}

/**
 * Execute a complete flow starting from root nodes.
 */
export async function executeFlow(
  nodes: Node[],
  edges: Edge[],
  onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
  apiKeys?: ApiKeys,
  signal?: AbortSignal,
  options?: ExecuteOptions
): Promise<string> {
  // Check if already cancelled
  if (signal?.aborted) {
    throw new Error("Execution cancelled");
  }

  // Find all root nodes (nodes with no incoming edges) that are connected to the flow
  const rootNodes = nodes.filter((node) => {
    const hasIncoming = getIncomingEdges(node.id, edges).length > 0;
    const hasOutgoing = getOutgoingEdges(node.id, edges).length > 0;
    // Root node: no incoming edges, but has outgoing edges (connected to flow)
    // Also include output nodes with incoming edges as they're endpoints
    return (!hasIncoming && hasOutgoing) || (node.type === "preview-output" && !hasIncoming);
  });

  if (rootNodes.length === 0) {
    throw new Error("No connected nodes found to execute");
  }

  const context: Record<string, unknown> = {};
  const executedOutputs: Record<string, string> = {};
  const executedNodes = new Set<string>();
  const executingNodes = new Set<string>();
  const nodePromises: Record<string, Promise<void>> = {};
  const outputs: string[] = [];

  function areInputsReady(nodeId: string): boolean {
    const incomingEdges = getIncomingEdges(nodeId, edges);
    for (const edge of incomingEdges) {
      if (!executedNodes.has(edge.source)) {
        return false;
      }
    }
    return true;
  }

  async function executeNodeAndContinue(node: Node): Promise<void> {
    if (signal?.aborted) {
      throw new Error("Execution cancelled");
    }

    if (executedNodes.has(node.id) || executingNodes.has(node.id)) {
      const existingPromise = nodePromises[node.id];
      if (existingPromise) {
        await existingPromise;
      }
      return;
    }

    if (!areInputsReady(node.id)) {
      const incomingEdges = getIncomingEdges(node.id, edges);
      const upstreamPromises: Promise<void>[] = [];
      for (const edge of incomingEdges) {
        const upstreamPromise = nodePromises[edge.source];
        if (upstreamPromise) {
          upstreamPromises.push(upstreamPromise);
        }
      }
      if (upstreamPromises.length > 0) {
        await Promise.all(upstreamPromises);
      }
    }

    executingNodes.add(node.id);
    onNodeStateChange(node.id, { status: "running" });

    // For certain nodes, also mark downstream output nodes as running
    const shouldTrackDownstream =
      node.type === "text-generation" ||
      node.type === "image-generation" ||
      node.type === "react-component";
    const downstreamOutputs = shouldTrackDownstream
      ? findDownstreamOutputNodes(node.id, nodes, edges)
      : [];
    for (const outputNode of downstreamOutputs) {
      onNodeStateChange(outputNode.id, { status: "running", sourceType: node.type });
    }

    try {
      await new Promise((r) => setTimeout(r, 300));

      let inputs = collectNodeInputs(node.id, edges, executedOutputs);

      // For input node, use its stored inputValue
      if (node.type === "text-input") {
        const nodeInput = typeof node.data?.inputValue === "string" ? node.data.inputValue : "";
        inputs = { prompt: nodeInput };
        context[`userInput_${node.id}`] = nodeInput;
      }

      const result = await executeNode(
        node,
        inputs,
        context,
        apiKeys,
        (streamedOutput, debugInfo, reasoning) => {
          onNodeStateChange(node.id, {
            status: "running",
            output: streamedOutput,
            reasoning,
            debugInfo,
          });
          for (const outputNode of downstreamOutputs) {
            onNodeStateChange(outputNode.id, {
              status: "running",
              output: streamedOutput,
            });
          }
        },
        signal,
        options,
        edges,
        onNodeStateChange
      );

      context[node.id] = result.output;
      executedOutputs[node.id] = result.output;
      executedNodes.add(node.id);
      executingNodes.delete(node.id);

      // Check if this node type has a pulse output using the registry
      const nodeHasPulseOutput = hasPulseOutput(node.type || "");
      if (nodeHasPulseOutput) {
        executedOutputs[`${node.id}:done`] = JSON.stringify({ fired: true, timestamp: Date.now() });
      }

      onNodeStateChange(node.id, {
        status: "success",
        output: result.output,
        reasoning: result.reasoning,
        debugInfo: result.debugInfo,
        generatedCode: result.generatedCode,
        codeExplanation: result.codeExplanation,
        awaitingInput: false,
        pulseFired: nodeHasPulseOutput,
        stringOutput: result.stringOutput,
        imageOutput: result.imageOutput,
        audioOutput: result.audioOutput,
      });

      if (node.type === "preview-output") {
        outputs.push(result.output);
        return;
      }

      const outgoingEdges = getOutgoingEdges(node.id, edges);
      const nextPromises: Promise<void>[] = [];

      for (const edge of outgoingEdges) {
        const targetNode = getTargetNode(edge, nodes);
        if (targetNode && !executedNodes.has(targetNode.id)) {
          if (areInputsReady(targetNode.id)) {
            const promise = executeNodeAndContinue(targetNode);
            nodePromises[targetNode.id] = promise;
            nextPromises.push(promise);
          }
        }
      }

      await Promise.all(nextPromises);
    } catch (error) {
      executingNodes.delete(node.id);
      onNodeStateChange(node.id, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      for (const outputNode of downstreamOutputs) {
        onNodeStateChange(outputNode.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  const startPromises = rootNodes.map((rootNode) => {
    const promise = executeNodeAndContinue(rootNode);
    nodePromises[rootNode.id] = promise;
    return promise;
  });

  await Promise.all(startPromises);

  return outputs[outputs.length - 1] || "";
}
