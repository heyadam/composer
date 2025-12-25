/**
 * Server-side flow execution
 *
 * Executes a complete flow on the server without streaming.
 * Used by the live execute endpoint for headless execution.
 */

import { generateText, type LanguageModel, type CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import OpenAI from "openai";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import type { Node, Edge } from "@xyflow/react";
import { resolveImageInput, modelSupportsVision, getVisionCapableModel } from "@/lib/vision";
import type { ProviderId } from "@/lib/providers";

interface ApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
}

interface ExecutionResult {
  outputs: Record<string, string>;
  errors: Record<string, string>;
}

/**
 * Get AI model instance for a provider
 */
function getModel(
  provider: string,
  model: string,
  apiKeys: ApiKeys
): LanguageModel {
  switch (provider) {
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: apiKeys.google,
      });
      return google(model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: apiKeys.anthropic,
      });
      return anthropic(model);
    }
    default: {
      const openai = createOpenAI({
        apiKey: apiKeys.openai,
      });
      return openai(model);
    }
  }
}

/**
 * Get all incoming edges to a node
 */
function getIncomingEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter((e) => e.target === nodeId);
}

/**
 * Get all outgoing edges from a node
 */
function getOutgoingEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter((e) => e.source === nodeId);
}

/**
 * Collect all inputs for a node from executed outputs
 */
function collectNodeInputs(
  nodeId: string,
  edges: Edge[],
  executedOutputs: Record<string, string>
): Record<string, string> {
  const incoming = getIncomingEdges(nodeId, edges);
  const inputs: Record<string, string> = {};

  for (const edge of incoming) {
    const handleId = edge.targetHandle || "prompt";
    const sourceOutput = executedOutputs[edge.source];
    if (sourceOutput !== undefined) {
      inputs[handleId] = sourceOutput;
    }
  }

  return inputs;
}

/**
 * Execute a text-generation node
 */
