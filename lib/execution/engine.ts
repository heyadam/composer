import type { Node, Edge } from "@xyflow/react";
import type { NodeExecutionState, DebugInfo } from "./types";
import type { ApiKeys } from "@/lib/api-keys";
import {
  getOutgoingEdges,
  getTargetNode,
  getIncomingEdges,
  findDownstreamOutputNodes,
  collectNodeInputs,
} from "./graph-utils";

interface ExecuteNodeResult {
  output: string;
  reasoning?: string;
  debugInfo?: DebugInfo;
  /** Auto-generated code for ai-logic nodes */
  generatedCode?: string;
  /** Explanation for auto-generated code */
  codeExplanation?: string;
}

/** Options for owner-funded execution */
export interface ExecuteOptions {
  /** Share token for owner-funded execution (grants access to owner's API keys) */
  shareToken?: string;
  /** Unique run ID for rate limit deduplication (same for all nodes in one execution) */
  runId?: string;
}

// Default timeout for API requests (60 seconds)
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Fetch with timeout and abort signal support.
 * Combines user-provided signal with a timeout signal.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { signal?: AbortSignal },
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  // Combine signals: user signal + timeout signal
  const signals = [timeoutController.signal];
  if (options.signal) {
    signals.push(options.signal);
  }
  const combinedSignal = AbortSignal.any(signals);

  try {
    return await fetch(url, { ...options, signal: combinedSignal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Determine if it was a timeout or user cancellation
      if (timeoutController.signal.aborted) {
        throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
      }
      throw new Error("Request cancelled");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Execute a single node
async function executeNode(
  node: Node,
  inputs: Record<string, string>,
  context: Record<string, unknown>,
  apiKeys?: ApiKeys,
  onStreamUpdate?: (output: string, debugInfo?: DebugInfo, reasoning?: string) => void,
  signal?: AbortSignal,
  options?: ExecuteOptions
): Promise<ExecuteNodeResult> {
  switch (node.type) {
    case "text-input":
      // Input node uses its stored inputValue or the first available input
      return { output: inputs["prompt"] || inputs["input"] || "" };

    case "image-input":
      // Image input node returns its uploaded image data
      return { output: (node.data.uploadedImage as string) || "" };

    case "preview-output":
      // Output node passes through its input
      return { output: inputs["input"] || inputs["prompt"] || Object.values(inputs)[0] || "" };

    case "text-generation": {
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
      const model = (node.data.model as string) || "gpt-5.2";

      // Owner-funded: include shareToken + runId, omit apiKeys
      const requestBody = options?.shareToken
        ? {
            type: "text-generation" as const,
            inputs: { prompt: promptInput, system: effectiveSystemPrompt },
            provider,
            model,
            verbosity: node.data.verbosity,
            thinking: node.data.thinking,
            googleThinkingConfig: node.data.googleThinkingConfig,
            googleSafetyPreset: node.data.googleSafetyPreset,
            googleStructuredOutputs: node.data.googleStructuredOutputs,
            shareToken: options.shareToken,
            runId: options.runId,
          }
        : {
            type: "text-generation" as const,
            inputs: { prompt: promptInput, system: effectiveSystemPrompt },
            provider,
            model,
            verbosity: node.data.verbosity,
            thinking: node.data.thinking,
            googleThinkingConfig: node.data.googleThinkingConfig,
            googleSafetyPreset: node.data.googleSafetyPreset,
            googleStructuredOutputs: node.data.googleStructuredOutputs,
            apiKeys,
          };

      const debugInfo: DebugInfo = {
        startTime,
        request: {
          type: "text-generation",
          provider,
          model,
          userPrompt: promptInput,
          systemPrompt: effectiveSystemPrompt,
          verbosity: node.data.verbosity as string | undefined,
          thinking: node.data.thinking as boolean | undefined,
          googleThinkingConfig: node.data.googleThinkingConfig as Record<string, unknown> | undefined,
          googleSafetyPreset: node.data.googleSafetyPreset as string | undefined,
        },
        streamChunksReceived: 0,
        // Redact both apiKeys and shareToken in debug
        rawRequestBody: JSON.stringify({
          ...requestBody,
          apiKeys: "apiKeys" in requestBody ? "[REDACTED]" : undefined,
          shareToken: "shareToken" in requestBody ? "[REDACTED]" : undefined,
        }, null, 2),
      };

      const response = await fetchWithTimeout(
        "/api/execute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal,
        }
      );

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

      // Check if response is NDJSON (Google with thinking enabled)
      const contentType = response.headers.get("content-type") || "";
      const isNdjson = contentType.includes("application/x-ndjson");

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullOutput = "";
      let fullReasoning = "";
      const rawChunks: string[] = [];

      if (isNdjson) {
        // Parse NDJSON stream with text and reasoning parts
        let buffer = "";
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
              rawChunks.push(line);
              streamChunksReceived++;
              debugInfo.streamChunksReceived = streamChunksReceived;

              if (data.type === "reasoning") {
                fullReasoning += data.text;
              } else if (data.type === "text") {
                fullOutput += data.text;
              }

              debugInfo.rawResponseBody = rawChunks.join("\n");
              onStreamUpdate?.(fullOutput, debugInfo, fullReasoning);
            } catch (e) {
              console.error("Failed to parse NDJSON line:", e);
            }
          }
        }
      } else {
        // Regular text stream
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
      }

      debugInfo.endTime = Date.now();
      debugInfo.rawResponseBody = fullOutput || "(empty response)";

      // Handle empty response from model
      if (!fullOutput.trim()) {
        throw new Error("Model returned empty response. The prompt combination may have confused the model.");
      }

      return { output: fullOutput, reasoning: fullReasoning || undefined, debugInfo };
    }

    case "image-generation": {
      const startTime = Date.now();
      let streamChunksReceived = 0;

      const prompt = typeof node.data?.prompt === "string" ? node.data.prompt : "";
      const promptInput = inputs["prompt"] || "";
      // Get source image from connected input or inline upload
      const imageInput = inputs["image"] || (node.data.imageInput as string) || "";
      const provider = (node.data.provider as string) || "openai";
      const model = (node.data.model as string) || "gpt-5.2";

      const outputFormat = (node.data.outputFormat as string) || "webp";
      const size = (node.data.size as string) || "1024x1024";
      const quality = (node.data.quality as string) || "low";
      const partialImages = (node.data.partialImages as number) ?? 3;
      const aspectRatio = (node.data.aspectRatio as string) || "1:1";

      // Owner-funded: include shareToken + runId, omit apiKeys
      const requestBody = options?.shareToken
        ? {
            type: "image-generation" as const,
            prompt,
            provider,
            model,
            outputFormat,
            size,
            quality,
            partialImages,
            aspectRatio,
            input: promptInput,
            imageInput,
            shareToken: options.shareToken,
            runId: options.runId,
          }
        : {
            type: "image-generation" as const,
            prompt,
            provider,
            model,
            outputFormat,
            size,
            quality,
            partialImages,
            aspectRatio,
            input: promptInput,
            imageInput,
            apiKeys,
          };

      const debugInfo: DebugInfo = {
        startTime,
        request: {
          type: "image-generation",
          provider,
          model,
          imagePrompt: prompt + (promptInput ? ` | Input: ${promptInput}` : ""),
          hasSourceImage: !!imageInput,
          size,
          quality,
          aspectRatio,
          outputFormat,
          partialImages,
        },
        streamChunksReceived: 0,
        // Redact both apiKeys and shareToken in debug
        rawRequestBody: JSON.stringify({
          ...requestBody,
          apiKeys: "apiKeys" in requestBody ? "[REDACTED]" : undefined,
          shareToken: "shareToken" in requestBody ? "[REDACTED]" : undefined,
          imageInput: imageInput ? "[BASE64_IMAGE]" : undefined,
        }, null, 2),
      };

      const response = await fetchWithTimeout(
        "/api/execute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal,
        },
        120000 // 2 minute timeout for image generation
      );

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

    case "ai-logic": {
      // Check if transform input is connected (dynamic) or using cached code
      const transformInput = inputs["transform"];
      const cachedCode = node.data.generatedCode as string | undefined;
      const transformPrompt = node.data.transformPrompt as string | undefined;

      let codeToExecute: string;
      let autoGeneratedCode: string | undefined;
      let autoGeneratedExplanation: string | undefined;

      // Helper to generate code via API
      const generateCode = async (prompt: string) => {
        // Owner-funded: include shareToken + runId, omit apiKeys
        const body = options?.shareToken
          ? { type: "magic-generate", prompt, shareToken: options.shareToken, runId: options.runId }
          : { type: "magic-generate", prompt, apiKeys };

        const response = await fetchWithTimeout(
          "/api/execute",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal,
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to generate code");
        }

        return response.json();
      };

      if (transformInput) {
        // Dynamic: generate code from connected transform input
        const result = await generateCode(transformInput);
        codeToExecute = result.code;
      } else if (cachedCode) {
        // Static: use cached generated code
        codeToExecute = cachedCode;
      } else if (transformPrompt?.trim()) {
        // Auto-generate: no cached code but has a prompt, generate on the fly
        const result = await generateCode(transformPrompt);
        codeToExecute = result.code;
        // Track auto-generated code so it can be persisted to the node
        autoGeneratedCode = result.code;
        autoGeneratedExplanation = result.explanation;
      } else {
        throw new Error("No code generated. Click 'Generate Logic' first or connect a transform input.");
      }

      try {
        // Create function from generated code
        // The code should be a function body that starts with "return"
        const fn = new Function("input1", "input2", `"use strict"; ${codeToExecute}`);

        // Parse inputs - they can be strings or numbers
        const parseInput = (value: string | undefined): string | number | null => {
          if (value === undefined || value === "") return null;
          // Try to parse as number
          const num = Number(value);
          return isNaN(num) ? value : num;
        };

        // Check for named handles first, fall back to "prompt" for edges without targetHandle
        const input1 = parseInput(inputs["input1"] ?? inputs["prompt"]);
        const input2 = parseInput(inputs["input2"]);

        // Execute the function
        const result = fn(input1, input2);

        return {
          output: String(result ?? ""),
          generatedCode: autoGeneratedCode,
          codeExplanation: autoGeneratedExplanation,
        };
      } catch (err) {
        throw new Error(`Code execution error: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    case "react-component": {
      const startTime = Date.now();
      let streamChunksReceived = 0;

      // Get prompt input - from connection or inline textarea
      const hasPromptEdge = "prompt" in inputs;
      const inlineUserPrompt = typeof node.data?.userPrompt === "string" ? node.data.userPrompt : "";
      const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

      // Get system prompt - from connection or inline textarea
      const hasSystemEdge = "system" in inputs;
      const inlineSystemPrompt = typeof node.data?.systemPrompt === "string" ? node.data.systemPrompt : "";
      const effectiveSystemPrompt = hasSystemEdge ? inputs["system"] : inlineSystemPrompt;

      const provider = (node.data.provider as string) || "openai";
      const model = (node.data.model as string) || "gpt-5.2";
      const stylePreset = (node.data.stylePreset as string) || "simple";

      // Owner-funded: include shareToken + runId, omit apiKeys
      const requestBody = options?.shareToken
        ? {
            type: "react-component" as const,
            inputs: { prompt: promptInput, system: effectiveSystemPrompt },
            provider,
            model,
            stylePreset,
            shareToken: options.shareToken,
            runId: options.runId,
          }
        : {
            type: "react-component" as const,
            inputs: { prompt: promptInput, system: effectiveSystemPrompt },
            provider,
            model,
            stylePreset,
            apiKeys,
          };

      const debugInfo: DebugInfo = {
        startTime,
        request: {
          type: "react-component",
          provider,
          model,
          userPrompt: promptInput,
          systemPrompt: effectiveSystemPrompt,
        },
        streamChunksReceived: 0,
        // Redact both apiKeys and shareToken in debug
        rawRequestBody: JSON.stringify({
          ...requestBody,
          apiKeys: "apiKeys" in requestBody ? "[REDACTED]" : undefined,
          shareToken: "shareToken" in requestBody ? "[REDACTED]" : undefined,
        }, null, 2),
      };

      const response = await fetchWithTimeout(
        "/api/execute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal,
        }
      );

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Failed to generate React component";
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

        // Stream partial code wrapped in react output format
        const partialOutput = JSON.stringify({
          type: "react",
          code: fullOutput,
        });
        onStreamUpdate?.(partialOutput, debugInfo);
      }

      debugInfo.endTime = Date.now();
      debugInfo.rawResponseBody = fullOutput || "(empty response)";

      if (!fullOutput.trim()) {
        throw new Error("Model returned empty response.");
      }

      // Wrap final output in react format
      const reactOutput = JSON.stringify({
        type: "react",
        code: fullOutput,
      });

      return { output: reactOutput, debugInfo };
    }

    default:
      return { output: inputs["prompt"] || inputs["input"] || Object.values(inputs)[0] || "" };
  }
}

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
  // This allows starting from Input nodes, ImageInput nodes, or standalone PromptNodes
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
    // Check for cancellation
    if (signal?.aborted) {
      throw new Error("Execution cancelled");
    }

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

    // For prompt, image, and react nodes, also mark downstream output nodes as running
    const shouldTrackDownstream = node.type === "text-generation" || node.type === "image-generation" || node.type === "react-component";
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
      if (node.type === "text-input") {
        const nodeInput = typeof node.data?.inputValue === "string"
          ? node.data.inputValue
          : "";
        inputs = { prompt: nodeInput };
        context[`userInput_${node.id}`] = nodeInput;
      }

      // Execute the node with streaming callback
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
        options
      );

      // Store output
      context[node.id] = result.output;
      executedOutputs[node.id] = result.output;
      executedNodes.add(node.id);
      executingNodes.delete(node.id);

      onNodeStateChange(node.id, {
        status: "success",
        output: result.output,
        reasoning: result.reasoning,
        debugInfo: result.debugInfo,
        generatedCode: result.generatedCode,
        codeExplanation: result.codeExplanation,
      });

      // If this is an output node, capture the output
      if (node.type === "preview-output") {
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

  // Start execution from ALL root nodes in parallel
  const startPromises = rootNodes.map((rootNode) => {
    const promise = executeNodeAndContinue(rootNode);
    nodePromises[rootNode.id] = promise;
    return promise;
  });

  await Promise.all(startPromises);

  return outputs[outputs.length - 1] || "";
}
