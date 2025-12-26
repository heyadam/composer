"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { BackgroundVariant } from "@xyflow/react";

export type GradientType = "solid" | "linear" | "radial" | "conic";
export type ShimmerGradientType = "radial" | "linear" | "pulse";

export interface BackgroundSettings {
  variant: BackgroundVariant;
  color: string; // dot/line color
  bgColor: string; // canvas background color (used when gradient is "solid")
  gap: number;
  size: number;
  // Gradient settings
  gradientType: GradientType;
  gradientColorStart: string;
  gradientColorEnd: string;
  gradientAngle: number; // degrees, for linear/conic
  // Shimmer settings (execution indicator)
  shimmerColor: string;
  shimmerDuration: number; // seconds
  shimmerGradientType: ShimmerGradientType;
}

const STORAGE_KEY = "avy-background-settings";

const DEFAULT_SETTINGS: BackgroundSettings = {
  variant: BackgroundVariant.Dots,
  color: "#43434c",
  bgColor: "#000000",
  gap: 20,
  size: 2,
  gradientType: "solid",
  gradientColorStart: "#1a1a2e",
  gradientColorEnd: "#0f0f23",
  gradientAngle: 135,
  // Shimmer defaults
  shimmerColor: "#8b5cf6", // purple-500
  shimmerDuration: 2,
  shimmerGradientType: "radial",
};

/**
 * Generates the CSS background value for the execution shimmer
 */
export function getShimmerStyle(settings: BackgroundSettings): string {
  const { shimmerColor, shimmerGradientType } = settings;

  // Parse hex color and create rgba versions with different opacities
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  switch (shimmerGradientType) {
    case "linear":
      return `linear-gradient(
        -45deg,
        transparent 0%,
        transparent 40%,
        ${hexToRgba(shimmerColor, 0.06)} 45%,
        ${hexToRgba(shimmerColor, 0.1)} 50%,
        ${hexToRgba(shimmerColor, 0.06)} 55%,
        transparent 60%,
        transparent 100%
      )`;
    case "pulse":
      return hexToRgba(shimmerColor, 0.08);
    case "radial":
    default:
      return `radial-gradient(
        ellipse at 50% 50%,
        ${hexToRgba(shimmerColor, 0.06)} 0%,
        ${hexToRgba(shimmerColor, 0.03)} 50%,
        transparent 70%
      )`;
  }
}

/**
 * Generates the CSS background value based on gradient settings
 */
export function getBackgroundStyle(settings: BackgroundSettings): string {
  const { gradientType, bgColor, gradientColorStart, gradientColorEnd, gradientAngle } = settings;

  switch (gradientType) {
    case "linear":
      return `linear-gradient(${gradientAngle}deg, ${gradientColorStart} 0%, ${gradientColorEnd} 100%)`;
    case "radial":
      return `radial-gradient(circle at 50% 50%, ${gradientColorStart} 0%, ${gradientColorEnd} 100%)`;
    case "conic":
      return `conic-gradient(from ${gradientAngle}deg at 50% 50%, ${gradientColorStart}, ${gradientColorEnd}, ${gradientColorStart})`;
    case "solid":
    default:
      return bgColor;
  }
}

interface BackgroundSettingsContextValue {
  settings: BackgroundSettings;
  updateSettings: (updates: Partial<BackgroundSettings>) => void;
  resetSettings: () => void;
  isLoaded: boolean;
}

const BackgroundSettingsContext =
  createContext<BackgroundSettingsContextValue | null>(null);

export function BackgroundSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
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

  const value: BackgroundSettingsContextValue = {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  };

  return (
    <BackgroundSettingsContext.Provider value={value}>
      {children}
    </BackgroundSettingsContext.Provider>
  );
}

export function useBackgroundSettings() {
  const context = useContext(BackgroundSettingsContext);
  if (!context) {
    throw new Error(
      "useBackgroundSettings must be used within a BackgroundSettingsProvider"
    );
  }
  return context;
}
