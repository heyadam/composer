"use client";

import { useState, useEffect, useCallback } from "react";

export interface UpdateEntry {
  id: string;
  title: string;
  date: string;
  content?: string;
}

const STORAGE_KEY = "composer-last-seen-update";

export function useUpdates() {
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);

  // Load last seen update from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      setLastSeenId(stored);
    }
  }, []);

  // Fetch the manifest on mount
  useEffect(() => {
    async function fetchManifest() {
      try {
        const res = await fetch("/updates/manifest.json");
        if (!res.ok) {
          setUpdates([]);
          return;
        }
        const manifest: UpdateEntry[] = await res.json();
        // Sort by date descending (newest first)
        manifest.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setUpdates(manifest);
      } catch {
        setUpdates([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchManifest();
  }, []);

  // Check if there are unseen updates
  const hasUnseenUpdates = updates.length > 0 && (!lastSeenId || updates[0].id !== lastSeenId);

  // Count of unseen updates
  const unseenCount = lastSeenId
    ? updates.findIndex((u) => u.id === lastSeenId)
    : updates.length;

  // Mark updates as seen (call when modal opens)
  const markAsSeen = useCallback(() => {
    if (updates.length > 0) {
      const latestId = updates[0].id;
      localStorage.setItem(STORAGE_KEY, latestId);
      setLastSeenId(latestId);
    }
  }, [updates]);

  // Fetch content for a specific update
  const fetchUpdateContent = useCallback(async (id: string): Promise<string> => {
    try {
      const res = await fetch(`/updates/${id}.md`);
      if (!res.ok) return "";
      return await res.text();
    } catch {
      return "";
    }
  }, []);

  return {
    updates,
    isLoading,
    hasUnseenUpdates,
    unseenCount: unseenCount === -1 ? 0 : unseenCount,
    markAsSeen,
    fetchUpdateContent,
  };
}
