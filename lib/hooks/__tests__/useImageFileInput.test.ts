import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useImageFileInput } from "../useImageFileInput";

// Mock useReactFlow
const mockUpdateNodeData = vi.fn();
vi.mock("@xyflow/react", () => ({
  useReactFlow: () => ({
    updateNodeData: mockUpdateNodeData,
  }),
}));

// Mock stringifyImageOutput
vi.mock("@/lib/image-utils", () => ({
  stringifyImageOutput: vi.fn((data) => JSON.stringify(data)),
}));

// Mock FileReader
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;

  readAsDataURL(file: File) {
    // Simulate async read
    setTimeout(() => {
      this.result = `data:${file.type};base64,dGVzdGJhc2U2NA==`;
      this.onload?.();
    }, 0);
  }
}

describe("useImageFileInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - mocking FileReader
    global.FileReader = MockFileReader;
  });

  it("should return a ref and handler functions", () => {
    const { result } = renderHook(() =>
      useImageFileInput({
        nodeId: "node_1",
        dataKey: "uploadedImage",
      })
    );

    expect(result.current.fileInputRef).toBeDefined();
    expect(result.current.fileInputRef.current).toBeNull();
    expect(typeof result.current.handleFileChange).toBe("function");
    expect(typeof result.current.handleClear).toBe("function");
    expect(typeof result.current.triggerFileSelect).toBe("function");
  });

  it("should update node data when file is selected", async () => {
    const { result } = renderHook(() =>
      useImageFileInput({
        nodeId: "node_1",
        dataKey: "uploadedImage",
      })
    );

    const mockFile = new File(["test"], "test.png", { type: "image/png" });
    const mockEvent = {
      target: {
        files: [mockFile],
        value: "test.png",
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(mockEvent);
    });

    await waitFor(() => {
      expect(mockUpdateNodeData).toHaveBeenCalledWith("node_1", {
        uploadedImage: expect.stringContaining("image/png"),
      });
    });
  });

  it("should call onImageAdded callback when provided", async () => {
    const onImageAdded = vi.fn();

    const { result } = renderHook(() =>
      useImageFileInput({
        nodeId: "node_1",
        dataKey: "imageInput",
        onImageAdded,
      })
    );

    const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const mockEvent = {
      target: {
        files: [mockFile],
        value: "test.jpg",
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(mockEvent);
    });

    await waitFor(() => {
      expect(onImageAdded).toHaveBeenCalledWith(expect.any(String));
    });
  });

  it("should not update when no file is selected", () => {
    const { result } = renderHook(() =>
      useImageFileInput({
        nodeId: "node_1",
        dataKey: "uploadedImage",
      })
    );

    const mockEvent = {
      target: {
        files: [],
        value: "",
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(mockEvent);
    });

    expect(mockUpdateNodeData).not.toHaveBeenCalled();
  });

  it("should clear image data when handleClear is called", () => {
    const { result } = renderHook(() =>
      useImageFileInput({
        nodeId: "node_1",
        dataKey: "uploadedImage",
      })
    );

    act(() => {
      result.current.handleClear();
    });

    expect(mockUpdateNodeData).toHaveBeenCalledWith("node_1", {
      uploadedImage: undefined,
    });
  });

  it("should use the correct dataKey for different nodes", () => {
    const { result } = renderHook(() =>
      useImageFileInput({
        nodeId: "node_2",
        dataKey: "imageInput",
      })
    );

    act(() => {
      result.current.handleClear();
    });

    expect(mockUpdateNodeData).toHaveBeenCalledWith("node_2", {
      imageInput: undefined,
    });
  });

  it("should trigger file input click when triggerFileSelect is called", () => {
    const { result } = renderHook(() =>
      useImageFileInput({
        nodeId: "node_1",
        dataKey: "uploadedImage",
      })
    );

    // Create a mock input element with click spy
    const mockInput = document.createElement("input");
    const clickSpy = vi.spyOn(mockInput, "click");

    // Manually assign the ref
    Object.defineProperty(result.current.fileInputRef, "current", {
      value: mockInput,
      writable: true,
    });

    act(() => {
      result.current.triggerFileSelect();
    });

    expect(clickSpy).toHaveBeenCalled();
  });

  it("should reset input value after file selection to allow same file reselection", async () => {
    const { result } = renderHook(() =>
      useImageFileInput({
        nodeId: "node_1",
        dataKey: "uploadedImage",
      })
    );

    const mockFile = new File(["test"], "test.png", { type: "image/png" });
    const mockTarget = {
      files: [mockFile],
      value: "C:\\fakepath\\test.png",
    };
    const mockEvent = {
      target: mockTarget,
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(mockEvent);
    });

    // Input value should be reset to empty string
    expect(mockTarget.value).toBe("");
  });

  it("should default to image/png if file type is not available", async () => {
    const { result } = renderHook(() =>
      useImageFileInput({
        nodeId: "node_1",
        dataKey: "uploadedImage",
      })
    );

    // File without type
    const mockFile = new File(["test"], "test", { type: "" });
    const mockEvent = {
      target: {
        files: [mockFile],
        value: "test",
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(mockEvent);
    });

    await waitFor(() => {
      expect(mockUpdateNodeData).toHaveBeenCalledWith("node_1", {
        uploadedImage: expect.stringContaining("image/png"),
      });
    });
  });
});
