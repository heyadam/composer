"use client";

import { useCallback, useRef } from "react";
import type { Node } from "@xyflow/react";
import { useApiKeys } from "@/lib/api-keys";

interface GenerationState {
  abortController: AbortController | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

interface UseCommentSuggestionsOptions {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
}

// Helper to parse streaming response
function parsePartialResponse(text: string): { title?: string; description?: string } {
  const titleMatch = text.match(/TITLE:\s*(.+?)(?:\n|$)/);
  // Use [\s\S] instead of .s flag for ES2017 compatibility
  const descMatch = text.match(/DESCRIPTION:\s*([\s\S]+?)$/);
  return {
    title: titleMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim(),
  };
}

export function useCommentSuggestions({
  nodes,
  setNodes,
}: UseCommentSuggestionsOptions) {
  // Map of commentId -> GenerationState
  const generationStates = useRef<Map<string, GenerationState>>(new Map());
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;

  const { keys: apiKeys } = useApiKeys();

  // Cancel generation for a specific comment
  const cancelGeneration = useCallback((commentId: string) => {
    const state = generationStates.current.get(commentId);
    if (state) {
      if (state.debounceTimer) clearTimeout(state.debounceTimer);
      if (state.abortController) state.abortController.abort();
      generationStates.current.delete(commentId);
    }
  }, []);

  // Mark comment as user-edited (prevents future auto-generation)
  const markUserEdited = useCallback((commentId: string) => {
    cancelGeneration(commentId);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === commentId
          ? { ...n, data: { ...n.data, userEdited: true, isGenerating: false } }
          : n
      )
    );
  }, [setNodes, cancelGeneration]);

  // Internal: perform the actual generation
  const generateForComment = useCallback(async (commentId: string) => {
    // Use ref to get current nodes (avoid stale closure)
    const currentNodes = nodesRef.current;

    // Get child nodes (excluding other comments)
    const childNodes = currentNodes.filter(
      (n) => n.parentId === commentId && n.type !== "comment"
    );

    // Find the comment
    const comment = currentNodes.find((n) => n.id === commentId);

    // Don't generate if no children or already user-edited
    if (childNodes.length === 0 || comment?.data?.userEdited) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === commentId
            ? { ...n, data: { ...n.data, isGenerating: false } }
            : n
        )
      );
      return;
    }

    const abortController = new AbortController();
    const state = generationStates.current.get(commentId) || {
      abortController: null,
      debounceTimer: null,
    };
    state.abortController = abortController;
    generationStates.current.set(commentId, state);

    // Set generating state
    setNodes((nds) =>
      nds.map((n) =>
        n.id === commentId ? { ...n, data: { ...n.data, isGenerating: true } } : n
      )
    );

    try {
      // Extract only relevant fields from node data for the API
      const sanitizedChildNodes = childNodes.map((n) => {
        const data = n.data as Record<string, unknown>;
        return {
          id: n.id,
          type: n.type,
          label: data?.label as string | undefined,
          data: {
            // Text Generation node fields
            userPrompt: data?.userPrompt,
            systemPrompt: data?.systemPrompt,
            // AI Logic node fields
            transformPrompt: data?.transformPrompt,
            // Text Input node fields
            inputValue: data?.inputValue,
            // Image Generation node fields
            prompt: data?.prompt,
            provider: data?.provider,
            model: data?.model,
          },
        };
      });

      const response = await fetch("/api/comment-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childNodes: sanitizedChildNodes,
          apiKeys,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to get suggestion");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullText += decoder.decode(value);

        // Parse partial title/description and update in real-time
        const { title, description } = parsePartialResponse(fullText);

        setNodes((nds) =>
          nds.map((n) =>
            n.id === commentId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    label: title || n.data.label,
                    description: description ?? n.data.description,
                  },
                }
              : n
          )
        );
      }

      // Final update: remove generating state
      setNodes((nds) =>
        nds.map((n) =>
          n.id === commentId
            ? { ...n, data: { ...n.data, isGenerating: false } }
            : n
        )
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Comment suggestion error:", err);
      }
      setNodes((nds) =>
        nds.map((n) =>
          n.id === commentId
            ? { ...n, data: { ...n.data, isGenerating: false } }
            : n
        )
      );
    }
  }, [setNodes, apiKeys]);

  // Trigger generation for a comment (with debounce)
  const triggerGeneration = useCallback(
    (commentId: string) => {
      // Cancel any existing generation for this comment
      cancelGeneration(commentId);

      // Check if comment is user-edited
      const comment = nodesRef.current.find((n) => n.id === commentId);
      if (comment?.data?.userEdited) return;

      const state: GenerationState = {
        abortController: null,
        debounceTimer: setTimeout(() => {
          generateForComment(commentId);
        }, 500), // 500ms debounce
      };

      generationStates.current.set(commentId, state);
    },
    [cancelGeneration, generateForComment]
  );

  return { triggerGeneration, markUserEdited };
}
