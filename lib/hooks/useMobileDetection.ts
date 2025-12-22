"use client";

import { useState, useEffect } from "react";

const MOBILE_USER_AGENT_REGEX =
  /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i;

/**
 * Detects if the user is on a mobile device based on user agent.
 * This does NOT trigger for desktop users with narrow browser windows.
 * SSR-safe: returns null until checked, then true/false after hydration.
 */
export function useMobileDetection(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    setIsMobile(MOBILE_USER_AGENT_REGEX.test(navigator.userAgent));
  }, []);

  return isMobile;
}
