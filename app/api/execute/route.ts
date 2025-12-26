import "server-only"; // Prevent client bundling

import { NextRequest, NextResponse } from "next/server";
import { streamText, generateText, type LanguageModel, type CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import OpenAI from "openai";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import type { MagicEvalTestCase, MagicEvalResults } from "@/types/flow";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { decryptKeys } from "@/lib/encryption";
import { parseImageOutput } from "@/lib/image-utils";

// Required for service role client and decryption
export const runtime = "nodejs";

interface ApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
}

function getModel(provider: string, model: string, apiKeys?: ApiKeys): LanguageModel {
  switch (provider) {
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: apiKeys?.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(model);
    }
    default: {
      const openai = createOpenAI({
        apiKey: apiKeys?.openai || process.env.OPENAI_API_KEY,
      });
      return openai(model);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { apiKeys } = body;
    const { type } = body;

    // Owner-funded execution mode
    if (body.shareToken) {
      // Require runId for rate limiting when using owner-funded execution
      if (!body.runId) {
        return NextResponse.json(
          { error: "runId required for owner-funded execution" },
          { status: 400 }
        );
      }

      const supabase = createServiceRoleClient();

      // Rate limit using runId for deduplication (handles parallel node execution)
      // IMPORTANT: Fail closed - if RPC errors, deny the request to prevent unlimited executions
      const { data: limitResult, error: limitError } = await supabase.rpc("check_and_log_run", {
        p_share_token: body.shareToken,
        p_run_id: body.runId,
        p_minute_limit: 10,
        p_daily_limit: 100,
      });

      if (limitError) {
        console.error("Rate limit check failed:", limitError);
        return NextResponse.json(
          { error: "Rate limit check unavailable" },
          { status: 503 }
        );
      }

      if (limitResult && !limitResult.allowed) {
        // Map reason to appropriate status code
        const reason = limitResult.reason || "Rate limit exceeded";
        let status = 429; // Default to rate limit
        if (reason.includes("quota")) {
          status = 403; // Daily quota exceeded
        } else if (reason.includes("not found")) {
          status = 404; // Flow not found
        }
        return NextResponse.json({ error: reason }, { status });
      }

      // Fetch owner's keys - RPC already checks use_owner_keys flag
      // Returns null if: flow not found, use_owner_keys=false, or no keys stored
      const { data: encryptedKeys, error: keysError } = await supabase.rpc("get_owner_keys_for_execution", {
        p_share_token: body.shareToken,
      });

      if (keysError) {
        console.error("Failed to fetch owner keys:", keysError);
        return NextResponse.json(
          { error: "Failed to verify execution permissions" },
          { status: 503 }
        );
      }

      if (!encryptedKeys) {
        return NextResponse.json(
          { error: "Owner has not enabled shared keys for this flow" },
          { status: 403 }
        );
      }

      const decrypted = decryptKeys(encryptedKeys, process.env.ENCRYPTION_KEY!);
      apiKeys = { openai: decrypted.openai, google: decrypted.google, anthropic: decrypted.anthropic };
    }

    if (type === "text-generation") {
      // Support both old format (input, prompt) and new format (inputs.prompt, inputs.system)
      const {
        inputs,
        prompt: legacyPrompt,
        input: legacyInput,
        provider,
        model,
        verbosity,
        thinking,
        // Google-specific options
        googleThinkingConfig,
        googleSafetyPreset,
        googleStructuredOutputs,
        // Image input for multimodal
        imageInput,
      } = body;

      // Get prompt (user message) and system prompt from either format
      const promptInput = inputs?.prompt ?? legacyInput ?? "";
      const systemPrompt = inputs?.system ?? legacyPrompt ?? "";

      // Parse image if provided
      const imageData = imageInput ? parseImageOutput(imageInput) : null;

      // Validate image MIME type if present
      const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (imageData && !SUPPORTED_IMAGE_TYPES.includes(imageData.mimeType)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${imageData.mimeType}. Supported formats: JPEG, PNG, GIF, WebP` },
          { status: 400 }
        );
      }

      // Build messages array - using CoreMessage type for multimodal support
      const messages: CoreMessage[] = [];
      if (typeof systemPrompt === "string" && systemPrompt.trim().length > 0) {
        messages.push({ role: "system", content: systemPrompt.trim() });
      }

      if (imageData) {
        // Multimodal message with image
        messages.push({
          role: "user",
          content: [
            { type: "text", text: String(promptInput) },
            {
              type: "image",
              image: Buffer.from(imageData.value, "base64"),
              mediaType: imageData.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            },
          ],
        });
      } else {
        // Text-only message
        messages.push({ role: "user", content: String(promptInput) });
      }

      // Build provider options for OpenAI
      const openaiOptions: Record<string, string> = {};
      if (provider === "openai" || !provider) {
        if (verbosity) {
          openaiOptions.textVerbosity = verbosity;
        }
        if (thinking) {
          openaiOptions.reasoningSummary = "auto";
        }
      }

      // Build provider options for Google
      const googleOptions: GoogleGenerativeAIProviderOptions = {};
      let googleThinkingEnabled = false;
      if (provider === "google") {
        // Thinking config
        if (googleThinkingConfig) {
          const thinkingConfig: GoogleGenerativeAIProviderOptions["thinkingConfig"] = {};
          if (googleThinkingConfig.thinkingLevel) {
            thinkingConfig.thinkingLevel = googleThinkingConfig.thinkingLevel;
            // Enable thinking stream for high level (produces substantial reasoning)
            googleThinkingEnabled = googleThinkingConfig.thinkingLevel === "high";
          }
          if (googleThinkingConfig.thinkingBudget !== undefined && googleThinkingConfig.thinkingBudget > 0) {
            thinkingConfig.thinkingBudget = googleThinkingConfig.thinkingBudget;
            googleThinkingEnabled = true;
          }
          // Auto-enable includeThoughts when thinking is enabled
          if (googleThinkingEnabled) {
            thinkingConfig.includeThoughts = true;
          } else if (googleThinkingConfig.includeThoughts !== undefined) {
            thinkingConfig.includeThoughts = googleThinkingConfig.includeThoughts;
          }
          if (Object.keys(thinkingConfig).length > 0) {
            googleOptions.thinkingConfig = thinkingConfig;
          }
        }

        // Safety settings from preset
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
            threshold: thresholdMap[googleSafetyPreset] || "HARM_BLOCK_THRESHOLD_UNSPECIFIED" as HarmThreshold,
          }));
        }

        // Structured outputs
        if (googleStructuredOutputs !== undefined) {
          googleOptions.structuredOutputs = googleStructuredOutputs;
        }
      }

      try {
        // Build streamText options
        const streamOptions: Parameters<typeof streamText>[0] = {
          model: getModel(provider || "openai", model || "gpt-5.2", apiKeys),
          messages,
          maxOutputTokens: 1000,
        };

        // Add provider options if any
        if (Object.keys(openaiOptions).length > 0 || Object.keys(googleOptions).length > 0) {
          streamOptions.providerOptions = {};
          if (Object.keys(openaiOptions).length > 0) {
            streamOptions.providerOptions.openai = openaiOptions;
          }
          if (Object.keys(googleOptions).length > 0) {
            streamOptions.providerOptions.google = googleOptions;
          }
        }

        const result = streamText(streamOptions);

        // If Google thinking is enabled, use custom stream to include reasoning
        if (googleThinkingEnabled) {
          const encoder = new TextEncoder();
          const readableStream = new ReadableStream({
            async start(controller) {
              try {
                for await (const part of result.fullStream) {
                  if (part.type === "reasoning-delta") {
                    // Send reasoning chunk
                    const data = JSON.stringify({ type: "reasoning", text: part.text });
                    controller.enqueue(encoder.encode(data + "\n"));
                  } else if (part.type === "text-delta") {
                    // Send text chunk
                    const data = JSON.stringify({ type: "text", text: part.text });
                    controller.enqueue(encoder.encode(data + "\n"));
                  }
                }
                controller.close();
              } catch (error) {
                console.error("Stream error:", error);
                controller.error(error);
              }
            },
          });

          return new Response(readableStream, {
            headers: {
              "Content-Type": "application/x-ndjson",
              "Transfer-Encoding": "chunked",
            },
          });
        }

        return result.toTextStreamResponse();
      } catch (streamError) {
        console.error("[API] streamText error:", streamError);
        return NextResponse.json(
          { error: streamError instanceof Error ? streamError.message : "Stream error" },
          { status: 500 }
        );
      }
    }

    if (type === "image-generation") {
      const { prompt, provider, model, outputFormat, size, quality, partialImages, aspectRatio, input, imageInput } = body;

      // Combine optional prompt template with input
      const fullPrompt = prompt
        ? `${prompt}\n\nUser request: ${input}`
        : input;

      // Check if we have a source image for image-to-image editing
      const isImageEdit = !!imageInput;
      let parsedImageInput: { value: string; mimeType: string } | null = null;
      if (isImageEdit) {
        try {
          const parsed = JSON.parse(imageInput);
          if (!parsed.value || typeof parsed.value !== "string") {
            return NextResponse.json({ error: "Invalid image input: missing or invalid base64 value" }, { status: 400 });
          }
          parsedImageInput = {
            value: parsed.value,
            mimeType: parsed.mimeType || "image/png",
          };
        } catch (e) {
          console.error("Failed to parse imageInput:", e);
          return NextResponse.json({ error: "Invalid image input format" }, { status: 400 });
        }
      }

      // Handle Google Gemini image generation/editing
      if (provider === "google") {
        try {
          const google = createGoogleGenerativeAI({
            apiKey: apiKeys?.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          });

          // For image editing, use messages format with multimodal content
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

            // Extract image from result.files
            if (result.files && result.files.length > 0) {
              const file = result.files[0];
              return NextResponse.json({
                type: "image",
                value: file.base64,
                mimeType: file.mediaType || "image/png",
              });
            }

            return NextResponse.json({ error: "No image generated", debug: result }, { status: 500 });
          }

          // For text-to-image generation, use simple prompt
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

          // Extract image from result.files
          if (result.files && result.files.length > 0) {
            const file = result.files[0];
            return NextResponse.json({
              type: "image",
              value: file.base64,
              mimeType: file.mediaType || "image/png",
            });
          }

          return NextResponse.json({ error: "No image generated", debug: result }, { status: 500 });
        } catch (googleError) {
          console.error("Google image error:", googleError);
          return NextResponse.json({
            error: googleError instanceof Error ? googleError.message : "Google image generation failed",
            debug: String(googleError)
          }, { status: 500 });
        }
      }

      // Handle OpenAI image generation/editing (default)
      const openaiClient = new OpenAI({
        apiKey: apiKeys?.openai || process.env.OPENAI_API_KEY,
      });
      const mimeType = `image/${outputFormat || "webp"}`;

      // Build input text based on whether we're editing or generating
      const inputText = isImageEdit
        ? `Edit this image: ${fullPrompt || "Enhance and improve the image quality"}`
        : `Generate an image based on this description: ${fullPrompt}`;

      // Build image_generation tool config - include image for editing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const imageGenTool: any = {
        type: "image_generation",
        partial_images: partialImages ?? 3,
        quality: quality || "low",
        size: size || "1024x1024",
        output_format: outputFormat || "webp",
      };

      // Add source image for image-to-image editing
      if (isImageEdit && parsedImageInput) {
        imageGenTool.image = parsedImageInput.value;
      }

      // Use OpenAI Responses API directly for streaming partial images
      const stream = await openaiClient.responses.create({
        model: model || "gpt-5.2",
        input: inputText,
        stream: true,
        tools: [imageGenTool],
      });

      // Stream partial images and final image as newline-delimited JSON
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (event.type === "response.image_generation_call.partial_image") {
                // Send partial image
                const data = JSON.stringify({
                  type: "partial",
                  index: event.partial_image_index,
                  value: event.partial_image_b64,
                  mimeType,
                });
                controller.enqueue(encoder.encode(data + "\n"));
              } else if (event.type === "response.output_item.done") {
                // Check for final image in output item
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const item = event.item as any;
                if (item?.type === "image_generation_call" && item?.result) {
                  const data = JSON.stringify({
                    type: "image",
                    value: item.result,
                    mimeType,
                  });
                  controller.enqueue(encoder.encode(data + "\n"));
                }
              }
            }
            controller.close();
          } catch (error) {
            console.error("Stream error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    if (type === "react-component") {
      const { inputs, provider, model, stylePreset } = body;
      const promptInput = inputs?.prompt ?? "";
      const userSystemPrompt = inputs?.system ?? "";

      // Style-specific instructions
      const styleInstructions: Record<string, string> = {
        simple: `STYLING (Vercel/v0 inspired):
- Clean, minimal, modern aesthetic
- Use neutral color palette: zinc/slate/gray backgrounds, subtle borders
- Soft shadows: shadow-sm, shadow-md with low opacity
- Rounded corners: rounded-lg or rounded-xl
- Proper spacing: consistent padding (p-4, p-6) and gaps (gap-4)
- Typography: font-medium for labels, text-sm for secondary text
- Subtle hover states: hover:bg-zinc-100 dark:hover:bg-zinc-800
- Border colors: border-zinc-200 dark:border-zinc-800
- Focus rings: focus:ring-2 focus:ring-zinc-900
- Buttons: bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg
- Cards: bg-white dark:bg-zinc-950 border rounded-xl p-6
- Keep it sophisticated and professional`,

        none: `STYLING:
- Do NOT add any CSS classes or inline styles
- Use plain HTML elements without styling
- Focus purely on structure and functionality
- No Tailwind, no inline styles, no CSS`,

        robust: `STYLING:
- Create a polished, production-ready UI
- Use Tailwind CSS with animations and transitions
- Include hover states, focus states, and visual feedback
- Add shadows, gradients, and modern design patterns
- Make it responsive and accessible
- Include loading states and error handling where appropriate`,
      };

      const selectedStyle = styleInstructions[stylePreset || "simple"] || styleInstructions.simple;

      // Build comprehensive system prompt for React component generation
      const systemPrompt = `You are an expert React component developer. Generate clean, functional React components.

RULES:
1. Generate a single React functional component
2. NO import statements - React hooks (useState, useEffect, etc.) are already available globally
3. Export the component as default: \`export default function Component() {...}\`
4. Use modern React patterns (hooks, functional components)
5. Include helpful comments for complex logic
6. Handle edge cases gracefully

${selectedStyle}

IMPORTANT:
- Do NOT use any import statements (React and hooks are globally available)
- Do NOT use external dependencies (no axios, lodash, etc.)
- Do NOT use external CSS files
- Use standard HTML elements and React hooks only
- Include any mock data the component needs inline

${userSystemPrompt ? `\nADDITIONAL INSTRUCTIONS:\n${userSystemPrompt}` : ""}

OUTPUT FORMAT:
Return ONLY the component code wrapped in a jsx code block. No explanations before or after.

Example output:
\`\`\`jsx
export default function Component() {
  return (
    <div className="p-4">
      <h1>Hello World</h1>
    </div>
  );
}
\`\`\``;

      const messages: { role: "system" | "user"; content: string }[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: String(promptInput) },
      ];

      try {
        const result = streamText({
          model: getModel(provider || "openai", model || "gpt-5.2", apiKeys),
          messages,
          maxOutputTokens: 4000,
        });

        return result.toTextStreamResponse();
      } catch (streamError) {
        console.error("[API] react-component streamText error:", streamError);
        return NextResponse.json(
          { error: streamError instanceof Error ? streamError.message : "Stream error" },
          { status: 500 }
        );
      }
    }

    if (type === "magic-generate") {
      const { prompt } = body;

      if (!prompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
      }

      const anthropic = createAnthropic({
        apiKey: apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY,
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
CODE: [the return statement]

EXAMPLES:
User: "make uppercase"
Output:
EXPLANATION: Converts the first input to uppercase text.
CODE: return String(input1 || '').toUpperCase();

User: "add the two numbers"
Output:
EXPLANATION: Adds the two input numbers together.
CODE: return Number(input1 || 0) + Number(input2 || 0);

User: "concatenate with a space"
Output:
EXPLANATION: Joins the two inputs with a space between them.
CODE: return String(input1 || '') + ' ' + String(input2 || '');`;

      try {
        const result = await generateText({
          model: anthropic("claude-haiku-4-5"),
          system: magicSystemPrompt,
          prompt: prompt,
          maxOutputTokens: 500,
        });

        // Parse the response to extract explanation and code
        const responseText = result.text.trim();

        // Extract explanation
        const explanationMatch = responseText.match(/EXPLANATION:\s*(.+?)(?=\n|CODE:)/i);
        const explanation = explanationMatch ? explanationMatch[1].trim() : "";

        // Extract code
        const codeMatch = responseText.match(/CODE:\s*([\s\S]+?)$/i);
        let code = codeMatch ? codeMatch[1].trim() : responseText;

        // Remove markdown fences if present
        if (code.startsWith("```")) {
          code = code.replace(/^```(?:javascript|js)?\n?/, "").replace(/\n?```$/, "");
        }

        // Basic validation - must have return statement
        if (!code.includes("return")) {
          return NextResponse.json(
            { error: "Generated code must contain a return statement" },
            { status: 422 }
          );
        }

        // Check for forbidden patterns - more comprehensive list
        // Note: This is defense-in-depth, not a complete sandbox
        const forbiddenPatterns = [
          // Function constructors and eval
          /\beval\b/i,
          /\bFunction\b/,
          /\bconstructor\b/,
          /\b__proto__\b/,
          /\bprototype\b/,
          // Network and async
          /\bfetch\b/i,
          /\bXMLHttpRequest\b/i,
          /\bWebSocket\b/i,
          /\bimport\b/,
          /\brequire\b/,
          /\bawait\b/,
          /\basync\b/,
          // Global access
          /\bprocess\b/,
          /\bwindow\b/,
          /\bdocument\b/,
          /\bglobal\b/,
          /\bglobalThis\b/,
          /\bself\b/,
          // Dangerous loops (infinite loop prevention)
          /\bwhile\s*\(\s*true\s*\)/,
          /\bwhile\s*\(\s*1\s*\)/,
          /\bfor\s*\(\s*;\s*;\s*\)/,
          // Bracket notation access to globals
          /\[\s*['"`](?:eval|Function|window|document|process|global)['"`]\s*\]/,
        ];

        for (const pattern of forbiddenPatterns) {
          if (pattern.test(code)) {
            return NextResponse.json(
              { error: "Generated code contains unsafe patterns" },
              { status: 422 }
            );
          }
        }

        // Additional check: code should be simple (limit complexity)
        if (code.length > 500) {
          return NextResponse.json(
            { error: "Generated code is too complex" },
            { status: 422 }
          );
        }

        // Basic evaluation: syntax check and test execution
        const evalResults: MagicEvalResults = {
          syntaxValid: false,
          testCases: [],
          allPassed: false,
        };

        // Test cases to run
        const testCases: Array<{ input1: string | number | null; input2: string | number | null }> = [
          { input1: null, input2: null },
          { input1: "hello", input2: null },
          { input1: "hello", input2: "world" },
          { input1: 42, input2: 10 },
          { input1: "", input2: "" },
        ];

        try {
          // Syntax validation: try to create the function
          const fn = new Function("input1", "input2", `"use strict"; ${code}`);
          evalResults.syntaxValid = true;

          // Run test cases
          let allPassed = true;
          for (const tc of testCases) {
            const testResult: MagicEvalTestCase = {
              input1: tc.input1,
              input2: tc.input2,
            };

            try {
              const result = fn(tc.input1, tc.input2);
              testResult.result = result;

              // Validate return type (should be string, number, or null)
              if (result !== null && typeof result !== "string" && typeof result !== "number") {
                testResult.error = `Unexpected return type: ${typeof result}`;
                allPassed = false;
              }
            } catch (execError) {
              testResult.error = execError instanceof Error ? execError.message : "Execution failed";
              allPassed = false;
            }

            evalResults.testCases.push(testResult);
          }

          evalResults.allPassed = allPassed;
        } catch (syntaxError) {
          evalResults.syntaxValid = false;
          evalResults.syntaxError = syntaxError instanceof Error ? syntaxError.message : "Syntax error";
          evalResults.allPassed = false;
        }

        return NextResponse.json({ code, explanation, eval: evalResults });
      } catch (genError) {
        console.error("[API] magic-generate error:", genError);
        return NextResponse.json(
          { error: genError instanceof Error ? genError.message : "Code generation failed" },
          { status: 500 }
        );
      }
    }

    if (type === "audio-transcription") {
      const { audioBuffer, audioMimeType, model, language } = body;

      if (!audioBuffer) {
        return NextResponse.json({ error: "No audio data provided" }, { status: 400 });
      }

      // Convert base64 to bytes and check size
      const audioBytes = Buffer.from(audioBuffer, "base64");
      const MAX_SIZE_MB = 25;
      if (audioBytes.length > MAX_SIZE_MB * 1024 * 1024) {
        return NextResponse.json(
          { error: `Audio file too large (max ${MAX_SIZE_MB}MB)` },
          { status: 400 }
        );
      }

      const openai = new OpenAI({
        apiKey: apiKeys?.openai || process.env.OPENAI_API_KEY,
      });

      // Map MIME type to file extension
      const extMap: Record<string, string> = {
        "audio/webm": "webm",
        "audio/webm;codecs=opus": "webm",
        "audio/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
      };
      const ext = extMap[audioMimeType] || "webm";
      const file = new File([audioBytes], `audio.${ext}`, { type: audioMimeType });

      try {
        // Transcription (non-streaming for now due to SDK typing issues)
        const result = await openai.audio.transcriptions.create({
          file,
          model: model || "gpt-4o-transcribe",
          response_format: "text",
          ...(language && { language }),
        });

        // Return the transcription text as a stream-like response
        const encoder = new TextEncoder();
        const transcriptText = typeof result === "string" ? result : String(result);
        const readableStream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(transcriptText));
            controller.close();
          },
        });

        return new Response(readableStream, {
          headers: {
            "Content-Type": "text/plain",
            "Transfer-Encoding": "chunked",
          },
        });
      } catch (transcribeError) {
        console.error("Transcription error:", transcribeError);
        return NextResponse.json(
          { error: transcribeError instanceof Error ? transcribeError.message : "Transcription failed" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Unknown execution type" }, { status: 400 });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}
