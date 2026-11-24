-- CareFlow Muse AI usage log. Apply once to a Supabase project using its
-- SQL editor, after supabase/schema.sql.
-- No live project has been changed by preparing this file.
-- This is a reviewed bootstrap script, not an applied migration.
--
-- Purpose: durable per-user token spend for the Muse AI manager
-- (Meta Model API, Muse Spark / Ember / Wonder). The Edge Function
-- enforces daily/monthly token budgets from this table; the old
-- in-memory per-isolate cooldown could not survive restarts.
-- Only token counts are stored here. Never store prompts, conversation
-- history, replies, or any resident / employee / clinical content.
begin;

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  home_id uuid references public.homes(id),
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  created_at timestamptz not null default now()
);
create index ai_usage_user_time_idx on public.ai_usage(user_id, created_at desc);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant select, insert on public.ai_usage to authenticated;

-- Each user may log their own usage and read only their own rows.
create policy ai_usage_insert_own on public.ai_usage for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy ai_usage_read_own on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));

commit;
