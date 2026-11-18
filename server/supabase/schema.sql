-- Tobe: tasks table for Supabase (PostgreSQL).
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again: it only creates or adds what is missing, so it also
-- upgrades a table created by an earlier version of this file.

create table if not exists public.tasks (
  id          bigint generated always as identity primary key,
  text        text        not null check (char_length(trim(text)) between 1 and 200),
  completed   boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- Optional longer text shown under the title.
alter table public.tasks add column if not exists description text not null default '';

-- How important the task is: low, medium, high or urgent.
alter table public.tasks add column if not exists priority text not null default 'medium';

-- Manual order (drag to reorder). The list is sorted by position, highest
-- first. New tasks get the current time in milliseconds, which is higher
-- than any reordered position, so they appear at the top.
alter table public.tasks add column if not exists position double precision;
update public.tasks set position = extract(epoch from created_at) * 1000 where position is null;
alter table public.tasks alter column position set default (extract(epoch from clock_timestamp()) * 1000);
alter table public.tasks alter column position set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_description_length') then
    alter table public.tasks add constraint tasks_description_length check (char_length(description) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_priority_valid') then
    alter table public.tasks add constraint tasks_priority_valid check (priority in ('low', 'medium', 'high', 'urgent'));
  end if;
end $$;

-- Private lists: each visitor's browser has a random key, and the server
-- stores its SHA-256 hash here. Tasks are only ever read or changed for
-- the owner_id of the request. Tasks created before lists existed have no
-- owner_id, so no one can see them. To delete them:
--   delete from public.tasks where owner_id is null;
alter table public.tasks add column if not exists owner_id text;

drop index if exists public.tasks_created_at_idx;
drop index if exists public.tasks_position_idx;
create index if not exists tasks_owner_position_idx on public.tasks (owner_id, position desc);

-- Optional name per list ("Dief" -> "Dief's To-Do List").
create table if not exists public.lists (
  owner_id    text        primary key check (char_length(owner_id) = 64),
  name        text        not null default '' check (char_length(name) <= 40),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Saves a new order for one list in one statement: the first id ends up on top.
drop function if exists public.reorder_tasks(bigint[]);
create or replace function public.reorder_tasks(list_owner text, task_ids bigint[])
returns void
language sql
set search_path = ''
as $$
  update public.tasks as t
  set position = cardinality(task_ids) - u.ord
  from unnest(task_ids) with ordinality as u(id, ord)
  where t.id = u.id and t.owner_id = list_owner;
$$;

-- Only the server (secret / service_role key) may call it.
revoke execute on function public.reorder_tasks(text, bigint[]) from public, anon, authenticated;
grant execute on function public.reorder_tasks(text, bigint[]) to service_role;

-- Lock the table down. With row level security on and no policies, the
-- public "anon"/"publishable" key can't read or change tasks through
-- Supabase's API. The Express server uses the secret (service_role) key,
-- which bypasses RLS, so all access goes through your API's validation.
alter table public.tasks enable row level security;
alter table public.lists enable row level security;

-- Tell Supabase's API to pick up the changes right away.
notify pgrst, 'reload schema';
