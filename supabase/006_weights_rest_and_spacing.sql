-- ============================================================================
-- Changes driven by the session notes.
--
-- Run AFTER 002_seed.sql. Safe to re-run.
--
--   * "they should always tell me which weight to start with. These don't tell
--     me 25s or 35s" -- every loaded movement now names its weight. Movements
--     that progress by phase already got it from program_phases; the rest
--     carry it in the prescription.
--   * "Need the description to tell me how long to rest for between each set"
--     -- main-block lines gain a `rest` field. The numbers come from the time
--     the block actually has: six minutes for four sets is a 60s rest, not the
--     90s a fresh-legs strength program would give.
--   * "Cindy should have a button to count rounds" -- Cindy's line gains a
--     `counter` field that turns on the tally in the runner.
--   * "Cindy after upper body is tough" -- muscle_tags let the queue avoid
--     handing back a session that repeats what was trained the day before.
--
-- Weights assume the equipment on hand: two 25s and one 35. Nothing here asks
-- for a pair of 35s.
-- ============================================================================

do $guard$
begin
  if not exists (select 1 from information_schema.tables
                  where table_schema = 'public' and table_name = 'workout_app_marker') then
    raise exception using
      errcode = 'raise_exception',
      message = 'Nothing changed -- this project is not set up for the workout app.',
      hint    = 'Run supabase/001_schema.sql in this project first.';
  end if;
end
$guard$;


-- ---------------------------------------------------------------------------
-- Movement patterns each session hammers. The queue uses these to avoid
-- stacking two sessions that hit the same thing on consecutive days.
-- ---------------------------------------------------------------------------
alter table public.workouts
  add column if not exists muscle_tags jsonb not null default '[]'::jsonb;


-- ---------------------------------------------------------------------------
-- Session 1 -- Lower body
-- ---------------------------------------------------------------------------
update public.workouts set
  muscle_tags = $j$["squat","hinge","quads","glutes","hamstrings"]$j$::jsonb,
  main = $j$[
    {"exercise_key":"front_squat","name":"Double KB front squat","prescription":"4×8","cue":"Elbows in, torso tall.","rest":"60s between sets","start_remaining_seconds":1620},
    {"exercise_key":"reverse_lunge","name":"KB reverse lunge","prescription":"3×8/side","cue":"Back knee kisses the floor.","rest":"45s between sets","start_remaining_seconds":1260},
    {"exercise_key":"single_leg_rdl","name":"Single-leg RDL","prescription":"3×8/side · 35","cue":"Hips square, back leg long.","rest":"30s between sides","start_remaining_seconds":960},
    {"exercise_key":"goblet_squat_hold","name":"Goblet squat hold","prescription":"2×30s · 35","cue":"Sit tall, breathe.","rest":"30s between holds","start_remaining_seconds":720}
  ]$j$::jsonb,
  finisher = $j$[
    {"exercise_key":"finisher_snatch_squat","name":"Finisher","prescription":"4 rounds — 8 snatches/side, 10 squats, 30s rest","cue":"One block, steady pace.","start_remaining_seconds":600,"variation_key":"kb_snatch"}
  ]$j$::jsonb
where sort_order = 1;


-- ---------------------------------------------------------------------------
-- Session 2 -- Upper push
-- ---------------------------------------------------------------------------
update public.workouts set
  muscle_tags = $j$["push","chest","shoulders","triceps","pull_horizontal"]$j$::jsonb,
  main = $j$[
    {"exercise_key":"dips","name":"Dips","prescription":"4×8","cue":"Lower under control.","rest":"60s between sets","start_remaining_seconds":1500},
    {"exercise_key":"overhead_press","name":"Double KB overhead press","prescription":"4×6","cue":"Ribs down, full lockout.","rest":"60s between sets","start_remaining_seconds":1200},
    {"exercise_key":"push_ups","name":"Push-ups","prescription":"3×10","cue":"One straight line.","rest":"30s between sets","start_remaining_seconds":900},
    {"exercise_key":"single_arm_bent_row","name":"Single-arm KB bent row","prescription":"3×8/side · 35","cue":"Elbow to the hip.","rest":"30s between sides","start_remaining_seconds":720}
  ]$j$::jsonb,
  finisher = $j$[
    {"exercise_key":"finisher_highpull_pushup","name":"Finisher","prescription":"4 rounds — 10 high pulls/side (25), 10 push-ups, 30s rest","cue":"Keep the pace.","start_remaining_seconds":540,"variation_key":null}
  ]$j$::jsonb
