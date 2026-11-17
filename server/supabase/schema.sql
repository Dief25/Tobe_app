-- Tobe: tasks table for Supabase (PostgreSQL).
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again; it only creates what is missing.

create table if not exists public.tasks (
  id          bigint generated always as identity primary key,
  text        text        not null check (char_length(trim(text)) between 1 and 200),
  completed   boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- The API lists tasks newest first.
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

-- Lock the table down. With row level security on and no policies, the
-- public "anon"/"publishable" key can't read or change tasks through
-- Supabase's API. The Express server uses the secret (service_role) key,
-- which bypasses RLS, so all access goes through your API's validation.
alter table public.tasks enable row level security;
