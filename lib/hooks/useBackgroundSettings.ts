"use client";

import { useState, useEffect, useCallback } from "react";
import { BackgroundVariant } from "@xyflow/react";

export interface BackgroundSettings {
  variant: BackgroundVariant;
  color: string; // dot/line color
  bgColor: string; // canvas background color
  gap: number;
  size: number;
}

const STORAGE_KEY = "avy-background-settings";

const DEFAULT_SETTINGS: BackgroundSettings = {
  variant: BackgroundVariant.Dots,
  color: "#383838",
  bgColor: "#000000",
  gap: 20,
  size: 1,
};

export function useBackgroundSettings() {
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.error("Failed to load background settings:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when settings change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.error("Failed to save background settings:", e);
      }
    }
  }, [settings, isLoaded]);

  const updateSettings = useCallback((updates: Partial<BackgroundSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  };
}
