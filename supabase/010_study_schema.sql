-- ============================================================================
-- Scripture study: schema.
--
-- Run AFTER 001_schema.sql. Safe to re-run. Seed follows in 011_study_seed.sql.
--
-- A second, independent section of the app. It shares the database and the
-- shell with the workout half and nothing else -- no foreign keys cross
-- between them, and no workout code is touched.
--
-- Conventions followed from the workout tables: snake_case plural tables,
-- natural primary keys where one exists, ordered display content as a jsonb
-- array of snake_case objects, RLS enabled with one wide-open anon policy, and
-- a wrong-project guard up front.
--
-- MEMORY VERSES: only the reference is stored, never the text. The app renders
-- the reference as an esv.org link. Nothing here fetches, caches or hardcodes
-- verse text, and nothing should be added that does.
-- ============================================================================

do $guard$
begin
  if not exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'workout_app_marker'
  ) then
    raise exception using
      errcode = 'raise_exception',
      message = 'Nothing created -- this project is not set up for this app.',
      hint    = 'Run supabase/001_schema.sql in THIS project first. If it refused, you are in the wrong project.';
  end if;
end
$guard$;


-- ---------------------------------------------------------------------------
-- study_months: the whole 24-month arc, Oct 2026 to Sep 2028.
--
-- Reference material for the Arc view. Months beyond the first have no weeks
-- seeded yet and that is expected -- weeks arrive a month at a time.
--
-- has_gap is lifted out of the resource text rather than left as a "(gap)"
-- suffix inside it, so the Arc view can mark a gap month without matching on
-- strings at render time.
-- ---------------------------------------------------------------------------
create table if not exists public.study_months (
  month_number   smallint primary key check (month_number between 1 and 24),
  month_label    text not null,
  exam_section   text not null,
  focus          text not null,
  canon_resource text not null,
  /** Nullable: no supplements assigned yet. */
  supplement     text,
  has_gap        boolean not null default false
);


-- ---------------------------------------------------------------------------
-- study_weeks: one row per week, numbered continuously from 1.
--
-- start_date is the Monday and end_date the Friday. memory_verse_ref is a
-- REFERENCE ONLY ("2 Timothy 3:16-17"); memory_verse_code is its label
-- ("MV01").
-- ---------------------------------------------------------------------------
create table if not exists public.study_weeks (
  week_number       smallint primary key check (week_number >= 1),
  month_number      smallint not null references public.study_months(month_number) on delete restrict,
  start_date        date not null unique,
  end_date          date not null,
  subject           text not null,
  memory_verse_ref  text not null,
  memory_verse_code text not null,
  constraint study_weeks_monday_to_friday check (end_date > start_date)
);

create index if not exists study_weeks_month_idx on public.study_weeks (month_number, week_number);


-- ---------------------------------------------------------------------------
-- study_sessions: one row per session. Three a week on a fixed calendar.
--
-- blocks is the ordered, display-only breakdown of the half hour:
--   [{ "time_range": "0:00-0:04", "instruction": "..." }, ...]
--
-- ONE checkbox and ONE notes field per session. The blocks are not checked off
-- individually -- deliberately unlike the workout log, where every line gets
-- its own row.
--
-- `completed` rather than the workout log's `checked`: it pairs with
-- completed_at, and there is no session-level boolean on the workout side to
-- match.
-- ---------------------------------------------------------------------------
create table if not exists public.study_sessions (
  id           uuid primary key default gen_random_uuid(),
  week_number  smallint not null references public.study_weeks(week_number) on delete cascade,
  day          text not null check (day in ('monday', 'thursday', 'friday')),
  session_date date not null unique,
  blocks       jsonb not null default '[]'::jsonb,
  completed    boolean not null default false,
  completed_at timestamptz,
  notes        text not null default '',
  -- One session per day per week, and a day can't hold two.
  unique (week_number, day)
);

create index if not exists study_sessions_date_idx on public.study_sessions (session_date);
create index if not exists study_sessions_week_idx on public.study_sessions (week_number, session_date);


-- ---------------------------------------------------------------------------
-- RLS: on, wide open to anon. Same posture as every other table here.
-- ---------------------------------------------------------------------------
alter table public.study_months   enable row level security;
alter table public.study_weeks    enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists anon_all on public.study_months;
create policy anon_all on public.study_months
  for all to anon, authenticated using (true) with check (true);

drop policy if exists anon_all on public.study_weeks;
create policy anon_all on public.study_weeks
  for all to anon, authenticated using (true) with check (true);

drop policy if exists anon_all on public.study_sessions;
create policy anon_all on public.study_sessions
  for all to anon, authenticated using (true) with check (true);
