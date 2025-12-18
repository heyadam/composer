export type ProviderId = "openai" | "google" | "anthropic";

export interface ApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
}

export interface ApiKeyStatus {
  provider: ProviderId;
  label: string;
  hasKey: boolean;
}

export interface ApiKeysContextValue {
  keys: ApiKeys;
  setKey: (provider: ProviderId, key: string) => void;
  removeKey: (provider: ProviderId) => void;
  clearAllKeys: () => void;
  getKeyStatuses: () => ApiKeyStatus[];
  hasRequiredKey: (provider: ProviderId) => boolean;
  isDevMode: boolean;
  unlockWithPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  isUnlocking: boolean;
}
