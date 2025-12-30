import { useRef, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { stringifyImageOutput } from "@/lib/image-utils";

interface UseImageFileInputOptions {
  /** The node ID to update */
  nodeId: string;
  /** The data key to store the image (e.g., "uploadedImage", "imageInput") */
  dataKey: string;
  /**
   * Optional callback when an image is added.
   * Useful for vision model switching in PromptNode.
   */
  onImageAdded?: (imageData: string) => void;
}

interface ImageFileInputResult {
  /** Ref to attach to the hidden file input element */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Handler for file input change events */
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Clear the uploaded image */
  handleClear: () => void;
  /** Programmatically trigger the file picker */
  triggerFileSelect: () => void;
}

/**
 * Hook for handling image file uploads in nodes.
 *
 * Encapsulates the common pattern of file input handling with:
 * - FileReader to read files as base64
 * - Proper image data serialization
 * - Node data updates via React Flow
 *
 * @example
 * const { fileInputRef, handleFileChange, handleClear, triggerFileSelect } = useImageFileInput({
 *   nodeId: id,
 *   dataKey: "uploadedImage",
 *   onImageAdded: (imageData) => {
 *     // Optional: Switch to vision model when image is added
 *   },
 * });
 *
 * // In JSX:
 * <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
 * <button onClick={triggerFileSelect}>Upload</button>
 * <button onClick={handleClear}>Clear</button>
 */
export function useImageFileInput({
  nodeId,
  dataKey,
  onImageAdded,
}: UseImageFileInputOptions): ImageFileInputResult {
  const { updateNodeData } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        const imageData = stringifyImageOutput({
          type: "image",
          value: base64,
          mimeType: file.type || "image/png",
        });

        updateNodeData(nodeId, { [dataKey]: imageData });
        onImageAdded?.(imageData);
      };
      reader.readAsDataURL(file);

      // Reset the input so the same file can be selected again
      e.target.value = "";
    },
    [nodeId, dataKey, onImageAdded, updateNodeData]
  );

  const handleClear = useCallback(() => {
    updateNodeData(nodeId, { [dataKey]: undefined });
  }, [nodeId, dataKey, updateNodeData]);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    fileInputRef,
    handleFileChange,
    handleClear,
    triggerFileSelect,
  };
}
