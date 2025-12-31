"use client";

import { cn } from "@/lib/utils";
import { parseImageOutput, getImageDataUrl, type ImageData } from "@/lib/image-utils";

interface NodeImagePreviewProps {
  /** Image source - can be a data URL, regular URL, or JSON-encoded ImageData string */
  src: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the square container with border/background (default: true) */
  showContainer?: boolean;
}

/**
 * Standardized image preview component for node displays.
 *
 * Renders images in a square container with object-contain to preserve aspect ratio.
 * Images are centered within the square frame with letterboxing as needed.
 *
 * @example
 * // Standard square preview in nodes
 * <NodeImagePreview src={data.executionOutput} alt="Generated" />
 *
 * @example
 * // Without container (for sidebars - natural aspect ratio)
 * <NodeImagePreview src={imageOutput} alt="Preview" showContainer={false} />
 */
export function NodeImagePreview({
  src,
  alt = "Image preview",
  className,
  showContainer = true,
}: NodeImagePreviewProps) {
  // Parse the image source - could be JSON-encoded ImageData or direct URL
  let imageSrc: string;

  const imageData = parseImageOutput(src);
  if (imageData) {
    imageSrc = getImageDataUrl(imageData);
  } else {
    // Assume it's already a usable URL (data URL or http URL)
    imageSrc = src;
  }

  if (!imageSrc) {
    return null;
  }

  if (!showContainer) {
    // Natural aspect ratio for sidebars (no square constraint)
    return (
      <img
        src={imageSrc}
        alt={alt}
        className={cn("w-full h-auto rounded-lg", className)}
      />
    );
  }

  // Square container - CSS handles aspect-square and img styling
  return (
    <div className={cn("node-image-preview", className)}>
      <img src={imageSrc} alt={alt} />
    </div>
  );
}

/**
 * Helper to check if a string contains valid image data that can be previewed.
 * Re-exports from image-utils for convenience.
 */
export { parseImageOutput, getImageDataUrl } from "@/lib/image-utils";
export type { ImageData } from "@/lib/image-utils";
