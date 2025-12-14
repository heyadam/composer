import type { Node, Edge } from "@xyflow/react";
import type { NodeExecutionState, DebugInfo } from "./types";
import type { ApiKeys } from "@/lib/api-keys";
import {
  findAllInputNodes,
  getOutgoingEdges,
  getTargetNode,
  getIncomingEdges,
  findDownstreamOutputNodes,
  collectNodeInputs,
} from "./graph-utils";

interface ExecuteNodeResult {
  output: string;
  debugInfo?: DebugInfo;
}

// Execute a single node
async function executeNode(
  node: Node,
  inputs: Record<string, string>,
  context: Record<string, unknown>,
  apiKeys?: ApiKeys,
  onStreamUpdate?: (output: string, debugInfo?: DebugInfo) => void
): Promise<ExecuteNodeResult> {
  switch (node.type) {
    case "input":
      // Input node uses its stored inputValue or the first available input
      return { output: inputs["prompt"] || inputs["input"] || "" };

    case "output":
      // Output node passes through its input
      return { output: inputs["input"] || inputs["prompt"] || Object.values(inputs)[0] || "" };

    case "prompt": {
      const startTime = Date.now();
      let streamChunksReceived = 0;

      // Get prompt input (the user message) - from connection or inline textarea
      const hasPromptEdge = "prompt" in inputs;
      const inlineUserPrompt = typeof node.data?.userPrompt === "string" ? node.data.userPrompt : "";
      const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

      // Get system prompt - from connection or inline textarea
      const hasSystemEdge = "system" in inputs;
      const inlineSystemPrompt = typeof node.data?.systemPrompt === "string" ? node.data.systemPrompt : "";
      const effectiveSystemPrompt = hasSystemEdge ? inputs["system"] : inlineSystemPrompt;

      const provider = (node.data.provider as string) || "openai";
      const model = (node.data.model as string) || "gpt-5";

      const requestBody = {
        type: "prompt" as const,
        inputs: { prompt: promptInput, system: effectiveSystemPrompt },
        provider,
        model,
        verbosity: node.data.verbosity,
        thinking: node.data.thinking,
        apiKeys,
      };

      const debugInfo: DebugInfo = {
        startTime,
        request: {
          type: "prompt",
          provider,
          model,
          userPrompt: promptInput,
          systemPrompt: effectiveSystemPrompt,
          verbosity: node.data.verbosity as string | undefined,
          thinking: node.data.thinking as boolean | undefined,
        },
        streamChunksReceived: 0,
        rawRequestBody: JSON.stringify({ ...requestBody, apiKeys: "[REDACTED]" }, null, 2),
      };

      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Failed to execute prompt";
        try {
          const data = JSON.parse(text);
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        debugInfo.endTime = Date.now();
        throw new Error(errorMessage);
      }

      if (!response.body) {
        debugInfo.endTime = Date.now();
        throw new Error("No response body");
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullOutput = "";
      const rawChunks: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        rawChunks.push(chunk);
        fullOutput += chunk;
        streamChunksReceived++;
        debugInfo.streamChunksReceived = streamChunksReceived;
        debugInfo.rawResponseBody = rawChunks.join("");
        onStreamUpdate?.(fullOutput, debugInfo);
      }

      debugInfo.endTime = Date.now();
      debugInfo.rawResponseBody = fullOutput || "(empty response)";

      // Handle empty response from model
      if (!fullOutput.trim()) {
        throw new Error("Model returned empty response. The prompt combination may have confused the model.");
      }

      return { output: fullOutput, debugInfo };
    }

    case "image": {
      const startTime = Date.now();
      let streamChunksReceived = 0;

      const prompt = typeof node.data?.prompt === "string" ? node.data.prompt : "";
      const promptInput = inputs["prompt"] || "";
      const provider = (node.data.provider as string) || "openai";
      const model = (node.data.model as string) || "gpt-5";

      const outputFormat = (node.data.outputFormat as string) || "webp";
      const size = (node.data.size as string) || "1024x1024";
      const quality = (node.data.quality as string) || "low";
      const partialImages = (node.data.partialImages as number) ?? 3;
      const aspectRatio = (node.data.aspectRatio as string) || "1:1";

      const requestBody = {
        type: "image" as const,
        prompt,
        provider,
        model,
        outputFormat,
        size,
        quality,
        partialImages,
        aspectRatio,
        input: promptInput,
        apiKeys,
      };

      const debugInfo: DebugInfo = {
        startTime,
        request: {
          type: "image",
          provider,
          model,
          imagePrompt: prompt + (promptInput ? ` | Input: ${promptInput}` : ""),
          size,
          quality,
          aspectRatio,
          outputFormat,
          partialImages,
        },
        streamChunksReceived: 0,
        rawRequestBody: JSON.stringify({ ...requestBody, apiKeys: "[REDACTED]" }, null, 2),
      };

      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Image generation API error response:", text);
        debugInfo.endTime = Date.now();
        try {
          const data = JSON.parse(text);
          console.error("Image generation error details:", data);
          throw new Error(data.error || "Image generation failed");
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          throw new Error("Image generation failed");
        }
      }

      // Check if response is JSON (Google) or streaming (OpenAI)
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        // Non-streaming JSON response (Google)
        const data = await response.json();
        debugInfo.endTime = Date.now();
        if (data.type === "image" && data.value) {
          const imageOutput = JSON.stringify({
            type: "image",
            value: data.value,
            mimeType: data.mimeType,
          });
          onStreamUpdate?.(imageOutput, debugInfo);
          return { output: imageOutput, debugInfo };
        }
        throw new Error(data.error || "No image generated");
      }

      // Streaming response (OpenAI)
      if (!response.body) {
        debugInfo.endTime = Date.now();
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalImage: { type: string; value: string; mimeType: string } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === "partial" || data.type === "image") {
              streamChunksReceived++;
              debugInfo.streamChunksReceived = streamChunksReceived;
              // Update with partial or final image
              const imageOutput = JSON.stringify({
                type: "image",
                value: data.value,
                mimeType: data.mimeType,
              });
              onStreamUpdate?.(imageOutput, debugInfo);

              if (data.type === "image") {
                finalImage = data;
              }
            }
          } catch (e) {
            console.error("Failed to parse image stream line:", e);
          }
        }
      }

      debugInfo.endTime = Date.now();

      if (!finalImage) {
        throw new Error("No final image received");
      }

      return {
        output: JSON.stringify({
          type: "image",
          value: finalImage.value,
          mimeType: finalImage.mimeType,
        }),
        debugInfo,
      };
    }

    default:
      return { output: inputs["prompt"] || inputs["input"] || Object.values(inputs)[0] || "" };
  }
}

