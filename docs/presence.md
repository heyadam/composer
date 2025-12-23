# Plan: Migrate to Supabase Presence for Collaborator Tracking

## Summary
Replace manual broadcast-based presence tracking with Supabase Presence API. Use auth identity for names/avatars, merge multi-tab users by userId, and show self as "you".

## Current State
- **All realtime uses Broadcast**: `user_joined`, `user_left`, `cursor_moved`, node/edge sync
- **Session-based identity**: Random session IDs (`user_xxx`), no real names
- **Manual cleanup**: 30-second interval removes stale collaborators
- **Self excluded**: Current user not shown in collaborator list
- **Anonymous Supabase client**: Creates new client instead of using auth-aware one

## Target State
- **Presence for identity**: Use `channel.track()` with auth userId as key
- **Auth identity**: Real names via `useCurrentUserName`, avatars via `useCurrentUserImage`
- **Merged by user**: One presence entry per user (not per tab)
- **Self included**: Show self in collaborator list with `isSelf: true`
- **Broadcast for cursors**: Keep `cursor_moved` in Broadcast (low latency)
- **Auth-aware client**: Use `createClient` from `lib/supabase/client`

## Files to Modify

### Primary
- `lib/hooks/useCollaboration.ts` - Main collaboration logic

### Secondary
- `components/Flow/CollaboratorCursors.tsx` - Update to show "you" for self, add avatar support

## Implementation Steps

### Step 1: Add Identity Hooks ✅ DONE
Import and use auth identity at the top of useCollaboration:
```typescript
import { useCurrentUserName } from '@/hooks/use-current-user-name'
import { useCurrentUserImage } from '@/hooks/use-current-user-image'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client' // Auth-aware client

// Inside hook:
const { user } = useAuth()
const currentUserName = useCurrentUserName()
const currentUserImage = useCurrentUserImage()
const currentUserId = user?.id ?? sessionIdRef.current // Fallback for anonymous
```

### Step 2: Update Collaborator Interface ✅ DONE
Add avatar, isSelf flag, remove lastSeen:
```typescript
export interface Collaborator {
  userId: string
  name?: string
  avatar?: string | null
  cursor?: { x: number; y: number }
  isOwner?: boolean
  isSelf?: boolean
  // lastSeen removed - Presence handles disconnection
}
```

### Step 3: Update Channel Configuration ✅ DONE
Use auth userId as presence key:
```typescript
const supabase = createClient() // Auth-aware client

const channel = supabase.channel(channelName, {
  config: {
    broadcast: { self: false },
    presence: { key: currentUserId }, // Auth user ID or session fallback
  },
})
```

### Step 4: Add Presence Event Listener ✅ DONE
Only use `sync` event (simplest, handles join/leave implicitly):
```typescript
channel
  .on('presence', { event: 'sync' }, () => {
    const presenceState = channel.presenceState<{
      userId: string
      name: string
      avatar: string | null
      isOwner: boolean
    }>()
    syncCollaboratorsFromPresence(presenceState)
  })
  .on('broadcast', { event: '*' }, handleBroadcast) // existing
  .subscribe(...)
```

### Step 5: Track Presence on Subscribe ✅ DONE
Replace broadcast join with track():
```typescript
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    setIsRealtimeConnected(true)
    await channel.track({
      userId: currentUserId,
      name: currentUserName,
      avatar: currentUserImage,
      isOwner,
    })
  }
})
```

### Step 6: Sync Collaborators from Presence ✅ DONE
Include self with `isSelf` flag, preserve cursor positions:
```typescript
const syncCollaboratorsFromPresence = (
  presenceState: Record<string, Array<{ userId: string; name: string; avatar: string | null; isOwner: boolean }>>
) => {
  setCollaborators((current) => {
    // Preserve existing cursor positions
    const cursorMap = new Map(current.map((c) => [c.userId, c.cursor]))

    const collaborators: Collaborator[] = []
    for (const [key, presences] of Object.entries(presenceState)) {
      if (presences.length === 0) continue
      const presence = presences[0] // First presence entry for this key
      collaborators.push({
        userId: presence.userId,
        name: presence.name,
        avatar: presence.avatar,
        isOwner: presence.isOwner,
        isSelf: key === currentUserId, // Mark self
        cursor: cursorMap.get(presence.userId),
      })
    }
    return collaborators
  })
}
```

