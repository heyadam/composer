"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import type { User, Session, RealtimeChannel } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { AuthContextValue, Profile } from "./types"

const AuthContext = createContext<AuthContextValue | null>(null)

// Clear all Supabase auth cookies
function clearAuthCookies() {
  if (typeof document === 'undefined') return

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name] = cookie.trim().split('=')
    // Clear any Supabase-related cookies (sb-* pattern)
    if (name.startsWith('sb-')) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`
    }
  }
}

// Parse session directly from cookies (bypasses hanging getSession)
function parseSessionFromCookies(): Session | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [name, ...valueParts] = cookie.trim().split('=')
    acc[name] = valueParts.join('=')
    return acc
  }, {} as Record<string, string>)

  // Find the auth token cookie (pattern: sb-{ref}-auth-token)
  const authCookieKey = Object.keys(cookies).find(key =>
    key.startsWith('sb-') && key.endsWith('-auth-token')
  )

  if (!authCookieKey) {
    // Check for chunked cookies
    const chunkedKey = Object.keys(cookies).find(key =>
      key.startsWith('sb-') && key.includes('-auth-token.0')
    )
    if (chunkedKey) {
      const baseKey = chunkedKey.replace('.0', '')
      const chunks: string[] = []
      let i = 0
      while (cookies[`${baseKey}.${i}`]) {
        chunks.push(cookies[`${baseKey}.${i}`])
        i++
      }
      if (chunks.length > 0) {
        try {
          let combined = chunks.join('')
          if (combined.startsWith('base64-')) {
            combined = atob(combined.slice(7))
          }
          return JSON.parse(combined) as Session
        } catch (e) {
          console.error("[Auth] Failed to parse chunked session cookie:", e)
          return null
        }
      }
    }
    return null
  }

  try {
    let value = cookies[authCookieKey]
    if (value.startsWith('base64-')) {
      value = atob(value.slice(7))
    }
    return JSON.parse(value) as Session
  } catch (e) {
    console.error("[Auth] Failed to parse session cookie:", e)
    return null
  }
}

// Retry configuration
const MAX_RETRIES = 5
const INITIAL_DELAY_MS = 200

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const profileChannelRef = useRef<RealtimeChannel | null>(null)

  // Memoize the client to prevent recreating on every render
  const supabase = useMemo(() => createClient(), [])

  // Fetch profile with retry logic and exponential backoff
  const fetchProfileWithRetry = useCallback(async (
    userId: string,
    retryCount = 0
  ): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (data) {
      return data as Profile
    }

    // If profile doesn't exist and we have retries left, wait and try again
    // This handles the race condition where the trigger hasn't completed yet
    if ((error?.code === "PGRST116" || !data) && retryCount < MAX_RETRIES) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, retryCount)
      await new Promise(resolve => setTimeout(resolve, delay))
      return fetchProfileWithRetry(userId, retryCount + 1)
    }

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching profile:", error)
    }

    return null
  }, [supabase])

  // Ensure profile exists - creates one if the trigger didn't
  const ensureProfile = useCallback(async (authUser: User): Promise<Profile | null> => {
    // First try to fetch existing profile with retries
    let existingProfile = await fetchProfileWithRetry(authUser.id)

    if (existingProfile) {
      return existingProfile
    }

    // Profile doesn't exist after retries - create it manually
    // This is a fallback in case the database trigger fails
    const profileData = {
      id: authUser.id,
      email: authUser.email || "",
      full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
      avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
    }

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id" })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating profile:", insertError)
      return null
    }

    return newProfile as Profile
  }, [supabase, fetchProfileWithRetry])

  // Subscribe to realtime profile changes
  const subscribeToProfile = useCallback((userId: string) => {
    // Unsubscribe from previous channel if exists
    if (profileChannelRef.current) {
      supabase.removeChannel(profileChannelRef.current)
    }

    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            setProfile(payload.new as Profile)
          } else if (payload.eventType === "DELETE") {
            setProfile(null)
          }
        }
      )
      .subscribe()

    profileChannelRef.current = channel
  }, [supabase])

  // Public method to manually refresh profile
  const refreshProfile = useCallback(async () => {
    if (!user) return
    const freshProfile = await fetchProfileWithRetry(user.id)
    if (freshProfile) {
      setProfile(freshProfile)
    }
  }, [user, fetchProfileWithRetry])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      console.log("[Auth] Initializing auth state...")
      // Timeout after 10 seconds to prevent infinite loading (increased for retries)
      const timeoutId = setTimeout(() => {
        console.log("[Auth] Timeout reached, setting isLoading to false")
        setIsLoading(false)
      }, 10000)

      try {
        // Parse session directly from cookies (bypassing getSession which hangs)
        console.log("[Auth] Parsing session from cookies...")
        const sessionData = parseSessionFromCookies()
        console.log("[Auth] Parsed session:", {
          hasSession: !!sessionData,
          userId: sessionData?.user?.id,
          email: sessionData?.user?.email
        })
        clearTimeout(timeoutId)

        if (sessionData?.user) {
          const authUser = sessionData.user
          setUser(authUser)
          setSession(sessionData)

          // Create profile object from user metadata (avoid Supabase client which hangs)
          const metadataProfile: Profile = {
            id: authUser.id,
            email: authUser.email || "",
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
            avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
            created_at: authUser.created_at || new Date().toISOString(),
            updated_at: authUser.updated_at || new Date().toISOString(),
          }
          console.log("[Auth] Using profile from metadata:", {
            fullName: metadataProfile.full_name,
            avatarUrl: metadataProfile.avatar_url
          })
          setProfile(metadataProfile)
        } else {
          console.log("[Auth] No session found in cookies")
        }
      } catch (err) {
        clearTimeout(timeoutId)
        console.error("[Auth] Init error:", err)
      } finally {
        console.log("[Auth] Init complete, setting isLoading to false")
        setIsLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          // For SIGNED_IN events, ensure profile exists
          const userProfile = await ensureProfile(newSession.user)
          setProfile(userProfile)

          // Subscribe to realtime profile changes
          subscribeToProfile(newSession.user.id)
        } else {
          setProfile(null)
          // Cleanup realtime subscription
          if (profileChannelRef.current) {
            supabase.removeChannel(profileChannelRef.current)
            profileChannelRef.current = null
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      // Cleanup realtime subscription on unmount
      if (profileChannelRef.current) {
        supabase.removeChannel(profileChannelRef.current)
      }
    }
  }, [supabase, ensureProfile, subscribeToProfile])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }, [supabase])

  const signOut = useCallback(async () => {
    console.log("[Auth] Signing out...")

    // Clear state immediately
    setUser(null)
    setProfile(null)
    setSession(null)

    // Clear cookies manually (don't wait for Supabase client which may hang)
    clearAuthCookies()

    // Try Supabase signOut but don't await it (fire and forget)
    supabase.auth.signOut().catch((error) => {
      console.error("[Auth] Sign out error (non-blocking):", error)
    })

    // Force page reload to clear all auth state
    window.location.reload()
  }, [supabase])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
