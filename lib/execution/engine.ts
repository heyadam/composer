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
import { getExecutor, hasPulseOutput, shouldTrackDownstream } from "./executor-registry";
import { isImplicitlyCacheable } from "./cache/fingerprint";
import type { ExecuteNodeResult, ExecutionContext } from "./executors/types";
import type { CacheManager } from "./cache";

// Import executors to register them
import "./executors";

// Re-export ExecuteOptions for backward compatibility
export type { ExecuteOptions } from "./types";

/** Extended options for flow execution with caching support */
export interface ExecuteFlowOptions extends ExecuteOptions {
  /** Cache manager for incremental execution */
  cacheManager?: CacheManager;
  /** If true, ignore cache and re-execute all nodes */
  forceExecute?: boolean;
}

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
  const nodeType = node.type || "";
  const executor = getExecutor(nodeType);

  if (!executor) {
    throw new Error(`No executor registered for node type: "${nodeType}"`);
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
  options?: ExecuteFlowOptions
): Promise<string> {
  const { cacheManager, forceExecute, ...executeOptions } = options || {};
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

    // Collect inputs early for cache check
    const inputs = collectNodeInputs(node.id, edges, executedOutputs);

    // Check cache before executing
    // Nodes are cacheable if explicitly opted-in OR if implicitly cacheable (input nodes)
    const nodeType = node.type || "";
    const isCacheable = Boolean(node.data?.cacheable) || isImplicitlyCacheable(nodeType);
    if (cacheManager && isCacheable && !forceExecute) {
      const cachedResult = cacheManager.get(node.id, node, edges, executedOutputs);

      if (cachedResult) {
        // Use cached result
        context[node.id] = cachedResult.output;
        executedOutputs[node.id] = cachedResult.output;
        executedNodes.add(node.id);
        executingNodes.delete(node.id);

        const nodeHasPulseOutput = hasPulseOutput(node.type || "");
        if (nodeHasPulseOutput) {
          executedOutputs[`${node.id}:done`] = JSON.stringify({ fired: true, timestamp: Date.now() });
        }

        onNodeStateChange(node.id, {
          status: "success",
          output: cachedResult.output,
          reasoning: cachedResult.reasoning,
          debugInfo: cachedResult.debugInfo,
          generatedCode: cachedResult.generatedCode,
          codeExplanation: cachedResult.codeExplanation,
          awaitingInput: false,
          pulseFired: nodeHasPulseOutput,
          stringOutput: cachedResult.stringOutput,
          imageOutput: cachedResult.imageOutput,
          audioOutput: cachedResult.audioOutput,
          codeOutput: cachedResult.codeOutput,
          threeOutput: cachedResult.threeOutput,
          fromCache: true,
        });

        if (node.type === "preview-output") {
          outputs.push(cachedResult.output);
          return;
        }

        // Continue to downstream nodes
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
        return;
      }
    }

    onNodeStateChange(node.id, { status: "running" });

    // For streaming nodes, also mark downstream output nodes as running
    const trackDownstream = shouldTrackDownstream(node.type || "");
    const downstreamOutputs = trackDownstream
      ? findDownstreamOutputNodes(node.id, nodes, edges)
      : [];
    for (const outputNode of downstreamOutputs) {
      onNodeStateChange(outputNode.id, { status: "running", sourceType: node.type });
    }

    try {
      await new Promise((r) => setTimeout(r, 300));

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
        executeOptions,
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

      // Store result in cache (if cacheable)
      if (cacheManager && isCacheable) {
        cacheManager.set(node.id, node, edges, inputs, result);
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
        codeOutput: result.codeOutput,
        threeOutput: result.threeOutput,
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