async function executeTextGeneration(
  node: Node,
  inputs: Record<string, string>,
  apiKeys: ApiKeys
): Promise<string> {
  const hasPromptEdge = "prompt" in inputs;
  const inlineUserPrompt =
    typeof node.data?.userPrompt === "string" ? node.data.userPrompt : "";
  const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

  const hasSystemEdge = "system" in inputs;
  const inlineSystemPrompt =
    typeof node.data?.systemPrompt === "string" ? node.data.systemPrompt : "";
  const effectiveSystemPrompt = hasSystemEdge
    ? inputs["system"]
    : inlineSystemPrompt;

  const connectedImage = inputs["image"];
  const inlineImageInput =
    typeof node.data?.imageInput === "string" ? node.data.imageInput : "";
  const imageData = resolveImageInput(connectedImage, inlineImageInput);

  const provider = (node.data.provider as string) || "openai";
  let model = (node.data.model as string) || "gpt-5.2";

  const SUPPORTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (imageData && !SUPPORTED_IMAGE_TYPES.includes(imageData.mimeType)) {
    throw new Error(
      `Unsupported image type: ${imageData.mimeType}. Supported formats: JPEG, PNG, GIF, WebP`
    );
  }

  if (imageData && !modelSupportsVision(provider as ProviderId, model)) {
    const visionModel = getVisionCapableModel(provider as ProviderId, model);
    if (visionModel) {
      model = visionModel;
    } else {
      throw new Error(
        `Model "${model}" does not support vision and no vision-capable model is available for ${provider}`
      );
    }
  }

  const messages: CoreMessage[] = [];
  if (
    typeof effectiveSystemPrompt === "string" &&
    effectiveSystemPrompt.trim().length > 0
  ) {
    messages.push({ role: "system", content: effectiveSystemPrompt.trim() });
  }
  if (imageData) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: String(promptInput) },
        {
          type: "image",
          image: Buffer.from(imageData.value, "base64"),
          mediaType: imageData.mimeType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: String(promptInput) });
  }

  // Build provider options for OpenAI
  const openaiOptions: Record<string, string> = {};
  if (provider === "openai" || !provider) {
    const verbosity = node.data.verbosity as string | undefined;
    const thinking = node.data.thinking as boolean | undefined;
    if (verbosity) {
      openaiOptions.textVerbosity = verbosity;
    }
    if (thinking) {
      openaiOptions.reasoningSummary = "auto";
    }
  }

  // Build provider options for Google
  const googleOptions: GoogleGenerativeAIProviderOptions = {};
  if (provider === "google") {
    const googleThinkingConfig = node.data.googleThinkingConfig as
      | Record<string, unknown>
      | undefined;
    const googleSafetyPreset = node.data.googleSafetyPreset as
      | string
      | undefined;

    if (googleThinkingConfig) {
      const thinkingConfig: GoogleGenerativeAIProviderOptions["thinkingConfig"] =
        {};
      if (googleThinkingConfig.thinkingLevel) {
        thinkingConfig.thinkingLevel = googleThinkingConfig.thinkingLevel as
          | "low"
          | "medium"
          | "high";
      }
      if (
        googleThinkingConfig.thinkingBudget !== undefined &&
        Number(googleThinkingConfig.thinkingBudget) > 0
      ) {
        thinkingConfig.thinkingBudget =
          googleThinkingConfig.thinkingBudget as number;
      }
      if (googleThinkingConfig.includeThoughts !== undefined) {
        thinkingConfig.includeThoughts =
          googleThinkingConfig.includeThoughts as boolean;
      }
      if (Object.keys(thinkingConfig).length > 0) {
        googleOptions.thinkingConfig = thinkingConfig;
      }
    }

    if (googleSafetyPreset && googleSafetyPreset !== "default") {
      type HarmCategory =
        | "HARM_CATEGORY_HATE_SPEECH"
        | "HARM_CATEGORY_DANGEROUS_CONTENT"
        | "HARM_CATEGORY_HARASSMENT"
        | "HARM_CATEGORY_SEXUALLY_EXPLICIT";
      type HarmThreshold =
        | "HARM_BLOCK_THRESHOLD_UNSPECIFIED"
        | "BLOCK_LOW_AND_ABOVE"
        | "BLOCK_MEDIUM_AND_ABOVE"
        | "BLOCK_ONLY_HIGH"
        | "BLOCK_NONE";

      const safetyCategories: HarmCategory[] = [
        "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_DANGEROUS_CONTENT",
        "HARM_CATEGORY_HARASSMENT",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      ];

      const thresholdMap: Record<string, HarmThreshold> = {
        strict: "BLOCK_LOW_AND_ABOVE",
        relaxed: "BLOCK_ONLY_HIGH",
        none: "BLOCK_NONE",
      };

      googleOptions.safetySettings = safetyCategories.map((category) => ({
        category,
        threshold:
          thresholdMap[googleSafetyPreset] ||
          ("HARM_BLOCK_THRESHOLD_UNSPECIFIED" as HarmThreshold),
      }));
    }
  }

  // Use generateText for server-side execution (no streaming)
  const generateOptions: Parameters<typeof generateText>[0] = {
    model: getModel(provider, model, apiKeys),
    messages,
    maxOutputTokens: 1000,
  };

  if (
    Object.keys(openaiOptions).length > 0 ||
    Object.keys(googleOptions).length > 0
  ) {
    generateOptions.providerOptions = {};
    if (Object.keys(openaiOptions).length > 0) {
      generateOptions.providerOptions.openai = openaiOptions;
    }
    if (Object.keys(googleOptions).length > 0) {
      generateOptions.providerOptions.google = googleOptions;
    }
  }

  const result = await generateText(generateOptions);
  return result.text;
}

/**
 * Execute an image-generation node
 */
