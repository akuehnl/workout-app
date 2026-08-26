-- ============================================================================
-- Step 2 schema: the training log.
--
-- Run this AFTER 001_schema.sql. Safe to re-run.
--
-- Same RLS posture as Step 1: enabled on every table, wide open to anon.
-- Deliberate.
-- ============================================================================

-- Same wrong-project guard as the other files.
do $guard$
begin
  if not exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'workout_app_marker'
  ) then
    raise exception using
      errcode = 'raise_exception',
      message = 'Nothing created -- this project is not set up for the workout app.',
      hint    = 'Run supabase/001_schema.sql in THIS project first. If it refused, you are in the wrong project.';
  end if;
end
$guard$;


-- ---------------------------------------------------------------------------
-- training_log: one row per completed session.
--
-- total_seconds is nullable on purpose: sessions logged before the app existed
-- were never run on a clock, and recording a made-up duration for them would
-- be worse than recording none. The log renders those as "not timed".
-- ---------------------------------------------------------------------------
create table if not exists public.training_log (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  workout_id    uuid not null references public.workouts(id) on delete restrict,
  phase         smallint not null check (phase between 1 and 4),
  started_at    timestamptz,
  completed_at  timestamptz,
  total_seconds integer check (total_seconds is null or total_seconds >= 0),
  session_notes text not null default ''
);

create index if not exists training_log_date_idx    on public.training_log (date desc);
create index if not exists training_log_workout_idx on public.training_log (workout_id, date desc);


-- ---------------------------------------------------------------------------
-- training_log_items: one row per LINE of the session.
--
-- Every warmup drill, every main movement, the finisher and every mobility
-- piece gets its own row, its own checkbox and its own notes field. This is
-- deliberately not collapsed to a session-level checkbox.
--
-- sort_order is the position within the flattened session
-- (warmup || main || finisher || mobility), 1-based. exercise_key is unique
-- within a workout, so (log, exercise_key) is enough to find a row -- but
-- sort_order is what the UI orders by.
--
-- split_seconds is nullable: skipped items have no split, and neither do the
-- pre-app sessions.
-- ---------------------------------------------------------------------------
create table if not exists public.training_log_items (
  id              uuid primary key default gen_random_uuid(),
  training_log_id uuid not null references public.training_log(id) on delete cascade,
  exercise_key    text not null,
  sort_order      smallint not null,
  checked         boolean not null default false,
  split_seconds   integer check (split_seconds is null or split_seconds >= 0),
  notes           text not null default '',
  unique (training_log_id, exercise_key)
);

create index if not exists training_log_items_log_idx
  on public.training_log_items (training_log_id, sort_order);


-- ---------------------------------------------------------------------------
-- RLS: on, wide open to anon. Deliberate.
-- ---------------------------------------------------------------------------
alter table public.training_log       enable row level security;
alter table public.training_log_items enable row level security;

drop policy if exists anon_all on public.training_log;
create policy anon_all on public.training_log
  for all to anon, authenticated using (true) with check (true);

drop policy if exists anon_all on public.training_log_items;
create policy anon_all on public.training_log_items
  for all to anon, authenticated using (true) with check (true);
