# RLS Policies

## Core Rules

- Use `auth.uid()` instead of `current_user`
- **Wrap in select**: `(select auth.uid())` for performance
- Only use `CREATE POLICY` or `ALTER POLICY` queries
- Use double apostrophe in SQL strings: `'Night''s watch'`
- Don't use `FOR ALL` - create separate policies per operation
- Prefer `PERMISSIVE` over `RESTRICTIVE` policies
- Always specify role with `TO authenticated` or `TO anon`

## Policy Rules by Operation

| Operation | USING | WITH CHECK |
|-----------|-------|------------|
| SELECT | Yes | No |
| INSERT | No | Yes |
| UPDATE | Yes (usually) | Yes |
| DELETE | Yes | No |

## Syntax Order

```sql
create policy "Policy name"
on table_name
for select          -- operation comes first
to authenticated    -- role comes after operation
using ( ... );
```

## Basic Template

```sql
-- Enable RLS first
alter table public.profiles enable row level security;

-- SELECT: authenticated users view own data
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ( (select auth.uid()) = user_id );

-- INSERT: authenticated users create own data
create policy "Users can create own profile"
on public.profiles
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- UPDATE: authenticated users update own data
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- DELETE: authenticated users delete own data
create policy "Users can delete own profile"
on public.profiles
for delete
to authenticated
using ( (select auth.uid()) = user_id );
```

## Helper Functions

### auth.uid()
Returns the ID of the user making the request.

### auth.jwt()
Returns the JWT. Access metadata:
- `raw_user_meta_data` - User-editable (not for authorization)
- `raw_app_meta_data` - App-controlled (safe for authorization)

```sql
-- Check team membership from app_metadata
create policy "User is in team"
on public.my_table
for select
to authenticated
using ( team_id in (select auth.jwt() -> 'app_metadata' -> 'teams') );
```

### MFA Check

```sql
create policy "Require MFA for updates"
on public.profiles
as restrictive
for update
to authenticated
using ( (select auth.jwt()->>'aal') = 'aal2' );
```

## Performance Optimization

### 1. Add Indexes

```sql
create index idx_profiles_user_id
on public.profiles
using btree (user_id);
```

### 2. Use Select Wrapper

```sql
-- Bad: called per row
using ( auth.uid() = user_id );

-- Good: cached per statement
using ( (select auth.uid()) = user_id );
```

### 3. Avoid Joins in Policies

```sql
-- Bad: joins source to target
using (
  (select auth.uid()) in (
    select user_id from public.team_user
    where team_user.team_id = team_id  -- join
  )
);

-- Good: no join
using (
  team_id in (
    select team_id from public.team_user
    where user_id = (select auth.uid())
  )
);
```

### 4. Specify Roles

```sql
-- Always include TO clause
create policy "Users access own records"
on public.rls_test
for select
to authenticated  -- prevents running for anon
using ( (select auth.uid()) = user_id );
```
