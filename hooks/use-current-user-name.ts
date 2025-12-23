"use client"

import { useAuth } from "@/lib/auth"

export const useCurrentUserName = (): string => {
  const { user, profile } = useAuth()

  // Prefer profile full_name (from profiles table), fall back to user metadata
  return (
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Guest"
  )
}