async function executeImageGeneration(
  node: Node,
  inputs: Record<string, string>,
  apiKeys: ApiKeys
): Promise<string> {
  const prompt =
    typeof node.data?.prompt === "string" ? node.data.prompt : "";
  const promptInput = inputs["prompt"] || "";
  const imageInput =
    inputs["image"] || (node.data.imageInput as string) || "";
  const provider = (node.data.provider as string) || "openai";
  const model = (node.data.model as string) || "gpt-5.2";
  const outputFormat = (node.data.outputFormat as string) || "webp";
  const size = (node.data.size as string) || "1024x1024";
  const quality = (node.data.quality as string) || "low";
  type AspectRatio =
    | "1:1"
    | "3:4"
    | "4:3"
    | "9:16"
    | "16:9"
    | "2:3"
    | "3:2"
    | "4:5"
    | "5:4"
    | "21:9";
  const aspectRatio = ((node.data.aspectRatio as string) || "1:1") as AspectRatio;

  const fullPrompt = prompt
    ? `${prompt}\n\nUser request: ${promptInput}`
    : promptInput;

  // Check if we have a source image for image-to-image editing
  const isImageEdit = !!imageInput;
  let parsedImageInput: { value: string; mimeType: string } | null = null;
  if (isImageEdit) {
    try {
      const parsed = JSON.parse(imageInput);
      if (!parsed.value || typeof parsed.value !== "string") {
        throw new Error("Invalid image input: missing or invalid base64 value");
      }
      parsedImageInput = {
        value: parsed.value,
        mimeType: parsed.mimeType || "image/png",
      };
    } catch {
      throw new Error("Invalid image input format");
    }
  }

  // Handle Google Gemini image generation/editing
  if (provider === "google") {
    const google = createGoogleGenerativeAI({
      apiKey: apiKeys.google,
    });

    if (isImageEdit && parsedImageInput) {
      const result = await generateText({
        model: google(model || "gemini-2.5-flash-image"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: fullPrompt || "Edit this image to improve its quality",
              },
              {
                type: "image",
                image: Buffer.from(parsedImageInput.value, "base64"),
                mediaType: parsedImageInput.mimeType,
              },
            ],
          },
        ],
        providerOptions: {
          google: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: aspectRatio || "1:1",
            },
          } satisfies GoogleGenerativeAIProviderOptions,
        },
      });

      if (result.files && result.files.length > 0) {
        const file = result.files[0];
        return JSON.stringify({
          type: "image",
          value: file.base64,
          mimeType: file.mediaType || "image/png",
        });
      }

      throw new Error("No image generated");
    }

    // For text-to-image generation
    const result = await generateText({
      model: google(model || "gemini-2.5-flash-image"),
      prompt: fullPrompt || "Generate an image",
      providerOptions: {
        google: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: aspectRatio || "1:1",
          },
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    });

    if (result.files && result.files.length > 0) {
      const file = result.files[0];
      return JSON.stringify({
        type: "image",
        value: file.base64,
        mimeType: file.mediaType || "image/png",
      });
    }

    throw new Error("No image generated");
  }

  // Handle OpenAI image generation/editing
  const openaiClient = new OpenAI({
    apiKey: apiKeys.openai,
  });
  const mimeType = `image/${outputFormat || "webp"}`;

  const inputText = isImageEdit
    ? `Edit this image: ${fullPrompt || "Enhance and improve the image quality"}`
    : `Generate an image based on this description: ${fullPrompt}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageGenTool: any = {
    type: "image_generation",
    partial_images: 0, // No partial images for server-side execution
    quality: quality || "low",
    size: size || "1024x1024",
    output_format: outputFormat || "webp",
  };

  if (isImageEdit && parsedImageInput) {
    imageGenTool.image = parsedImageInput.value;
  }

  // Use OpenAI Responses API (non-streaming)
  const response = await openaiClient.responses.create({
    model: model || "gpt-5.2",
    input: inputText,
    tools: [imageGenTool],
  });

  // Find the image result in the response
  for (const output of response.output || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = output as any;
    if (item?.type === "image_generation_call" && item?.result) {
      return JSON.stringify({
        type: "image",
        value: item.result,
        mimeType,
      });
    }
  }

  throw new Error("No image generated");
}

/**
 * Execute an ai-logic (magic) node
 */
async function executeAiLogic(
  node: Node,
  inputs: Record<string, string>,
  apiKeys: ApiKeys
): Promise<string> {
  const transformInput = inputs["transform"];
  const cachedCode = node.data.generatedCode as string | undefined;
  const transformPrompt = node.data.transformPrompt as string | undefined;

  let codeToExecute: string;

  const generateCode = async (prompt: string) => {
    const anthropic = createAnthropic({
      apiKey: apiKeys.anthropic,
    });

    const magicSystemPrompt = `You are a code generator. Generate a JavaScript function body that transforms inputs.

The function will receive two variables:
- input1: string | number | null (first input value)
- input2: string | number | null (second input value)

