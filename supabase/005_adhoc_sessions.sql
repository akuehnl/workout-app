-- ============================================================================
-- Step 3: sessions done outside the app.
--
-- Run AFTER 003_log_schema.sql. Safe to re-run.
--
-- A session you did away from the app still counts toward the week, so the log
-- has to be able to hold one that isn't one of the five. Two changes:
--
--   * workout_id becomes nullable -- an ad-hoc entry ("went climbing") points
--     at no session in the program.
--   * title carries the name of an ad-hoc entry.
--
-- Logging one of the five that you did without the app still sets workout_id,
-- so it feeds the queue exactly like an in-app session. Only genuinely
-- off-program sessions leave it null; those count toward the streak but say
-- nothing about which session is up next.
-- ============================================================================

do $guard$
begin
  if not exists (select 1 from information_schema.tables
                  where table_schema = 'public' and table_name = 'training_log') then
    raise exception using
      errcode = 'raise_exception',
      message = 'Nothing changed -- training_log does not exist.',
      hint    = 'Run supabase/003_log_schema.sql in this project first.';
  end if;
end
$guard$;

alter table public.training_log alter column workout_id drop not null;

alter table public.training_log add column if not exists title text;

-- Every row must be identifiable as something: either it points at one of the
-- five sessions, or it carries its own name.
alter table public.training_log drop constraint if exists training_log_identifiable;
alter table public.training_log add constraint training_log_identifiable
  check (workout_id is not null or coalesce(btrim(title), '') <> '');
