import type { Node, Edge } from "@xyflow/react";
import type { NodeExecutionState } from "./types";

// Find the starting node (input node)
function findStartNode(nodes: Node[]): Node | undefined {
  return nodes.find((n) => n.type === "input");
}

// Get outgoing edges from a node
function getOutgoingEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter((e) => e.source === nodeId);
}

// Get the target node from an edge
function getTargetNode(edge: Edge, nodes: Node[]): Node | undefined {
  return nodes.find((n) => n.id === edge.target);
}

// Execute a single node
async function executeNode(
  node: Node,
  input: string,
  context: Record<string, unknown>,
  onStreamUpdate?: (output: string) => void
): Promise<{ output: string }> {
  switch (node.type) {
    case "input":
      return { output: input };

    case "output":
      return { output: input };

    case "prompt": {
      const prompt = typeof node.data?.prompt === "string" ? node.data.prompt : "";
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "prompt",
          prompt: prompt,
          provider: node.data.provider || "openai",
          model: node.data.model || "gpt-5",
          verbosity: node.data.verbosity,
          thinking: node.data.thinking,
          input,
          context,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to execute prompt");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullOutput = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullOutput += chunk;
        onStreamUpdate?.(fullOutput);
      }

      return { output: fullOutput };
    }

    default:
      return { output: input };
  }
}

export async function executeFlow(
  nodes: Node[],
  edges: Edge[],
  onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void
): Promise<string> {
  const startNode = findStartNode(nodes);
  if (!startNode) {
    throw new Error("No input node found");
  }

  // Get user input from the InputNode's data
  const userInput = typeof startNode.data?.inputValue === "string"
    ? startNode.data.inputValue
    : "";

  const context: Record<string, unknown> = { userInput };
  const outputs: string[] = [];

  // Find downstream output nodes from a given node
  function findDownstreamOutputNodes(nodeId: string): Node[] {
    const outputNodes: Node[] = [];
    const visited = new Set<string>();

    function traverse(currentId: string) {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const outgoing = getOutgoingEdges(currentId, edges);
      for (const edge of outgoing) {
        const target = getTargetNode(edge, nodes);
        if (target) {
          if (target.type === "output") {
            outputNodes.push(target);
          } else {
            traverse(target.id);
          }
        }
      }
    }

    traverse(nodeId);
    return outputNodes;
  }

  // Recursive function to execute a node and its downstream nodes
  async function executeNodeAndContinue(node: Node, input: string): Promise<void> {
    onNodeStateChange(node.id, { status: "running" });

    // For prompt nodes, also mark downstream output nodes as running
    // so they appear in preview immediately
    const downstreamOutputs = node.type === "prompt" ? findDownstreamOutputNodes(node.id) : [];
    for (const outputNode of downstreamOutputs) {
      onNodeStateChange(outputNode.id, { status: "running" });
    }

    try {
      // Small delay for visual feedback
      await new Promise((r) => setTimeout(r, 300));

      // Execute the node with streaming callback for prompt nodes
      const result = await executeNode(node, input, context, (streamedOutput) => {
        // Update prompt node
        onNodeStateChange(node.id, {
          status: "running",
          output: streamedOutput,
        });
        // Also update downstream output nodes with streaming output
        for (const outputNode of downstreamOutputs) {
          onNodeStateChange(outputNode.id, {
            status: "running",
            output: streamedOutput,
          });
        }
      });

      // Store output in context
      context[node.id] = result.output;

      // Set node to success
      onNodeStateChange(node.id, {
        status: "success",
        output: result.output,
      });

      // If this is an output node, capture the output
      if (node.type === "output") {
        outputs.push(result.output);
        return;
      }

      // Find and execute next nodes in parallel
      const outgoingEdges = getOutgoingEdges(node.id, edges);
      const nextPromises: Promise<void>[] = [];

      for (const edge of outgoingEdges) {
        const targetNode = getTargetNode(edge, nodes);
        if (targetNode) {
          // Start executing the next node immediately (don't await)
          nextPromises.push(executeNodeAndContinue(targetNode, result.output));
        }
      }

      // Wait for all downstream branches to complete
      await Promise.all(nextPromises);
    } catch (error) {
      onNodeStateChange(node.id, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Also mark downstream outputs as error
      for (const outputNode of downstreamOutputs) {
        onNodeStateChange(outputNode.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  // Start execution from the start node
  await executeNodeAndContinue(startNode, userInput);

  return outputs[outputs.length - 1] || "";
}
