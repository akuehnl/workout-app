-- ============================================================================
-- Step 2 seed: the two sessions done before the app existed.
--
-- Run AFTER 003_log_schema.sql. Safe to re-run -- each session only inserts if
-- there isn't already a log row for that date and workout, and if the insert
-- is skipped the item insert produces no rows either.
--
-- Item rows are generated FROM the workout's own jsonb, so exercise_key and
-- sort_order can never drift out of step with the program. Notes are matched
-- onto them by key; a movement with no note just gets an empty note.
--
-- total_seconds is left null for both: neither was run on a clock, and
-- inventing a duration would put fiction in the log.
-- ============================================================================

do $guard$
begin
  if not exists (select 1 from information_schema.tables
                  where table_schema = 'public' and table_name = 'training_log') then
    raise exception using
      errcode = 'raise_exception',
      message = 'Nothing seeded -- training_log does not exist.',
      hint    = 'Run supabase/003_log_schema.sql in this project first.';
  end if;
end
$guard$;


-- ---------------------------------------------------------------------------
-- Session 1 -- Lower body -- 2026-08-24
--
-- The couch stretch note goes in session_notes: this session's mobility block
-- is thoracic extension / pec / lat / deep squat rock, so there is no couch
-- stretch row to hang it on. Same rule the floor press gets below.
-- ---------------------------------------------------------------------------
with w as (
  select id, (warmup || main || finisher || mobility) as blocks
    from public.workouts where sort_order = 1
),
new_log as (
  insert into public.training_log (date, workout_id, phase, total_seconds, session_notes)
  select date '2026-08-24', w.id, 1, null,
         $n$Finished faster than expected. Heart rate lower than I'm used to.

Couch stretch: felt good but couldn't hold 90s — foot cramped. (Logged at session level: this session's mobility block has no couch stretch, so there's no row for it.)$n$
    from w
   where not exists (
     select 1 from public.training_log tl
      where tl.date = date '2026-08-24' and tl.workout_id = w.id
   )
  returning id
),
items as (
  select b.value ->> 'exercise_key' as exercise_key,
         b.ordinality::smallint     as ord
    from w, jsonb_array_elements(w.blocks) with ordinality as b(value, ordinality)
),
notes (exercise_key, note, checked) as (values
  ('hip_switches_90_90', 'Tough. Got 8 with full range.',                       true),
  ('bodyweight_squat',   'Easy.',                                               true),
  ('ankle_rock',         'Easy.',                                               true),
  ('front_squat',        'Felt good.',                                          true),
  ('reverse_lunge',      'Tough but completed. Used the 35.',                   true),
  ('single_leg_rdl',     'Good with the 35.',                                   true),
  ('goblet_squat_hold',  'Tough but done.',                                     true),
  ('deep_squat_rock',    'Felt great. Bounced and moved in circles in the bottom.', true)
)
insert into public.training_log_items
  (training_log_id, exercise_key, sort_order, checked, split_seconds, notes)
select nl.id, i.exercise_key, i.ord,
       coalesce(n.checked, true), null, coalesce(n.note, '')
  from new_log nl
 cross join items i
  left join notes n on n.exercise_key = i.exercise_key;


-- ---------------------------------------------------------------------------
-- Session 2 -- Upper push -- 2026-08-25
--
-- Done under the old prescription, which still had a floor press and no row.
-- That note goes to session level.
--
-- The single-arm bent row is marked NOT checked: it is the movement that
-- replaced the floor press, so it did not exist on the day this session was
-- performed. Recording it as done would be recording something that did not
-- happen. Flip it with:
--   update public.training_log_items set checked = true, notes = ''
--    where exercise_key = 'single_arm_bent_row';
-- ---------------------------------------------------------------------------
with w as (
  select id, (warmup || main || finisher || mobility) as blocks
    from public.workouts where sort_order = 2
),
new_log as (
  insert into public.training_log (date, workout_id, phase, total_seconds, session_notes)
  select date '2026-08-25', w.id, 1, null,
         $n$Performed under the old prescription, before the floor press was removed.

Floor press: too heavy after the push-ups. Dropped to the 25 for 3×7. (Logged at session level: the floor press is no longer in this session, so there's no row for it.)$n$
    from w
   where not exists (
     select 1 from public.training_log tl
      where tl.date = date '2026-08-25' and tl.workout_id = w.id
   )
  returning id
),
items as (
  select b.value ->> 'exercise_key' as exercise_key,
         b.ordinality::smallint     as ord
    from w, jsonb_array_elements(w.blocks) with ordinality as b(value, ordinality)
),
notes (exercise_key, note, checked) as (values
  ('scapular_push_up',        'Good and easy.',                                        true),
  ('dips',                    '4×8, went well.',                                       true),
  ('overhead_press',          'Right amount of weight. Completed.',                    true),
  ('push_ups',                'Tough. Failed on the last set at 10.',                  true),
  ('single_arm_bent_row',     'This session still had the floor press that day.', false),
  ('finisher_highpull_pushup','Good, but had no push-ups left. Did them on my knees.',  true)
)
insert into public.training_log_items
  (training_log_id, exercise_key, sort_order, checked, split_seconds, notes)
select nl.id, i.exercise_key, i.ord,
       coalesce(n.checked, true), null, coalesce(n.note, '')
  from new_log nl
 cross join items i
  left join notes n on n.exercise_key = i.exercise_key;
