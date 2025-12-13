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

    if (type === "prompt") {
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

      const result = streamText({
        model: getModel(provider || "openai", model || "gpt-5", apiKeys),
        messages,
        maxOutputTokens: 1000,
        ...(Object.keys(openaiOptions).length > 0 && {
          providerOptions: { openai: openaiOptions },
        }),
      });

      return result.toTextStreamResponse();
    }

    if (type === "image") {
      const { prompt, provider, model, outputFormat, size, quality, partialImages, aspectRatio, input } = body;

      // Combine optional prompt template with input
      const fullPrompt = prompt
        ? `${prompt}\n\nUser request: ${input}`
        : input;

      // Handle Google Gemini image generation
      if (provider === "google") {
        try {
          console.log("Google image generation request:", { model, fullPrompt, aspectRatio });
          const google = createGoogleGenerativeAI({
            apiKey: apiKeys?.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          });
          const result = await generateText({
            model: google(model || "gemini-2.5-flash-image"),
            prompt: fullPrompt,
            providerOptions: {
              google: {
                responseModalities: ["IMAGE"],
                imageConfig: {
                  aspectRatio: aspectRatio || "1:1",
                },
              } satisfies GoogleGenerativeAIProviderOptions,
            },
          });

          console.log("Google image generation result:", JSON.stringify(result, null, 2));

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
          console.error("Google image generation error:", googleError);
          return NextResponse.json({
            error: googleError instanceof Error ? googleError.message : "Google image generation failed",
            debug: String(googleError)
          }, { status: 500 });
        }
      }

      // Handle OpenAI image generation (default)
      const openaiClient = new OpenAI({
        apiKey: apiKeys?.openai || process.env.OPENAI_API_KEY,
      });
      const mimeType = `image/${outputFormat || "webp"}`;

      // Use OpenAI Responses API directly for streaming partial images
      const stream = await openaiClient.responses.create({
        model: model || "gpt-5",
        input: `Generate an image based on this description: ${fullPrompt}`,
        stream: true,
        tools: [
          {
            type: "image_generation",
            partial_images: partialImages ?? 3,
            quality: quality || "low",
            size: size || "1024x1024",
            output_format: outputFormat || "webp",
          },
        ],
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

    return NextResponse.json({ error: "Unknown execution type" }, { status: 400 });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}
