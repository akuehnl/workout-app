-- ============================================================================
-- Body weight and measurements.
--
-- Run AFTER 001_schema.sql. Safe to re-run.
--
-- This is the piece that was deliberately deferred while the workout half got
-- built. It stands on its own: nothing here touches the program, the log or
-- the streak.
--
-- Every measurement is nullable -- weighing yourself without getting the tape
-- out is the normal case. One row per date, so re-entering a day corrects it
-- rather than creating a duplicate.
-- ============================================================================

do $guard$
begin
  if not exists (select 1 from information_schema.tables
                  where table_schema = 'public' and table_name = 'workout_app_marker') then
    raise exception using
      errcode = 'raise_exception',
      message = 'Nothing created -- this project is not set up for the workout app.',
      hint    = 'Run supabase/001_schema.sql in this project first.';
  end if;
end
$guard$;


create table if not exists public.metrics (
  id         uuid primary key default gen_random_uuid(),
  date       date not null unique,
  weight_lbs numeric(5,1) check (weight_lbs is null or weight_lbs > 0),
  chest_in   numeric(4,1) check (chest_in   is null or chest_in   > 0),
  waist_in   numeric(4,1) check (waist_in   is null or waist_in   > 0),
  hips_in    numeric(4,1) check (hips_in    is null or hips_in    > 0),
  arm_in     numeric(4,1) check (arm_in     is null or arm_in     > 0),
  thigh_in   numeric(4,1) check (thigh_in   is null or thigh_in   > 0),
  -- A row with nothing in it is a row that shouldn't exist.
  constraint metrics_not_empty check (
    weight_lbs is not null or chest_in is not null or waist_in is not null
    or hips_in is not null or arm_in is not null or thigh_in is not null
  )
);

create index if not exists metrics_date_idx on public.metrics (date desc);


-- The goal line on the weight chart. Null means no goal set yet, and the chart
-- simply doesn't draw one.
alter table public.settings
  add column if not exists goal_weight_lbs numeric(5,1)
  check (goal_weight_lbs is null or goal_weight_lbs > 0);


-- ---------------------------------------------------------------------------
-- RLS: on, wide open to anon. Same posture as every other table here.
-- ---------------------------------------------------------------------------
alter table public.metrics enable row level security;

drop policy if exists anon_all on public.metrics;
create policy anon_all on public.metrics
  for all to anon, authenticated using (true) with check (true);