export async function executeFlow(
  nodes: Node[],
  edges: Edge[],
  onNodeStateChange: (nodeId: string, state: NodeExecutionState) => void,
  apiKeys?: ApiKeys
): Promise<string> {
  // Only execute input nodes that have outgoing edges (are actually connected to the flow)
  const allInputNodes = findAllInputNodes(nodes);
  const inputNodes = allInputNodes.filter((node) =>
    getOutgoingEdges(node.id, edges).length > 0
  );

  if (inputNodes.length === 0) {
    throw new Error("No connected input node found");
  }

  const context: Record<string, unknown> = {};
  // Track executed node outputs for collecting inputs
  const executedOutputs: Record<string, string> = {};
  // Track which nodes have been executed or are executing
  const executedNodes = new Set<string>();
  const executingNodes = new Set<string>();
  // Track promises for nodes that are currently executing
  const nodePromises: Record<string, Promise<void>> = {};
  const outputs: string[] = [];

  // Check if all upstream dependencies are satisfied for a node
  function areInputsReady(nodeId: string): boolean {
    const incomingEdges = getIncomingEdges(nodeId, edges);
    for (const edge of incomingEdges) {
      if (!executedNodes.has(edge.source)) {
        return false;
      }
    }
    return true;
  }

  // Execute a single node and trigger downstream nodes
  async function executeNodeAndContinue(node: Node): Promise<void> {
    // Skip if already executed or currently executing
    if (executedNodes.has(node.id) || executingNodes.has(node.id)) {
      // If currently executing, wait for it to complete
      const existingPromise = nodePromises[node.id];
      if (existingPromise) {
        await existingPromise;
      }
      return;
    }

    // Wait for all upstream dependencies
    if (!areInputsReady(node.id)) {
      // Wait for upstream nodes to complete
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

    // Mark as executing
    executingNodes.add(node.id);

    onNodeStateChange(node.id, { status: "running" });

    // For prompt and image nodes, also mark downstream output nodes as running
    const shouldTrackDownstream = node.type === "prompt" || node.type === "image";
    const downstreamOutputs = shouldTrackDownstream
      ? findDownstreamOutputNodes(node.id, nodes, edges)
      : [];
    for (const outputNode of downstreamOutputs) {
      onNodeStateChange(outputNode.id, { status: "running", sourceType: node.type });
    }

    try {
      // Small delay for visual feedback
      await new Promise((r) => setTimeout(r, 300));

      // Collect inputs from all incoming edges
      let inputs = collectNodeInputs(node.id, edges, executedOutputs);

      // For input node, use its stored inputValue
      if (node.type === "input") {
        const nodeInput = typeof node.data?.inputValue === "string"
          ? node.data.inputValue
          : "";
        inputs = { prompt: nodeInput };
        context[`userInput_${node.id}`] = nodeInput;
      }

      // Execute the node with streaming callback
      const result = await executeNode(node, inputs, context, apiKeys, (streamedOutput, debugInfo) => {
        onNodeStateChange(node.id, {
          status: "running",
          output: streamedOutput,
          debugInfo,
        });
        for (const outputNode of downstreamOutputs) {
          onNodeStateChange(outputNode.id, {
            status: "running",
            output: streamedOutput,
          });
        }
      });

      // Store output
      context[node.id] = result.output;
      executedOutputs[node.id] = result.output;
      executedNodes.add(node.id);
      executingNodes.delete(node.id);

      onNodeStateChange(node.id, {
        status: "success",
        output: result.output,
        debugInfo: result.debugInfo,
      });

      // If this is an output node, capture the output
      if (node.type === "output") {
        outputs.push(result.output);
        return;
      }

      // Find and execute downstream nodes
      const outgoingEdges = getOutgoingEdges(node.id, edges);
      const nextPromises: Promise<void>[] = [];

      for (const edge of outgoingEdges) {
        const targetNode = getTargetNode(edge, nodes);
        if (targetNode && !executedNodes.has(targetNode.id)) {
          // Only execute if all inputs are ready
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

  // Start execution from ALL input nodes in parallel
  const startPromises = inputNodes.map((inputNode) => {
    const promise = executeNodeAndContinue(inputNode);
    nodePromises[inputNode.id] = promise;
    return promise;
  });

  await Promise.all(startPromises);

  return outputs[outputs.length - 1] || "";
}