### Step 7: Update Cursor Handler ✅ DONE
Cursor broadcast continues using userId for matching:
```typescript
const handleRemoteCursor = (userId: string, position: { x: number; y: number }) => {
  setCollaborators((current) => {
    const idx = current.findIndex((c) => c.userId === userId)
    if (idx === -1) return current // Not in presence yet
    const updated = [...current]
    updated[idx] = { ...updated[idx], cursor: position }
    return updated
  })
}
```

### Step 8: Update Cursor Broadcast to Use Auth ID ✅ DONE
Ensure cursor_moved uses same ID as presence:
```typescript
const broadcastCursor = useCallback((position: { x: number; y: number }) => {
  channelRef.current?.send({
    type: 'broadcast',
    event: 'sync',
    payload: { type: 'cursor_moved', userId: currentUserId, position },
  })
}, [currentUserId])
```

### Step 9: Cleanup ✅ DONE
Replace broadcast leave with untrack, guard for SUBSCRIBED:
```typescript
return () => {
  if (channelRef.current) {
    // Only untrack if channel was subscribed
    channelRef.current.untrack().catch(() => {}) // Ignore errors on cleanup
    channelRef.current.unsubscribe()
  }
}
```

### Step 10: Remove Dead Code ✅ DONE
- Delete `handleUserJoined` and `handleUserLeft` functions
- Delete `user_joined`/`user_left` cases from broadcast switch
- Delete 30-second cleanup interval effect
- Delete `generateSessionId` function (or keep as fallback for anonymous)
- Remove `lastSeen` from all collaborator handling

### Step 11: Update CollaboratorCursors Component ✅ DONE
Show "you" for self, display avatar:
```typescript
// In CollaboratorCursors.tsx
{collaborator.isSelf ? 'you' : collaborator.name || 'Anonymous'}

// Add avatar display if desired
{collaborator.avatar && <img src={collaborator.avatar} className="rounded-full w-4 h-4" />}
```

## Edge Cases

### Anonymous Users
If `user?.id` is undefined (not logged in), fall back to session ID:
```typescript
const currentUserId = user?.id ?? sessionIdRef.current
```

### Multi-Tab Same User
Since presence key is auth userId, multiple tabs merge into one presence entry. Cursor updates will overwrite each other (last one wins). This is intentional per user's choice.

### Self Cursor Display
Self's cursor comes from Broadcast like others. Filter or style differently in CollaboratorCursors using `isSelf` flag.

## Testing Checklist
- [ ] Join: New collaborator appears with name and avatar
- [ ] Leave: Collaborator disappears on tab close
- [ ] Self: Current user shows as "you" in collaborator list
- [ ] Cursor: Remote cursors move smoothly, self cursor shows
- [ ] Owner indicator: Crown shows correctly on owner
- [ ] Multi-tab: Same user in multiple tabs = one cursor (latest wins)
- [ ] Anonymous: Users not logged in still work (session ID fallback)

## Benefits
1. **Real identity**: Names and avatars from auth
2. **Simpler code**: No manual cleanup, Presence handles disconnects
3. **Cleaner separation**: Presence = who's here, Broadcast = cursor positions
4. **Self visibility**: Users see themselves in the room

## Risks & Mitigations
- **Risk**: Anonymous users can't use auth identity
  - **Mitigation**: Fall back to session ID, show "Anonymous"
- **Risk**: Multi-tab cursor collision (last wins)
  - **Mitigation**: Intentional per user choice, could add tab indicator later
- **Risk**: Auth state changes mid-session
  - **Mitigation**: Re-track on identity change via useEffect deps
