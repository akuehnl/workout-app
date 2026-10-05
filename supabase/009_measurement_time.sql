-- ============================================================================
-- Time of day on measurements, and the window to filter them by.
--
-- Run AFTER 007_metrics.sql. Safe to re-run.
--
-- Body weight swings several pounds across a day, so a reading taken at 7am
-- and one taken at 9pm are not really the same measurement. Recording the time
-- makes it possible to compare like with like.
--
-- measured_at is nullable and every existing row is null: the app never asked
-- for a time, so there is none to backfill. Inventing one would put a guess in
-- the data and then fit a trend line to it. The filter treats an untimed
-- reading as unknown rather than assuming it falls in the window.
-- ============================================================================

do $guard$
begin
  if not exists (select 1 from information_schema.tables
                  where table_schema = 'public' and table_name = 'metrics') then
    raise exception using
      errcode = 'raise_exception',
      message = 'Nothing changed -- the metrics table does not exist.',
      hint    = 'Run supabase/007_metrics.sql in this project first.';
  end if;
end
$guard$;

alter table public.metrics add column if not exists measured_at time;

-- The "before dinner" window. Stored rather than hardcoded so it can be moved
-- without a deploy, and in settings rather than localStorage so the phone and
-- the laptop agree.
alter table public.settings
  add column if not exists metrics_window_start time not null default '13:00';

alter table public.settings
  add column if not exists metrics_window_end time not null default '17:30';