RULES:
1. First provide a brief plain English explanation (1 sentence) of what the code does
2. Then provide the code on a new line starting with "return"
3. The code MUST start with "return" and return a single value (string or number)
4. Use only pure JavaScript - no external libraries, no fetch, no async/await
5. Handle null/undefined inputs gracefully
6. Keep code concise (1-3 lines max)

OUTPUT FORMAT (exactly like this):
EXPLANATION: [one sentence explaining what the code does]
CODE: [the return statement]`;

    const result = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: magicSystemPrompt,
      prompt: prompt,
      maxOutputTokens: 500,
    });

    const responseText = result.text.trim();
    const codeMatch = responseText.match(/CODE:\s*([\s\S]+?)$/i);
    let code = codeMatch ? codeMatch[1].trim() : responseText;

    if (code.startsWith("```")) {
      code = code
        .replace(/^```(?:javascript|js)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    if (!code.includes("return")) {
      throw new Error("Generated code must contain a return statement");
    }

    return code;
  };

  if (transformInput) {
    codeToExecute = await generateCode(transformInput);
  } else if (cachedCode) {
    codeToExecute = cachedCode;
  } else if (transformPrompt?.trim()) {
    codeToExecute = await generateCode(transformPrompt);
  } else {
    throw new Error(
      "No code generated. Click 'Generate Logic' first or connect a transform input."
    );
  }

  try {
    const fn = new Function(
      "input1",
      "input2",
      `"use strict"; ${codeToExecute}`
    );

    const parseInput = (
      value: string | undefined
    ): string | number | null => {
      if (value === undefined || value === "") return null;
      const num = Number(value);
      return isNaN(num) ? value : num;
    };

    const input1 = parseInput(inputs["input1"] ?? inputs["prompt"]);
    const input2 = parseInput(inputs["input2"]);

    const result = fn(input1, input2);
    return String(result ?? "");
  } catch (err) {
    throw new Error(
      `Code execution error: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/**
 * Execute a react-component node
 */
async function executeReactComponent(
  node: Node,
  inputs: Record<string, string>,
  apiKeys: ApiKeys
): Promise<string> {
  const hasPromptEdge = "prompt" in inputs;
  const inlineUserPrompt =
    typeof node.data?.userPrompt === "string" ? node.data.userPrompt : "";
  const promptInput = hasPromptEdge ? inputs["prompt"] : inlineUserPrompt;

  const hasSystemEdge = "system" in inputs;
  const inlineSystemPrompt =
    typeof node.data?.systemPrompt === "string" ? node.data.systemPrompt : "";
  const effectiveSystemPrompt = hasSystemEdge
    ? inputs["system"]
    : inlineSystemPrompt;

  const provider = (node.data.provider as string) || "openai";
  const model = (node.data.model as string) || "gpt-5.2";
  const stylePreset = (node.data.stylePreset as string) || "simple";

  const styleInstructions: Record<string, string> = {
    simple: `STYLING (Vercel/v0 inspired):
- Clean, minimal, modern aesthetic
- Use neutral color palette: zinc/slate/gray backgrounds, subtle borders
- Soft shadows: shadow-sm, shadow-md with low opacity
- Rounded corners: rounded-lg or rounded-xl
- Proper spacing: consistent padding (p-4, p-6) and gaps (gap-4)
- Typography: font-medium for labels, text-sm for secondary text`,
    none: `STYLING:
- Do NOT add any CSS classes or inline styles
- Use plain HTML elements without styling`,
    robust: `STYLING:
- Create a polished, production-ready UI
- Use Tailwind CSS with animations and transitions`,
  };

  const selectedStyle =
    styleInstructions[stylePreset] || styleInstructions.simple;

  const systemPrompt = `You are an expert React component developer. Generate clean, functional React components.

RULES:
1. Generate a single React functional component
2. NO import statements - React hooks are available globally
3. Export the component as default
4. Use modern React patterns

${selectedStyle}

${effectiveSystemPrompt ? `\nADDITIONAL INSTRUCTIONS:\n${effectiveSystemPrompt}` : ""}

OUTPUT FORMAT:
Return ONLY the component code wrapped in a jsx code block.`;

  const messages: { role: "system" | "user"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: String(promptInput) },
  ];

  const result = await generateText({
    model: getModel(provider, model, apiKeys),
    messages,
    maxOutputTokens: 4000,
  });

  return JSON.stringify({
    type: "react",
    code: result.text,
  });
}

