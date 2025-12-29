import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFlowCleanup } from "../useFlowCleanup";

describe("useFlowCleanup", () => {
  const mockSendBeacon = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.sendBeacon
    Object.defineProperty(navigator, "sendBeacon", {
      value: mockSendBeacon,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up event listeners by unmounting hooks
    vi.restoreAllMocks();
  });

  const triggerPageHide = () => {
    window.dispatchEvent(new Event("pagehide"));
  };

  it("should not trigger cleanup when flow ID is null", () => {
    renderHook(() =>
      useFlowCleanup({
        flowId: null,
        flowName: "Untitled",
        nodes: [{ type: "text-input" }],
        isOwner: true,
      })
    );

    triggerPageHide();

    expect(mockSendBeacon).not.toHaveBeenCalled();
  });

  it("should not trigger cleanup when user is not owner", () => {
    renderHook(() =>
      useFlowCleanup({
        flowId: "flow-123",
        flowName: "Untitled",
        nodes: [{ type: "text-input" }],
        isOwner: false,
      })
    );

    triggerPageHide();

    expect(mockSendBeacon).not.toHaveBeenCalled();
  });

  it("should not trigger cleanup when flow is already named", () => {
    renderHook(() =>
      useFlowCleanup({
        flowId: "flow-123",
        flowName: "My Saved Flow",
        nodes: [{ type: "text-input" }],
        isOwner: true,
      })
    );

    triggerPageHide();

    expect(mockSendBeacon).not.toHaveBeenCalled();
  });

  it("should trigger cleanup for Untitled flows owned by user", () => {
    renderHook(() =>
      useFlowCleanup({
        flowId: "flow-123",
        flowName: "Untitled",
        nodes: [{ type: "text-input" }],
        isOwner: true,
      })
    );

    triggerPageHide();

    expect(mockSendBeacon).toHaveBeenCalledWith(
      "/api/flows/flow-123/cleanup",
      JSON.stringify({ nodeCount: 1 })
    );
  });

  it("should send nodeCount of 0 for empty flows", () => {
    renderHook(() =>
      useFlowCleanup({
        flowId: "flow-123",
        flowName: "Untitled",
        nodes: [],
        isOwner: true,
      })
    );

    triggerPageHide();

    expect(mockSendBeacon).toHaveBeenCalledWith(
      "/api/flows/flow-123/cleanup",
      JSON.stringify({ nodeCount: 0 })
    );
  });

  it("should exclude comment nodes from node count", () => {
    renderHook(() =>
      useFlowCleanup({
        flowId: "flow-123",
        flowName: "Untitled",
        nodes: [
          { type: "text-input" },
          { type: "comment" },
          { type: "text-generation" },
          { type: "comment" },
        ],
        isOwner: true,
      })
    );

    triggerPageHide();

    // Only 2 non-comment nodes
    expect(mockSendBeacon).toHaveBeenCalledWith(
      "/api/flows/flow-123/cleanup",
      JSON.stringify({ nodeCount: 2 })
    );
  });

  it("should count only comment nodes as empty flow", () => {
    renderHook(() =>
      useFlowCleanup({
        flowId: "flow-123",
        flowName: "Untitled",
        nodes: [{ type: "comment" }, { type: "comment" }],
        isOwner: true,
      })
    );

    triggerPageHide();

    // Comments don't count - flow is empty
    expect(mockSendBeacon).toHaveBeenCalledWith(
      "/api/flows/flow-123/cleanup",
      JSON.stringify({ nodeCount: 0 })
    );
  });

  it("should handle nodes with undefined type", () => {
    renderHook(() =>
      useFlowCleanup({
        flowId: "flow-123",
        flowName: "Untitled",
        nodes: [{ type: undefined }, { type: "text-input" }],
        isOwner: true,
      })
    );

    triggerPageHide();

    // Node with undefined type is counted (not a comment)
    expect(mockSendBeacon).toHaveBeenCalledWith(
      "/api/flows/flow-123/cleanup",
      JSON.stringify({ nodeCount: 2 })
    );
  });

  it("should use latest values via refs on pagehide", () => {
    const { rerender } = renderHook(
      ({ flowId, flowName, nodes, isOwner }) =>
        useFlowCleanup({ flowId, flowName, nodes, isOwner }),
      {
        initialProps: {
          flowId: "flow-123",
          flowName: "Untitled",
          nodes: [{ type: "text-input" }],
          isOwner: true,
        },
      }
    );

    // Update props
    rerender({
      flowId: "flow-456",
      flowName: "Untitled",
      nodes: [{ type: "text-input" }, { type: "text-generation" }],
      isOwner: true,
    });

    triggerPageHide();

    // Should use updated values
    expect(mockSendBeacon).toHaveBeenCalledWith(
      "/api/flows/flow-456/cleanup",
      JSON.stringify({ nodeCount: 2 })
    );
  });

  it("should handle sendBeacon failure gracefully", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSendBeacon.mockImplementation(() => {
      throw new Error("Network error");
    });

    renderHook(() =>
      useFlowCleanup({
        flowId: "flow-123",
        flowName: "Untitled",
        nodes: [{ type: "text-input" }],
        isOwner: true,
      })
    );

    // Should not throw
    expect(() => triggerPageHide()).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to send cleanup beacon:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("should clean up event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() =>
      useFlowCleanup({
        flowId: "flow-123",
        flowName: "Untitled",
        nodes: [{ type: "text-input" }],
        isOwner: true,
      })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "pagehide",
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });
});
