-- Migration 001 — add per-subscription currency.
-- Run once in Supabase SQL editor.

alter table public.subscriptions
  add column if not exists currency text not null default 'EUR';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_currency_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_currency_check
      check (currency in ('EUR','USD','PLN','RUB','GBP','CHF','JPY'));
  end if;
end $$;