where sort_order = 2;


-- ---------------------------------------------------------------------------
-- Session 3 -- Cindy
--
-- counter turns on the round tally in the runner. The count is written to the
-- top of this line's note, which is where the best-ever figure is read from.
-- ---------------------------------------------------------------------------
update public.workouts set
  muscle_tags = $j$["pull_vertical","push","chest","triceps","squat","quads"]$j$::jsonb,
  main = $j$[
    {"exercise_key":"cindy","name":"CINDY","prescription":"20-minute AMRAP — 5 pull-ups, 10 push-ups, 15 air squats","cue":"Steady from the first round. Tap a round as you finish it.","counter":{"label":"rounds"},"start_remaining_seconds":1440}
  ]$j$::jsonb
where sort_order = 3;


-- ---------------------------------------------------------------------------
-- Session 4 -- Upper pull + hinge
-- ---------------------------------------------------------------------------
update public.workouts set
  muscle_tags = $j$["pull_vertical","pull_horizontal","hinge","back","biceps","hamstrings"]$j$::jsonb,
  main = $j$[
    {"exercise_key":"pull_ups","name":"Pull-ups","prescription":"4×AMRAP (leave 2 in reserve)","cue":"Full hang every rep.","rest":"60s between sets","start_remaining_seconds":1500},
    {"exercise_key":"bent_row","name":"Double KB bent row","prescription":"4×8 · Double 25s","cue":"Flat back, elbows close.","rest":"45s between sets","start_remaining_seconds":1200},
    {"exercise_key":"kb_swing","name":"KB swing","prescription":"5×15","cue":"Snap the hips. Arms are ropes.","rest":"45s between sets","start_remaining_seconds":960},
    {"exercise_key":"kb_high_pull","name":"KB high pull","prescription":"3×8/side · 25","cue":"Elbow leads, hips drive.","rest":"40s between sides","start_remaining_seconds":660}
  ]$j$::jsonb,
  finisher = $j$[
    {"exercise_key":"finisher_swing_pullup","name":"Finisher","prescription":"3 rounds — 20 swings, 5 pull-ups, 30s rest","cue":"Break the set, not the pace.","start_remaining_seconds":480,"variation_key":"kb_swing"}
  ]$j$::jsonb
where sort_order = 4;


-- ---------------------------------------------------------------------------
-- Session 5 -- Full body
--
-- "25s are good. Did 35s for the second set but struggled." -- the clean and
-- press is a single-bell movement per side, so it says 25 outright now.
-- ---------------------------------------------------------------------------
update public.workouts set
  muscle_tags = $j$["push","shoulders","hinge","core","carry","full_body"]$j$::jsonb,
  main = $j$[
    {"exercise_key":"clean_and_press","name":"KB clean and press","prescription":"4×6/side · 25","cue":"Land it soft, then press.","rest":"45s between sides","start_remaining_seconds":1620},
    {"exercise_key":"front_rack_carry","name":"Front-rack carry","prescription":"3×40s · Double 25s","cue":"Ribs down, walk tall.","rest":"60s between carries","start_remaining_seconds":1260},
    {"exercise_key":"get_up","name":"Turkish get-up","prescription":"3×2/side","cue":"Eyes on the bell.","rest":"30s between reps","start_remaining_seconds":1020},
    {"exercise_key":"hollow_hold","name":"Hollow hold","prescription":"3×30s","cue":"Lower back flat.","rest":"30s between holds","start_remaining_seconds":720}
  ]$j$::jsonb,
  finisher = $j$[
    {"exercise_key":"finisher_snatch_pushup","name":"Finisher","prescription":"4 rounds — 8 snatches/side, 10 push-ups, 30s rest","cue":"Knees are fine. Stopping is not.","start_remaining_seconds":600,"variation_key":"kb_snatch"}
  ]$j$::jsonb
where sort_order = 5;


-- ---------------------------------------------------------------------------
-- Rest guidance on the front-rack carry was the one explicitly asked for, so
-- spell it out in the movement description too.
-- ---------------------------------------------------------------------------
update public.movements set
  description = $d$Hold the bells in the front rack and walk. Ribs down, glutes tight, breathing shallow through a braced trunk — it is a core exercise that happens to involve walking. Rest about 60 seconds between carries; if the grip is what fails first, that rest is doing its job.$d$
where exercise_key = 'front_rack_carry';
