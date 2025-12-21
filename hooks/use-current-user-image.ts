"use client"

import { useAuth } from "@/lib/auth"

export const useCurrentUserImage = (): string | null => {
  const { user, profile } = useAuth()

  // Prefer profile avatar_url (from profiles table), fall back to user metadata
  return profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
}
