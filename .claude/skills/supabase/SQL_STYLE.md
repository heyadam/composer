# SQL Style Guide

## General Rules
- Use lowercase for SQL reserved words
- Use snake_case for tables and columns
- Prefer plurals for table names, singular for columns
- Store dates in ISO 8601 format (`yyyy-mm-ddThh:mm:ss.sssss`)
- Include comments for complex logic using `/* ... */` or `--`

## Naming Conventions
- Avoid SQL reserved words
- Names under 63 characters
- Use snake_case for tables and columns
- Prefer plurals for table names
- Prefer singular for column names

## Table Creation
- Always add `id bigint generated always as identity primary key`
- Create tables in `public` schema unless specified
- Always qualify with schema (e.g., `public.users`)
- Add table comments

```sql
create table public.books (
  id bigint generated always as identity primary key,
  title text not null,
  author_id bigint references public.authors (id)
);
comment on table public.books is 'A list of all books in the library.';
```

## Column References
- For foreign keys, use singular table name with `_id` suffix
- Example: `user_id` references `users` table

## Query Formatting

### Simple Queries
```sql
select *
from public.employees
where end_date is null;

update public.employees
set end_date = '2023-12-31'
where employee_id = 1001;
```

### Larger Queries
```sql
select
  first_name,
  last_name
from public.employees
where start_date between '2021-01-01' and '2021-12-31'
  and status = 'employed';
```

## Joins
- Use full table names for readability
- Align joins with related clauses

```sql
select
  employees.employee_name,
  departments.department_name
from
  public.employees
  join public.departments on employees.department_id = departments.department_id
where employees.start_date > '2022-01-01';
```

## Aliases
- Use meaningful aliases
- Always include `as` keyword

```sql
select count(*) as total_employees
from public.employees
where end_date is null;
```

## CTEs for Complex Queries

```sql
with
  department_employees as (
    -- Get all employees and their departments
    select
      employees.department_id,
      employees.first_name,
      employees.last_name,
      departments.department_name
    from
      public.employees
      join public.departments on employees.department_id = departments.department_id
  ),
  employee_counts as (
    -- Count employees per department
    select
      department_name,
      count(*) as num_employees
    from department_employees
    group by department_name
  )
select
  department_name,
  num_employees
from employee_counts
order by department_name;
```
