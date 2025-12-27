/**
 * Fetch utilities with timeout and abort signal support
 */

// Default timeout for API requests (60 seconds)
export const DEFAULT_TIMEOUT_MS = 60000;

// Extended timeout for image generation (2 minutes)
export const IMAGE_GENERATION_TIMEOUT_MS = 120000;

/**
 * Fetch with timeout and abort signal support.
 * Combines user-provided signal with a timeout signal.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { signal?: AbortSignal },
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  // Combine signals: user signal + timeout signal
  const signals = [timeoutController.signal];
  if (options.signal) {
    signals.push(options.signal);
  }
  const combinedSignal = AbortSignal.any(signals);

  try {
    return await fetch(url, { ...options, signal: combinedSignal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Determine if it was a timeout or user cancellation
      if (timeoutController.signal.aborted) {
        throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
      }
      throw new Error("Request cancelled");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
