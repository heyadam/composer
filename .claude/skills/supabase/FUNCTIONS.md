# Database Functions

## Guidelines

1. **Default to `SECURITY INVOKER`** - Runs with caller's permissions. Use `SECURITY DEFINER` only when explicitly required.

2. **Set `search_path = ''`** - Prevents security risks from untrusted schemas. Use fully qualified names.

3. **Use explicit typing** - Clear input/output types, avoid ambiguous parameters.

4. **Prefer IMMUTABLE/STABLE** - Use `VOLATILE` only if function modifies data or has side effects.

## Basic Function Template

```sql
create or replace function public.hello_world()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return 'hello world';
end;
$$;
```

## Function with Parameters

```sql
create or replace function public.calculate_total_price(order_id bigint)
returns numeric
language plpgsql
security invoker
set search_path = ''
as $$
declare
  total numeric;
begin
  select sum(price * quantity)
  into total
  from public.order_items
  where order_id = calculate_total_price.order_id;

  return total;
end;
$$;
```

## Trigger Function

```sql
create or replace function public.update_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger update_updated_at_trigger
before update on public.my_table
for each row
execute function public.update_updated_at();
```

## Error Handling

```sql
create or replace function public.safe_divide(numerator numeric, denominator numeric)
returns numeric
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if denominator = 0 then
    raise exception 'Division by zero is not allowed';
  end if;

  return numerator / denominator;
end;
$$;
```

## Immutable Function (SQL language)

```sql
create or replace function public.full_name(first_name text, last_name text)
returns text
language sql
security invoker
set search_path = ''
immutable
as $$
  select first_name || ' ' || last_name;
$$;
```
