# Realtime

## Do
- Use `broadcast` for all realtime events
- Use `presence` sparingly for user state tracking
- Create indexes for RLS policy columns
- Topic naming: `scope:entity:id` (e.g., `room:123:messages`)
- Event naming: `entity_action` (e.g., `message_created`)
- Set `private: true` for channels using RLS
- Include cleanup/unsubscribe logic

## Don't
- Use `postgres_changes` (single-threaded, doesn't scale)
- Create subscriptions without cleanup
- Use generic event names like "update" or "change"
- Subscribe in render functions without state management

## Function Selection

| Use Case | Function |
|----------|----------|
| Custom payloads | `broadcast` |
| Database changes | `broadcast` via triggers |
| High-frequency updates | `broadcast` with minimal payload |
| User presence/status | `presence` (sparingly) |
| Client-to-client | `broadcast` without triggers |

## Client Setup

```javascript
const supabase = createClient('URL', 'ANON_KEY')

const channel = supabase.channel('room:123:messages', {
  config: {
    broadcast: { self: true, ack: true },
    presence: { key: 'user-session-id', enabled: true },
    private: true  // Required for RLS
  }
})
```

## React Pattern

```javascript
const channelRef = useRef(null)

useEffect(() => {
  if (channelRef.current?.state === 'subscribed') return

  const channel = supabase.channel('room:123:messages', {
    config: { private: true }
  })
  channelRef.current = channel

  // Set auth before subscribing
  await supabase.realtime.setAuth()

  channel
    .on('broadcast', { event: 'message_created' }, handleMessage)
    .on('broadcast', { event: 'user_joined' }, handleUserJoined)
    .subscribe()

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }
}, [roomId])
```

## Database Trigger (broadcast_changes)

```sql
create or replace function public.broadcast_room_messages()
returns trigger
security definer
language plpgsql
as $$
begin
  perform realtime.broadcast_changes(
    'room:' || coalesce(new.room_id, old.room_id)::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return coalesce(new, old);
end;
$$;

create trigger room_messages_broadcast
after insert or update or delete on public.messages
for each row execute function public.broadcast_room_messages();
```

## Custom Events (realtime.send)

```sql
create or replace function public.notify_status_change()
returns trigger
security definer
language plpgsql
as $$
begin
  perform realtime.send(
    'room:' || new.room_id::text,
    'status_changed',
    jsonb_build_object('id', new.id, 'status', new.status),
    false  -- public channel (set true for private)
  );
  return new;
end;
$$;
```

## Conditional Broadcasting

```sql
-- Only broadcast significant changes
if tg_op = 'UPDATE' and old.status is distinct from new.status then
  perform realtime.broadcast_changes(
    'room:' || new.room_id::text,
    tg_op, tg_op, tg_table_name, tg_table_schema, new, old
  );
end if;
```

## RLS for Realtime

```sql
-- Read policy for private channels
create policy "room_members_can_read"
on realtime.messages
for select
to authenticated
using (
  topic like 'room:%' and
  exists (
    select 1 from public.room_members
    where user_id = (select auth.uid())
    and room_id = split_part(topic, ':', 2)::uuid
  )
);

-- Write policy for private channels
create policy "room_members_can_write"
on realtime.messages
for insert
to authenticated
with check (
  topic like 'room:%' and
  exists (
    select 1 from public.room_members
    where user_id = (select auth.uid())
    and room_id = split_part(topic, ':', 2)::uuid
  )
);

-- Index for performance
create index idx_room_members_user_room
on public.room_members(user_id, room_id);
```

## Error Handling

```javascript
const supabase = createClient('URL', 'ANON_KEY', {
  realtime: {
    params: {
      log_level: 'info',
      reconnectAfterMs: 1000
    }
  }
})

channel.subscribe((status, err) => {
  switch (status) {
    case 'SUBSCRIBED':
      console.log('Connected')
      break
    case 'CHANNEL_ERROR':
      console.error('Error:', err)
      // Client auto-retries
      break
    case 'CLOSED':
      console.log('Closed')
      break
  }
})
```

## Migration from postgres_changes

```javascript
// Old (don't use)
const oldChannel = supabase.channel('changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, callback)

// New (use this)
const newChannel = supabase.channel(`messages:${room_id}:changes`, {
  config: { private: true }
})
  .on('broadcast', { event: 'INSERT' }, callback)
  .on('broadcast', { event: 'UPDATE' }, callback)
  .on('broadcast', { event: 'DELETE' }, callback)
```

Then add the database trigger to broadcast changes.
