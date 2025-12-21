# Supabase Client Issues & Workarounds

This document describes critical issues encountered with the Supabase client in this Next.js 16 application and the workarounds implemented.

## Issue: Supabase Client Methods Hang Indefinitely

### Affected Methods
The following Supabase client methods hang indefinitely (never resolve or reject):
- `supabase.auth.getSession()`
- `supabase.auth.getUser()`
- `supabase.auth.signOut()`
- `supabase.from('table').select()` (and other database queries)

### Environment
- Next.js 16 (App Router)
- `@supabase/supabase-js` with custom cookie storage
- Previously tried `@supabase/ssr` with `createBrowserClient` (same issue)

### Symptoms
- Auth initialization would timeout after 10 seconds
- Profile pictures wouldn't load (profile fetch hung)
- Sign out button did nothing (awaited signOut never completed)
- Console showed "getSession promise created, awaiting..." but never resolved

## Workarounds Implemented

### 1. Direct Cookie Parsing for Session

Instead of calling `supabase.auth.getSession()`, we parse the session directly from browser cookies.

**Location:** `lib/auth/context.tsx`

```typescript
function parseSessionFromCookies(): Session | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [name, ...valueParts] = cookie.trim().split('=')
    acc[name] = valueParts.join('=')
    return acc
  }, {} as Record<string, string>)

  // Handle chunked cookies (sb-xxx-auth-token.0, sb-xxx-auth-token.1, etc.)
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
      let combined = chunks.join('')
      // Handle base64 encoding
      if (combined.startsWith('base64-')) {
        combined = atob(combined.slice(7))
      }
      return JSON.parse(combined) as Session
    }
  }

  // Handle non-chunked cookie
  const authCookieKey = Object.keys(cookies).find(key =>
    key.startsWith('sb-') && key.endsWith('-auth-token')
  )

  if (authCookieKey) {
    let value = cookies[authCookieKey]
    if (value.startsWith('base64-')) {
      value = atob(value.slice(7))
    }
    return JSON.parse(value) as Session
  }

  return null
}
```

### 2. User Metadata for Profile Data

Instead of fetching profile from the `profiles` table (which hangs), we use `user_metadata` from the session.

```typescript
const metadataProfile: Profile = {
  id: authUser.id,
  email: authUser.email || "",
  full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
  avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
  created_at: authUser.created_at || new Date().toISOString(),
  updated_at: authUser.updated_at || new Date().toISOString(),
}
```

### 3. Manual Cookie Clearing for Sign Out

Instead of awaiting `supabase.auth.signOut()`, we clear cookies manually and fire-and-forget the Supabase call.

```typescript
function clearAuthCookies() {
  if (typeof document === 'undefined') return

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name] = cookie.trim().split('=')
    if (name.startsWith('sb-')) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`
    }
  }
}

const signOut = useCallback(async () => {
  // Clear state immediately
  setUser(null)
  setProfile(null)
  setSession(null)

  // Clear cookies manually
  clearAuthCookies()

  // Fire and forget - don't await
  supabase.auth.signOut().catch((error) => {
    console.error("[Auth] Sign out error (non-blocking):", error)
  })

  // Force page reload
  window.location.reload()
}, [supabase])
```

## What Still Works

- `supabase.auth.signInWithOAuth()` - OAuth redirect works fine
- `supabase.auth.onAuthStateChange()` - Listener works for auth events
- Cookie-based session storage - Sessions persist correctly in cookies

## Potential Root Causes

1. **SSR/Client hydration mismatch** - The Supabase client may be created during SSR and not properly rehydrated on the client
2. **Cookie storage adapter issues** - Custom cookie storage may have compatibility issues with Supabase internals
3. **Next.js 16 compatibility** - Possible incompatibility with the latest Next.js App Router
4. **PKCE flow issues** - The `flowType: 'pkce'` setting may cause issues with session retrieval

## Recommendations

1. **Monitor Supabase releases** - Check for updates to `@supabase/supabase-js` and `@supabase/ssr` that may fix these issues
2. **Consider server-side auth** - Use server components/actions for auth operations where possible
3. **Keep workarounds isolated** - All workarounds are in `lib/auth/context.tsx` for easy removal when fixed

## Files Modified

- `lib/auth/context.tsx` - Main auth context with all workarounds
- `lib/supabase/client.ts` - Custom cookie storage adapter
- `hooks/use-current-user-image.ts` - Uses AuthContext instead of direct Supabase calls
- `hooks/use-current-user-name.ts` - Uses AuthContext instead of direct Supabase calls