/**
 * Execute a single node
 */
async function executeNode(
  node: Node,
  inputs: Record<string, string>,
  apiKeys: ApiKeys
): Promise<string> {
  switch (node.type) {
    case "text-input":
      return inputs["prompt"] || inputs["input"] || "";

    case "image-input":
      return (node.data.uploadedImage as string) || "";

    case "preview-output":
      return (
        inputs["input"] ||
        inputs["prompt"] ||
        Object.values(inputs)[0] ||
        ""
      );

    case "text-generation":
      return executeTextGeneration(node, inputs, apiKeys);

    case "image-generation":
      return executeImageGeneration(node, inputs, apiKeys);

    case "ai-logic":
      return executeAiLogic(node, inputs, apiKeys);

    case "react-component":
      return executeReactComponent(node, inputs, apiKeys);

    default:
      return (
        inputs["prompt"] || inputs["input"] || Object.values(inputs)[0] || ""
      );
  }
}

/**
 * Execute a complete flow
 *
 * @param nodes - Array of nodes in the flow
 * @param edges - Array of edges connecting nodes
 * @param apiKeys - API keys for AI providers
 * @param inputOverrides - Optional overrides for input node values
 * @returns Execution result with outputs from preview-output nodes
 */
export async function executeFlowServer(
  nodes: Node[],
  edges: Edge[],
  apiKeys: ApiKeys,
  inputOverrides?: Record<string, string>
): Promise<ExecutionResult> {
  const executedOutputs: Record<string, string> = {};
  const executedNodes = new Set<string>();
  const outputs: Record<string, string> = {};
  const errors: Record<string, string> = {};

  // Find all root nodes (no incoming edges, but connected to flow)
  const rootNodes = nodes.filter((node) => {
    const hasIncoming = getIncomingEdges(node.id, edges).length > 0;
    const hasOutgoing = getOutgoingEdges(node.id, edges).length > 0;
    return (
      (!hasIncoming && hasOutgoing) ||
      (node.type === "preview-output" && !hasIncoming)
    );
  });

  if (rootNodes.length === 0) {
    return {
      outputs: {},
      errors: { _flow: "No connected nodes found to execute" },
    };
  }

  // Check if all upstream dependencies are satisfied
  function areInputsReady(nodeId: string): boolean {
    const incomingEdges = getIncomingEdges(nodeId, edges);
    for (const edge of incomingEdges) {
      if (!executedNodes.has(edge.source)) {
        return false;
      }
    }
    return true;
  }

  // Execute a node and recursively execute downstream
  async function executeNodeAndContinue(node: Node): Promise<void> {
    if (executedNodes.has(node.id)) return;

    // Collect inputs from upstream nodes
    let inputs = collectNodeInputs(node.id, edges, executedOutputs);

    // For input node, apply override or use stored value
    if (node.type === "text-input") {
      const overrideValue = inputOverrides?.[node.id];
      const nodeInput =
        typeof node.data?.inputValue === "string" ? node.data.inputValue : "";
      inputs = { prompt: overrideValue ?? nodeInput };
    }

    try {
      const result = await executeNode(node, inputs, apiKeys);
      executedOutputs[node.id] = result;
      executedNodes.add(node.id);

      // Capture output node results
      if (node.type === "preview-output") {
        const label = (node.data?.label as string) || node.id;
        outputs[label] = result;
        return;
      }

      // Execute downstream nodes that are now ready
      const outgoingEdges = getOutgoingEdges(node.id, edges);
      const nextPromises: Promise<void>[] = [];

      for (const edge of outgoingEdges) {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode && !executedNodes.has(targetNode.id)) {
          if (areInputsReady(targetNode.id)) {
            nextPromises.push(executeNodeAndContinue(targetNode));
          }
        }
      }

      await Promise.all(nextPromises);
    } catch (error) {
      const label = (node.data?.label as string) || node.id;
      errors[label] =
        error instanceof Error ? error.message : "Unknown error";
    }
  }

  // Start execution from all root nodes in parallel
  await Promise.all(rootNodes.map((node) => executeNodeAndContinue(node)));

  return { outputs, errors };
}
