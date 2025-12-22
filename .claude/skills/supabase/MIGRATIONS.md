# Migrations

Use `mcp__supabase__apply_migration` for all DDL operations.

## File Naming Convention

Format: `YYYYMMDDHHmmss_short_description.sql`

- `YYYY` - Four digit year (e.g., `2024`)
- `MM` - Two digit month (01-12)
- `DD` - Two digit day (01-31)
- `HH` - Two digit hour in 24-hour format (00-23)
- `mm` - Two digit minute (00-59)
- `ss` - Two digit second (00-59)

Example: `20240906123045_create_profiles.sql`

## Migration Requirements

1. **Header comment** - Include purpose, affected tables, special considerations
2. **Lowercase SQL** - All SQL keywords in lowercase
3. **Copious comments** - Especially for destructive operations (truncate, drop, alter)
4. **Enable RLS** - Always enable Row Level Security on new tables
5. **Granular policies** - One policy per operation (select, insert, update, delete) and per role (anon, authenticated)

## Example Migration

```sql
-- Migration: Create profiles table
-- Purpose: Store user profile information
-- Affected tables: profiles (new)

-- Create the profiles table
create table public.profiles (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade not null,
  username text unique,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.profiles is 'User profile information linked to auth.users';

-- Enable RLS (required for all tables)
alter table public.profiles enable row level security;

-- SELECT policy for authenticated users
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ( (select auth.uid()) = user_id );

-- SELECT policy for public profiles (anon)
create policy "Public profiles are viewable by anyone"
on public.profiles
for select
to anon
using ( true );

-- INSERT policy
create policy "Users can create own profile"
on public.profiles
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- UPDATE policy
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- DELETE policy
create policy "Users can delete own profile"
on public.profiles
for delete
to authenticated
using ( (select auth.uid()) = user_id );

-- Create index for RLS performance
create index idx_profiles_user_id on public.profiles(user_id);

-- Add trigger for updated_at
create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at();
```
