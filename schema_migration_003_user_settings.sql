-- Migration 003 — user_settings table for per-user preferences.
-- (display currency, language, calendar toggle, warnDays, etc.)
-- Stored as JSONB so we can add new prefs without further migrations.
--
-- Why a dedicated table and not auth.user_metadata?
-- Supabase refreshes user_metadata from the OAuth provider on each
-- sign-in/refresh, which would wipe our custom keys. A separate row
-- under our control is the documented workaround.
--
-- Run once in Supabase SQL editor. Idempotent.

create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  prefs      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_insert_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;

create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "user_settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);

create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
