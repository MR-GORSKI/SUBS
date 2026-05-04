-- SUBS — Supabase schema
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run.

-- ── Subscriptions table ──────────────────────────────────
create table if not exists public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  price       numeric not null check (price >= 0),
  period      text not null check (period in ('week','month','year')),
  start       date not null,
  color       text not null,
  closed      date,
  created_at  timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

-- ── Row Level Security ───────────────────────────────────
alter table public.subscriptions enable row level security;

drop policy if exists "select_own" on public.subscriptions;
drop policy if exists "insert_own" on public.subscriptions;
drop policy if exists "update_own" on public.subscriptions;
drop policy if exists "delete_own" on public.subscriptions;

create policy "select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

create policy "update_own" on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete_own" on public.subscriptions
  for delete using (auth.uid() = user_id);

-- ── Realtime (optional — enables cross-device sync) ──────
-- If this throws "publication does not exist", skip it.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.subscriptions';
  end if;
exception when duplicate_object then
  null;
end $$;
