/**
 * OpenAI Responses API type definitions
 *
 * The OpenAI SDK doesn't fully type the newer Responses API features,
 * particularly image generation tools. These types fill in the gaps.
 */

/**
 * Configuration for the image_generation tool in OpenAI Responses API
 *
 * Note: We use string for size to maintain compatibility with UI options
 * that may differ from the SDK's strict type definitions.
 */
export interface OpenAIImageGenerationTool {
  type: "image_generation";
  /** Number of partial images to generate (0-3) */
  partial_images?: number;
  /** Image quality: auto, low, medium, high */
  quality?: "auto" | "low" | "medium" | "high";
  /** Image size (e.g., "1024x1024", "1024x1792", "1792x1024") */
  size?: string;
  /** Output format */
  output_format?: "webp" | "png" | "jpeg";
  /** Source image for image-to-image editing (base64) */
  image?: string;
}

/**
 * Output item for image generation call
 */
export interface OpenAIImageGenerationCallItem {
  type: "image_generation_call";
  /** The generated image as base64 */
  result?: string;
}

/**
 * Type guard to check if an output item is an image generation call
 */
export function isImageGenerationCallItem(
  item: unknown
): item is OpenAIImageGenerationCallItem {
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    (item as { type: string }).type === "image_generation_call"
  );
}
