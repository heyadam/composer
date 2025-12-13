import type { Node, Edge } from "@xyflow/react";
import type { SavedFlow, LoadFlowResult, FlowMetadata } from "./types";
import {
  validateFlow,
  sanitizeNodes,
  sanitizeEdges,
  createDefaultMetadata,
} from "./validation";

const CURRENT_FLOW_KEY = "avy-current-flow";

/**
 * Creates a SavedFlow object from nodes and edges
 */
export function createSavedFlow(
  nodes: Node[],
  edges: Edge[],
  name: string = "Untitled Flow",
  existingMetadata?: FlowMetadata
): SavedFlow {
  const now = new Date().toISOString();

  return {
    metadata: existingMetadata
      ? { ...existingMetadata, name, updatedAt: now }
      : createDefaultMetadata(name),
    nodes: sanitizeNodes(nodes),
    edges: sanitizeEdges(edges),
  };
}

/**
 * Saves a flow to localStorage
 */
export function saveFlowToStorage(flow: SavedFlow): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CURRENT_FLOW_KEY, JSON.stringify(flow));
  } catch (error) {
    console.error("Failed to save flow to localStorage:", error);
    throw new Error("Failed to save flow. Storage may be full.");
  }
}

/**
 * Loads the current flow from localStorage
 */
export function loadFlowFromStorage(): LoadFlowResult {
  if (typeof window === "undefined") {
    return { success: false, error: "Cannot access storage on server" };
  }

  try {
    const stored = localStorage.getItem(CURRENT_FLOW_KEY);
    if (!stored) {
      return { success: false, error: "No saved flow found" };
    }

    const data = JSON.parse(stored);
    const validation = validateFlow(data);

    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid flow: ${validation.errors.join(", ")}`,
        validation,
      };
    }

    return {
      success: true,
      flow: {
        ...data,
        nodes: sanitizeNodes(data.nodes),
        edges: sanitizeEdges(data.edges),
      },
      validation,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse saved flow",
    };
  }
}

/**
 * Clears the current flow from localStorage
 */
export function clearFlowFromStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_FLOW_KEY);
}

/**
 * Downloads a flow as a JSON file
 */
export function downloadFlow(flow: SavedFlow): void {
  const json = JSON.stringify(flow, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const safeName = flow.metadata.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
  const filename = `${safeName || "untitled"}.avy.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads a flow from a File object
 */
export async function loadFlowFromFile(file: File): Promise<LoadFlowResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const validation = validateFlow(data);

    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid flow file: ${validation.errors.join(", ")}`,
        validation,
      };
    }

    return {
      success: true,
      flow: {
        ...data,
        nodes: sanitizeNodes(data.nodes),
        edges: sanitizeEdges(data.edges),
      },
      validation,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse flow file",
    };
  }
}

/**
 * Opens a file picker and loads a flow
 */
export function openFlowFilePicker(): Promise<LoadFlowResult> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.avy.json";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve({ success: false, error: "No file selected" });
        return;
      }

      const result = await loadFlowFromFile(file);
      resolve(result);
    };

    input.oncancel = () => {
      resolve({ success: false, error: "File selection cancelled" });
    };

    input.click();
  });
}
