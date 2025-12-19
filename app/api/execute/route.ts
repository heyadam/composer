import { NextRequest, NextResponse } from "next/server";
import { streamText, generateText, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import OpenAI from "openai";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";

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
    const { type, apiKeys } = body;

    if (type === "text-generation") {
      // Support both old format (input, prompt) and new format (inputs.prompt, inputs.system)
      const { inputs, prompt: legacyPrompt, input: legacyInput, provider, model, verbosity, thinking } = body;

      // Get prompt (user message) and system prompt from either format
      const promptInput = inputs?.prompt ?? legacyInput ?? "";
      const systemPrompt = inputs?.system ?? legacyPrompt ?? "";

      const messages: { role: "system" | "user"; content: string }[] = [];
      if (typeof systemPrompt === "string" && systemPrompt.trim().length > 0) {
        messages.push({ role: "system", content: systemPrompt.trim() });
      }
      messages.push({ role: "user", content: String(promptInput) });

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

      try {
        const result = streamText({
          model: getModel(provider || "openai", model || "gpt-5.2", apiKeys),
          messages,
          maxOutputTokens: 1000,
          ...(Object.keys(openaiOptions).length > 0 && {
            providerOptions: { openai: openaiOptions },
          }),
        });

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
          console.log("Google image request:", { model, fullPrompt, aspectRatio, isImageEdit });
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

            console.log("Google image edit result:", JSON.stringify(result, null, 2));

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

          console.log("Google image result:", JSON.stringify(result, null, 2));

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
2. The component should be self-contained (no external imports except React)
3. Export the component as default: \`export default function Component() {...}\`
4. Use modern React patterns (hooks, functional components)
5. Include helpful comments for complex logic
6. Handle edge cases gracefully

${selectedStyle}

IMPORTANT:
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

        return NextResponse.json({ code, explanation });
      } catch (genError) {
        console.error("[API] magic-generate error:", genError);
        return NextResponse.json(
          { error: genError instanceof Error ? genError.message : "Code generation failed" },
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
