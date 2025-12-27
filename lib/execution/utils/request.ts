/**
 * Request building utilities for API calls
 */

import type { ApiKeys } from "@/lib/api-keys";
import type { ExecuteOptions } from "../types";

/**
 * Builds an API request body, handling owner-funded execution vs direct API key usage.
 *
 * When shareToken is present (owner-funded), we include shareToken + runId and omit apiKeys.
 * Otherwise, we include apiKeys directly.
 */
export function buildApiRequestBody<T extends Record<string, unknown>>(
  fields: T,
  apiKeys?: ApiKeys,
  options?: ExecuteOptions
): T & { apiKeys?: ApiKeys; shareToken?: string; runId?: string } {
  if (options?.shareToken) {
    return {
      ...fields,
      shareToken: options.shareToken,
      runId: options.runId,
    };
  }
  return {
    ...fields,
    apiKeys,
  };
}

/**
 * Redacts sensitive fields from a request body for debug output.
 */
export function redactRequestBody(
  requestBody: Record<string, unknown>
): Record<string, unknown> {
  const redacted = { ...requestBody };

  if ("apiKeys" in redacted) {
    redacted.apiKeys = "[REDACTED]";
  }
  if ("shareToken" in redacted) {
    redacted.shareToken = "[REDACTED]";
  }
  if ("imageInput" in redacted && redacted.imageInput) {
    redacted.imageInput = "[BASE64_IMAGE]";
  }
  if ("audioBuffer" in redacted && redacted.audioBuffer) {
    redacted.audioBuffer = "[BASE64_AUDIO]";
  }

  return redacted;
}
