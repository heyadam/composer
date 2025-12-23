"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  ApiKeys,
  ApiKeysContextValue,
  ProviderId,
  ApiKeyStatus,
} from "./types";
import { loadApiKeys, saveApiKeys, clearApiKeys, saveVipCode, loadVipCode } from "./storage";
import { storeUserKeys } from "@/lib/flows/api";
import { useAuth } from "@/lib/auth";

async function fetchEnvKeys(password: string): Promise<{ keys?: ApiKeys; error?: string }> {
  try {
    const response = await fetch("/api/auth-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Invalid password" };
    }

    return { keys: data.keys };
  } catch {
    return { error: "Failed to verify password" };
  }
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI",
  google: "Google Gemini",
  anthropic: "Anthropic",
};

const ApiKeysContext = createContext<ApiKeysContextValue | null>(null);

export function ApiKeysProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeys>({});
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDevMode] = useState(
    () => process.env.NEXT_PUBLIC_DEV_MODE === "true"
  );

  // Load keys from localStorage on mount
  useEffect(() => {
    setKeys(loadApiKeys());
    setIsLoaded(true);

    // Check for ?code= URL param and save to localStorage
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        saveVipCode(code);
        // Clean up URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, []);

  // Save keys to localStorage when they change
  useEffect(() => {
    saveApiKeys(keys);
  }, [keys]);

  // Sync keys to server when user is logged in (for owner-funded execution)
  // This runs whenever keys change, which is fine since storeUserKeys is idempotent
  useEffect(() => {
    const hasAnyKey = !!(keys.openai || keys.google || keys.anthropic);
    if (user && hasAnyKey) {
      storeUserKeys({
        openai: keys.openai || undefined,
        google: keys.google || undefined,
        anthropic: keys.anthropic || undefined,
      }).catch(() => {
        // Ignore errors - server storage is optional
      });
    }
  }, [user, keys]);

  const setKey = useCallback((provider: ProviderId, key: string) => {
    setKeys((prev) => ({ ...prev, [provider]: key }));
  }, []);

  const removeKey = useCallback((provider: ProviderId) => {
    setKeys((prev) => {
      const next = { ...prev };
      delete next[provider];
      return next;
    });
  }, []);

  const clearAllKeys = useCallback(() => {
    setKeys({});
    clearApiKeys();
  }, []);

  const getKeyStatuses = useCallback((): ApiKeyStatus[] => {
    return (Object.keys(PROVIDER_LABELS) as ProviderId[]).map((provider) => ({
      provider,
      label: PROVIDER_LABELS[provider],
      hasKey: !!keys[provider] || isDevMode,
    }));
  }, [keys, isDevMode]);

  const hasRequiredKey = useCallback(
    (provider: ProviderId): boolean => {
      return isDevMode || !!keys[provider];
    },
    [keys, isDevMode]
  );

  const unlockWithPassword = useCallback(
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      setIsUnlocking(true);
      try {
        const result = await fetchEnvKeys(password);
        if (result.error) {
          return { success: false, error: result.error };
        }
        if (result.keys) {
          // Set all keys from env
          setKeys((prev) => ({ ...prev, ...result.keys }));
          // Save VIP code for future use
          saveVipCode(password);
          // Server-side sync is handled by the useEffect that watches for keys + user
          return { success: true };
        }
        return { success: false, error: "No keys returned" };
      } finally {
        setIsUnlocking(false);
      }
    },
    []
  );

  return (
    <ApiKeysContext.Provider
      value={{
        keys,
        setKey,
        removeKey,
        clearAllKeys,
        getKeyStatuses,
        hasRequiredKey,
        isDevMode,
        unlockWithPassword,
        isUnlocking,
        isLoaded,
      }}
    >
      {children}
    </ApiKeysContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeysContext);
  if (!context) {
    throw new Error("useApiKeys must be used within an ApiKeysProvider");
  }
  return context;
}
