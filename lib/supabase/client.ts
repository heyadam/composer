import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

// Cookie-based storage adapter for browser client
const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null

    // The key is typically like "sb-{ref}-auth-token"
    // Cookies might be chunked as .0, .1, etc.
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=')
      acc[name] = valueParts.join('=')
      return acc
    }, {} as Record<string, string>)

    // Check for chunked cookies (e.g., sb-xxx-auth-token.0, sb-xxx-auth-token.1)
    const chunks: string[] = []
    let i = 0
    while (cookies[`${key}.${i}`]) {
      chunks.push(cookies[`${key}.${i}`])
      i++
    }

    if (chunks.length > 0) {
      // Reassemble chunked cookie and decode base64
      const combined = chunks.join('')
      if (combined.startsWith('base64-')) {
        try {
          return atob(combined.slice(7))
        } catch {
          return combined.slice(7)
        }
      }
      return combined
    }

    // Check for non-chunked cookie
    if (cookies[key]) {
      const value = cookies[key]
      if (value.startsWith('base64-')) {
        try {
          return atob(value.slice(7))
        } catch {
          return value.slice(7)
        }
      }
      return value
    }

    return null
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return
    // For setting, we'll use standard cookie (let Supabase handle chunking on server)
    document.cookie = `${key}=${value}; path=/; max-age=31536000; SameSite=Lax`
  },
  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    // Also remove chunked cookies
    let i = 0
    while (true) {
      const chunkKey = `${key}.${i}`
      if (!document.cookie.includes(chunkKey)) break
      document.cookie = `${chunkKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      i++
    }
  },
}

// Singleton instance for browser client
let browserClient: SupabaseClient | null = null

export function createClient() {
  if (browserClient) {
    return browserClient
  }

  browserClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      auth: {
        storage: cookieStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }
  )

  return browserClient
}
