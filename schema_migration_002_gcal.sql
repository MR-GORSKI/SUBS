-- Migration 002 — Google Calendar event tracking.
-- Run once in Supabase SQL editor. Idempotent.

alter table public.subscriptions
  add column if not exists gcal_event_id text,
  add column if not exists gcal_calendar_id text;
