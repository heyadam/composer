import type { ApiKeys } from "./types";

const STORAGE_KEY = "avy-api-keys";
const VIP_CODE_KEY = "avy-vip-code";

export function loadApiKeys(): ApiKeys {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveApiKeys(keys: ApiKeys): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function clearApiKeys(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function loadVipCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(VIP_CODE_KEY);
  } catch {
    return null;
  }
}

export function saveVipCode(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIP_CODE_KEY, code);
}

export function clearVipCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VIP_CODE_KEY);
}
