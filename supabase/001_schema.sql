-- ============================================================================
-- Step 1 schema: settings, workouts, movements, program_phases.
--
-- Single user, no auth. RLS is ENABLED on every table with a policy that lets
-- the anonymous role read and write. That is deliberate: the anon key is public
-- and so is the data. Tightening it later is then a policy change, not a
-- migration. Keep the repo private.
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PREFLIGHT: am I in the right Supabase project?
--
-- This app wants its OWN project. "settings" and "movements" are generic
-- enough to already exist in another app's database, and "create table if not
-- exists" would quietly no-op against those tables and then seed data into
-- them. So: before creating anything, abort loudly if this database already
-- has tables with our names but is not already marked as ours.
--
-- If this raises, you are almost certainly pasting into the wrong project.
-- Create a new one and start over.
-- ---------------------------------------------------------------------------
do $guard$
declare
  already_ours boolean;
  clashes      text;
begin
  select exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'workout_app_marker'
  ) into already_ours;

  if already_ours then
    return; -- this project is ours; re-running is fine
  end if;

  select string_agg(table_name, ', ' order by table_name)
    into clashes
    from information_schema.tables
   where table_schema = 'public'
     and table_name in ('settings', 'workouts', 'movements', 'program_phases',
                        'training_log', 'training_log_items', 'metrics');

  if clashes is not null then
    raise exception using
      errcode = 'raise_exception',
      message = 'WRONG SUPABASE PROJECT -- nothing was created.',
      detail  = format('This database already contains: %s. Those are not this app''s tables (no workout_app_marker present).', clashes),
      hint    = 'The workout app needs its own Supabase project. Create a new project, then run this file there.';
  end if;
end
$guard$;

-- Ownership marker. Its presence is what tells a re-run that this project is
-- already the workout app's. RLS on with no policy: not readable over the API,
-- which is correct -- it is a schema-level marker, not app data.
create table if not exists public.workout_app_marker (
  id         smallint primary key default 1,
  app        text not null default 'kettlebell-workout-app',
  created_at timestamptz not null default now(),
  constraint workout_app_marker_singleton check (id = 1)
);
insert into public.workout_app_marker (id) values (1) on conflict (id) do nothing;
alter table public.workout_app_marker enable row level security;


-- ---------------------------------------------------------------------------
-- settings: exactly one row. The current phase is COMPUTED from program_start
-- at read time, never stored.
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id            smallint primary key default 1,
  program_start date not null,
  constraint settings_singleton check (id = 1)
);

-- ---------------------------------------------------------------------------
-- workouts: the five sessions.
--
-- Each of warmup/main/finisher/mobility is a jsonb array of blocks shaped:
--   {
--     "exercise_key": "front_squat",       -- unique within this workout
--     "name": "Double KB front squat",
--     "prescription": "4x8",
--     "cue": "Elbows in, torso tall.",
--     "start_remaining_seconds": 1620,     -- time LEFT on the clock, not elapsed
--     "variation_key": null                -- optional; see below
--   }
--
-- start_remaining_seconds counts DOWN. Session 1 totals 1800 and its last
-- block starts at 300.
--
-- variation_key is optional. Omitted, the block looks itself up in
-- program_phases by its own exercise_key. Set explicitly, it points somewhere
-- else -- which is how a finisher inherits the snatch's or the swing's phase
-- variation without colliding with that movement's own row earlier in the same
-- session. Set to null to opt out of phase substitution entirely.
-- ---------------------------------------------------------------------------
create table if not exists public.workouts (
  id            uuid primary key default gen_random_uuid(),
  sort_order    smallint not null unique check (sort_order between 1 and 5),
  name          text not null,
  focus         text not null,
  total_seconds integer not null check (total_seconds > 0),
  -- Why this session gets the mobility it gets. Deep holds deliberately target
  -- what the session did NOT train; see the note in the app.
  mobility_note text not null default '',
  warmup        jsonb not null default '[]'::jsonb,
  main          jsonb not null default '[]'::jsonb,
  finisher      jsonb not null default '[]'::jsonb,
  mobility      jsonb not null default '[]'::jsonb
);

-- ---------------------------------------------------------------------------
-- movements: one row per distinct movement, keyed by exercise_key.
-- description is two or three plain sentences. video_url is a text link only --
-- no embedded players anywhere in the app.
-- ---------------------------------------------------------------------------
create table if not exists public.movements (
  exercise_key text primary key,
  name         text not null,
  description  text not null,
  cue          text not null default '',
  video_url    text
);

-- ---------------------------------------------------------------------------
-- program_phases: the harder-variation progression. Weights are fixed, so the
-- program progresses by variation, not by load.
-- ---------------------------------------------------------------------------
create table if not exists public.program_phases (
  phase        smallint not null check (phase between 1 and 4),
  exercise_key text not null,
  variation    text not null,
  primary key (phase, exercise_key)
);

-- ---------------------------------------------------------------------------
-- RLS: on, wide open to anon. Deliberate.
-- ---------------------------------------------------------------------------
alter table public.settings       enable row level security;
alter table public.workouts       enable row level security;
alter table public.movements      enable row level security;
alter table public.program_phases enable row level security;

drop policy if exists anon_all on public.settings;
create policy anon_all on public.settings
  for all to anon, authenticated using (true) with check (true);

drop policy if exists anon_all on public.workouts;
create policy anon_all on public.workouts
  for all to anon, authenticated using (true) with check (true);

drop policy if exists anon_all on public.movements;
create policy anon_all on public.movements
  for all to anon, authenticated using (true) with check (true);

drop policy if exists anon_all on public.program_phases;
create policy anon_all on public.program_phases
  for all to anon, authenticated using (true) with check (true);
