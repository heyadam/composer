"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { createFlowSnapshot } from "@/lib/autopilot/snapshot";
import { useApiKeys } from "@/lib/api-keys";

export interface Suggestion {
  icon: string;
  text: string;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { icon: "Image", text: "Generate portraits in 3 art styles" },
  { icon: "Sparkles", text: "Write a poem and illustrate it" },
  { icon: "Languages", text: "Translate a story to 5 languages" },
  { icon: "Bot", text: "Compare haikus from different AIs" },
];

interface UseSuggestionsOptions {
  nodes: Node[];
  edges: Edge[];
}

interface UseSuggestionsResult {
  suggestions: Suggestion[];
  isLoading: boolean;
  refresh: () => void;
}

export function useSuggestions({ nodes, edges }: UseSuggestionsOptions): UseSuggestionsResult {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(DEFAULT_SUGGESTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const { keys: apiKeys } = useApiKeys();
  const hasFetched = useRef(false);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);

    try {
      const flowSnapshot = createFlowSnapshot(nodes, edges);

      const response = await fetch("/api/autopilot/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowSnapshot,
          apiKeys,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      if (
        Array.isArray(data.suggestions) &&
        data.suggestions.length === 4 &&
        data.suggestions.every(
          (s: unknown) =>
            typeof s === "object" &&
            s !== null &&
            typeof (s as Suggestion).icon === "string" &&
            typeof (s as Suggestion).text === "string"
        )
      ) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      // Keep current suggestions on error
    } finally {
      setIsLoading(false);
    }
  }, [nodes, edges, apiKeys]);

  // Fetch on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchSuggestions();
    }
  }, [fetchSuggestions]);

  const refresh = useCallback(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return {
    suggestions,
    isLoading,
    refresh,
  };
}
