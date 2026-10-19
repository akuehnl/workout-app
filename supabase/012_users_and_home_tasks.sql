-- ============================================================================
-- Users, section permissions, and the home task tables.
--
-- Run AFTER 001_schema.sql. Safe to re-run.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS IS NOT
--
-- This is not authentication. Picking a name is a display preference, not a
-- credential: anyone who opens the app can select Aden and get admin, and the
-- anon key in the published bundle lets anyone read and write every table
-- regardless of what the UI shows them. The permissions below decide which
-- sections a device DISPLAYS. They are not a security boundary and must not be
-- treated as one.
--
-- That is a deliberate call -- the alternative needs real credentials and
-- per-user RLS across every table. If that changes, this file is where it
-- starts.
-- ---------------------------------------------------------------------------
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
      hint    = 'Run supabase/001_schema.sql in THIS project first.';
  end if;
end
$guard$;


-- ---------------------------------------------------------------------------
-- app_users
--
-- Admin is a column rather than a hardcoded name so a third person can be
-- added as a row. An admin sees every section regardless of what is granted.
-- ---------------------------------------------------------------------------
create table if not exists public.app_users (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  is_admin   boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- app_user_sections: which sections a non-admin user's device displays.
--
-- Section keys match the route segments so the gate and the router can't
-- drift apart: 'workout', 'study', 'home-todo', 'home-maintenance'.
-- ---------------------------------------------------------------------------
create table if not exists public.app_user_sections (
  user_id uuid not null references public.app_users(id) on delete cascade,
  section text not null check (
    section in ('workout', 'study', 'home-todo', 'home-maintenance')
  ),
  primary key (user_id, section)
);


-- ---------------------------------------------------------------------------
-- home_tasks
--
-- ONE table, two sections. category is the only thing that differs between
-- "Home to-do" and "Home maintenance" -- both take due dates, both can
-- recur, both can be assigned. Splitting them into two tables would have
-- duplicated recurrence, assignment and the completion log to encode what is
-- really a tag.
--
-- Recurrence is a count plus a unit, not a day count: "every 3 months" is
-- what you mean by quarterly, and 90 days is not the same thing.
--
-- repeat_every null means a one-off. A one-off closes out via `completed`; a
-- recurring task never does -- completing it logs the work and rolls due_date
-- forward from the day it was actually done.
-- ---------------------------------------------------------------------------
create table if not exists public.home_tasks (
  id           uuid primary key default gen_random_uuid(),
  category     text not null check (category in ('todo', 'maintenance')),
  title        text not null check (btrim(title) <> ''),
  notes        text not null default '',
  due_date     date not null,
  /** Null means nobody in particular. */
  assigned_to  uuid references public.app_users(id) on delete set null,
  repeat_every smallint check (repeat_every is null or repeat_every > 0),
  repeat_unit  text check (repeat_unit in ('days', 'weeks', 'months', 'years')),
  completed    boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  /** Both halves of the interval, or neither. */
  constraint home_tasks_repeat_pair check (
    (repeat_every is null and repeat_unit is null)
    or (repeat_every is not null and repeat_unit is not null)
  ),
  /** A recurring task rolls forward instead of closing. */
  constraint home_tasks_recurring_never_closes check (
    repeat_every is null or completed = false
  )
);

create index if not exists home_tasks_category_due_idx
  on public.home_tasks (category, completed, due_date);


-- ---------------------------------------------------------------------------
-- home_task_completions: the log.
--
-- The point of tracking maintenance is answering "when did we last do this",
-- which a rolling due date alone cannot. Same shape as training_log_items:
-- one row per event, cascade with its parent.
-- ---------------------------------------------------------------------------
create table if not exists public.home_task_completions (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.home_tasks(id) on delete cascade,
  completed_on date not null,
  completed_by uuid references public.app_users(id) on delete set null,
  notes        text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists home_task_completions_task_idx
  on public.home_task_completions (task_id, completed_on desc);


-- ---------------------------------------------------------------------------
-- RLS: on, wide open to anon. Same posture as every other table here, and see
-- the note at the top about what these permissions are and are not.
-- ---------------------------------------------------------------------------
alter table public.app_users             enable row level security;
alter table public.app_user_sections     enable row level security;
alter table public.home_tasks            enable row level security;
alter table public.home_task_completions enable row level security;

drop policy if exists anon_all on public.app_users;
create policy anon_all on public.app_users
  for all to anon, authenticated using (true) with check (true);

drop policy if exists anon_all on public.app_user_sections;
create policy anon_all on public.app_user_sections
  for all to anon, authenticated using (true) with check (true);

drop policy if exists anon_all on public.home_tasks;
create policy anon_all on public.home_tasks
  for all to anon, authenticated using (true) with check (true);

drop policy if exists anon_all on public.home_task_completions;
create policy anon_all on public.home_task_completions
  for all to anon, authenticated using (true) with check (true);


-- ---------------------------------------------------------------------------
-- The two users. Inline rather than in a separate seed file because it is two
-- rows of configuration, not a content load.
--
-- Kate starts with the two home sections. Aden is admin and sees everything
-- without needing rows here at all.
-- ---------------------------------------------------------------------------
insert into public.app_users (name, is_admin, sort_order) values
  ('Aden', true,  1),
  ('Kate', false, 2)
on conflict (name) do update set
  is_admin   = excluded.is_admin,
  sort_order = excluded.sort_order;

insert into public.app_user_sections (user_id, section)
select u.id, s.section
  from public.app_users u
 cross join (values ('home-todo'), ('home-maintenance')) as s(section)
 where u.name = 'Kate'
on conflict (user_id, section) do nothing;
