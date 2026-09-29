-- ============================================================================
-- Rebuild all five sessions to 20 minutes of work plus 4 minutes of stretching.
--
-- Run AFTER 002_seed.sql. Safe to re-run.
--
-- Shape is now identical across every session:
--     24:00  warmup      (3 min, short on purpose)
--     21:00  main work   (17 min)
--      4:00  mobility    (4 min)
--      0:00  done
--
-- 20 minutes of warmup + work, then the stretching. Driven by the 2026-09-07
-- note, "Ran out of time to work out" -- that session came in at 18:38 against
-- a 28:00 prescription.
--
-- Also folds in the outstanding session notes:
--
--   * "Don't know if this is 5 per side?" (kb_swing, 09-23) -- it never was.
--     The cue now says so outright.
--   * "25s are too easy" (clean_and_press, 09-14) -- moved to the 35.
--   * "could be 35s if swinging" (kb_high_pull, 09-08) -- moved to the 35,
--     with the upright-row variation called out as the one that stays at 25.
--   * "Need to add groin stretches to the rotation, be able to do wider
--     splits" (09-05) -- frog stretch added, and it appears on the three days
--     that don't train the adductors hard.
--
-- Something had to go to fit 17 minutes of work. What went: the goblet squat
-- hold (redundant next to the front squat), and the long-hold mobility that
-- duplicated another day's. Every session keeps its conditioning finisher, and
-- hip and knee work still appears in all five.
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
-- New movement: the groin work asked for on 2026-09-05.
-- ---------------------------------------------------------------------------
insert into public.movements (exercise_key, name, description, cue, video_url) values
($d$frog_stretch$d$, $d$Frog stretch$d$,
 $d$On hands and knees with the knees as wide as they will go, shins turned out and the inside of each foot flat on the floor. Rock the hips back toward your heels and hold, keeping the lower back flat rather than arched. This is the one that widens a squat and a straddle.$d$,
 $d$Knees wide, back flat, rock back slowly.$d$,
 $d$https://www.youtube.com/results?search_query=frog+stretch+adductor+mobility$d$)
on conflict (exercise_key) do update set
  name = excluded.name, description = excluded.description,
  cue = excluded.cue, video_url = excluded.video_url;


-- ---------------------------------------------------------------------------
-- Answering the question in the log, permanently.
-- ---------------------------------------------------------------------------
update public.movements set
  description = $d$A hinge, not a squat, and not a front raise. Hike the bell back between your legs and snap the hips forward so it floats up to about chest height on its own. The rep count is per set, never per side — on the single-arm phases, swap hands between sets rather than doubling the work.$d$,
  cue = $d$Reps are per set, not per side.$d$
where exercise_key = 'kb_swing';

update public.movements set
  description = $d$Like a swing, but as the bell floats up you pull it to chest height with the elbow leading and the bell staying close to you. The hips still do the work; the arm only steers. Done this way it takes the 35. The other version — a strict upright row with no hip drive — is a different exercise and stays at 25.$d$,
  cue = $d$Hips drive, elbow leads. Strict upright rows stay at 25.$d$
where exercise_key = 'kb_high_pull';


-- ---------------------------------------------------------------------------
-- Session 1 -- Lower body -- 24:00
-- ---------------------------------------------------------------------------
update public.workouts set
  total_seconds = 1440,
  mobility_note = $d$Upper-body bias — the legs just worked. Hips and knees stay in as movement, not long holds.$d$,
  warmup = $j$[
    {"exercise_key":"hip_switches_90_90","name":"90/90 hip switches","prescription":"6/side","cue":"Hands off the floor.","start_remaining_seconds":1440},
    {"exercise_key":"bodyweight_squat","name":"Bodyweight squats","prescription":"10","cue":"Chest up, heels down.","start_remaining_seconds":1440},
    {"exercise_key":"ankle_rock","name":"Ankle rocks","prescription":"8/side","cue":"Heel stays glued down.","start_remaining_seconds":1440}
  ]$j$::jsonb,
  main = $j$[
    {"exercise_key":"front_squat","name":"Double KB front squat","prescription":"4×8","cue":"Elbows in, torso tall.","rest":"45s between sets","start_remaining_seconds":1260},
    {"exercise_key":"reverse_lunge","name":"KB reverse lunge","prescription":"3×8/side","cue":"Back knee kisses the floor.","rest":"40s between sets","start_remaining_seconds":960},
    {"exercise_key":"single_leg_rdl","name":"Single-leg RDL","prescription":"3×8/side · 35","cue":"Hips square, back leg long.","rest":"30s between sides","start_remaining_seconds":720}
  ]$j$::jsonb,
  finisher = $j$[
    {"exercise_key":"finisher_snatch_squat","name":"Finisher","prescription":"3 rounds — 8 snatches/side, 10 squats, 30s rest","cue":"One block, steady pace.","start_remaining_seconds":480,"variation_key":"kb_snatch"}
  ]$j$::jsonb,
  mobility = $j$[
    {"exercise_key":"thoracic_extension","name":"Thoracic extension over a KB","prescription":"60s","cue":"Breathe into it.","start_remaining_seconds":240},
    {"exercise_key":"doorway_pec_stretch","name":"Doorway pec stretch","prescription":"45s/side","cue":"Turn the chest away.","start_remaining_seconds":240},
    {"exercise_key":"deep_squat_rock","name":"Deep squat rock","prescription":"60s","cue":"Keep moving.","start_remaining_seconds":240}
  ]$j$::jsonb
where sort_order = 1;


-- ---------------------------------------------------------------------------
-- Session 2 -- Upper push -- 24:00
-- ---------------------------------------------------------------------------
update public.workouts set
  total_seconds = 1440,
  mobility_note = $d$Lower-body bias — this is a push day, so the legs and groin get the deep holds.$d$,
  warmup = $j$[
    {"exercise_key":"scapular_push_up","name":"Scapular push-ups","prescription":"8","cue":"Arms stay locked.","start_remaining_seconds":1440},
    {"exercise_key":"shoulder_pass_through","name":"Towel shoulder pass-throughs","prescription":"8","cue":"Straight arms, go wide.","start_remaining_seconds":1440},
    {"exercise_key":"wrist_circles","name":"Wrist circles","prescription":"10 each direction","cue":"Slow. Do not skip these.","start_remaining_seconds":1440}
  ]$j$::jsonb,
  main = $j$[
    {"exercise_key":"dips","name":"Dips","prescription":"4×8","cue":"Lower under control.","rest":"45s between sets","start_remaining_seconds":1260},
    {"exercise_key":"overhead_press","name":"Double KB overhead press","prescription":"4×6","cue":"Ribs down, full lockout.","rest":"40s between sets","start_remaining_seconds":990},
    {"exercise_key":"push_ups","name":"Push-ups","prescription":"3×10","cue":"One straight line.","rest":"30s between sets","start_remaining_seconds":750},
    {"exercise_key":"single_arm_bent_row","name":"Single-arm KB bent row","prescription":"3×8/side · 35","cue":"Elbow to the hip.","rest":"20s between sides","start_remaining_seconds":600}
  ]$j$::jsonb,
  finisher = $j$[
    {"exercise_key":"finisher_highpull_pushup","name":"Finisher","prescription":"3 rounds — 10 high pulls/side (35), 10 push-ups, 30s rest","cue":"Keep the pace.","start_remaining_seconds":480,"variation_key":null}
  ]$j$::jsonb,
  mobility = $j$[
    {"exercise_key":"couch_stretch","name":"Couch stretch","prescription":"60s/side","cue":"If the foot cramps, curl the toes under.","start_remaining_seconds":240},
    {"exercise_key":"frog_stretch","name":"Frog stretch","prescription":"60s","cue":"Knees wide, back flat.","start_remaining_seconds":240},
    {"exercise_key":"hamstring_stretch","name":"Hamstring stretch","prescription":"30s/side","cue":"Hinge, do not round.","start_remaining_seconds":240}
  ]$j$::jsonb
where sort_order = 2;


-- ---------------------------------------------------------------------------
-- Session 3 -- Cindy -- 24:00
--
-- The AMRAP drops from 20 minutes to 17 so a warmup fits inside the 20. Round
-- counts before today were over 20 minutes and are NOT directly comparable:
-- 8 rounds in 20 minutes is about 6.8 in 17.
-- ---------------------------------------------------------------------------
update public.workouts set
  total_seconds = 1440,
  mobility_note = $d$Mixed — Cindy trains everything, so nothing gets a long hold except the groin, which it doesn't touch.$d$,
  warmup = $j$[
    {"exercise_key":"cindy_warmup","name":"Cindy warmup","prescription":"2 pull-ups, 5 push-ups, 10 squats — twice through","cue":"Easy. It is a rehearsal.","start_remaining_seconds":1440}
  ]$j$::jsonb,
  main = $j$[
    {"exercise_key":"cindy","name":"CINDY","prescription":"17-minute AMRAP — 5 pull-ups, 10 push-ups, 15 air squats","cue":"Steady from the first round. Tap a round as you finish it.","counter":{"label":"rounds"},"start_remaining_seconds":1260}
  ]$j$::jsonb,
  finisher = $j$[]$j$::jsonb,
  mobility = $j$[
    {"exercise_key":"pigeon","name":"Pigeon","prescription":"45s/side","cue":"Square the hips forward.","start_remaining_seconds":240},
    {"exercise_key":"frog_stretch","name":"Frog stretch","prescription":"60s","cue":"Knees wide, back flat.","start_remaining_seconds":240},
    {"exercise_key":"hamstring_floss","name":"Hamstring floss","prescription":"30s/side","cue":"Slide, do not hold.","start_remaining_seconds":240}
  ]$j$::jsonb
where sort_order = 3;


-- ---------------------------------------------------------------------------
-- Session 4 -- Upper pull + hinge -- 24:00
-- ---------------------------------------------------------------------------
update public.workouts set
  total_seconds = 1440,
  mobility_note = $d$Quads, hip flexors and chest — none of them trained today.$d$,
  warmup = $j$[
    {"exercise_key":"dead_hang","name":"Dead hangs","prescription":"2×20s","cue":"Relax and breathe.","start_remaining_seconds":1440},
    {"exercise_key":"glute_bridge","name":"Glute bridges","prescription":"12","cue":"Squeeze at the top.","start_remaining_seconds":1440},
    {"exercise_key":"cat_cow","name":"Cat/cow","prescription":"8","cue":"One segment at a time.","start_remaining_seconds":1440}
  ]$j$::jsonb,
  main = $j$[
    {"exercise_key":"pull_ups","name":"Pull-ups","prescription":"4×AMRAP (leave 2 in reserve)","cue":"Full hang every rep.","rest":"40s between sets","start_remaining_seconds":1260},
    {"exercise_key":"bent_row","name":"Double KB bent row","prescription":"4×8 · Double 25s","cue":"Flat back, elbows close.","rest":"40s between sets","start_remaining_seconds":1020},
    {"exercise_key":"kb_swing","name":"KB swing","prescription":"4×15","cue":"15 a set, not per side. Single-arm phases: swap hands each set.","rest":"30s between sets","start_remaining_seconds":780},
    {"exercise_key":"kb_high_pull","name":"KB high pull","prescription":"3×8/side · 35","cue":"Hips drive, elbow leads. Strict upright rows stay at 25.","rest":"30s between sides","start_remaining_seconds":600}
  ]$j$::jsonb,
  finisher = $j$[
    {"exercise_key":"finisher_swing_pullup","name":"Finisher","prescription":"3 rounds — 20 swings, 5 pull-ups, 30s rest","cue":"Break the set, not the pace.","start_remaining_seconds":420,"variation_key":"kb_swing"}
  ]$j$::jsonb,
  mobility = $j$[
    {"exercise_key":"quad_hip_flexor_stretch","name":"Quad and hip flexor stretch","prescription":"60s/side","cue":"Tuck the tailbone first.","start_remaining_seconds":240},
    {"exercise_key":"deep_squat_rock","name":"Deep squat rock","prescription":"45s","cue":"Keep moving.","start_remaining_seconds":240},
    {"exercise_key":"doorway_pec_stretch","name":"Doorway pec stretch","prescription":"30s/side","cue":"Turn the chest away.","start_remaining_seconds":240}
  ]$j$::jsonb
where sort_order = 4;


-- ---------------------------------------------------------------------------
-- Session 5 -- Full body -- 24:00
-- ---------------------------------------------------------------------------
update public.workouts set
  total_seconds = 1440,
  mobility_note = $d$The catch-all — everything moderate, plus the groin work.$d$,
  warmup = $j$[
    {"exercise_key":"worlds_greatest_stretch","name":"World's greatest stretch","prescription":"4/side","cue":"Follow the hand with your eyes.","start_remaining_seconds":1440},
    {"exercise_key":"arm_circles","name":"Arm circles","prescription":"15 each direction","cue":"Slow and big.","start_remaining_seconds":1440}
  ]$j$::jsonb,
  main = $j$[
    {"exercise_key":"clean_and_press","name":"KB clean and press","prescription":"4×6/side · 35","cue":"Land it soft, then press.","rest":"40s between sides","start_remaining_seconds":1260},
    {"exercise_key":"front_rack_carry","name":"Front-rack carry","prescription":"3×40s · Double 25s","cue":"Ribs down, walk tall.","rest":"40s between carries","start_remaining_seconds":990},
    {"exercise_key":"get_up","name":"Turkish get-up","prescription":"2×2/side","cue":"Eyes on the bell.","rest":"20s between reps","start_remaining_seconds":810},
    {"exercise_key":"hollow_hold","name":"Hollow hold","prescription":"3×30s","cue":"Lower back flat.","rest":"20s between holds","start_remaining_seconds":600}
  ]$j$::jsonb,
  finisher = $j$[
    {"exercise_key":"finisher_snatch_pushup","name":"Finisher","prescription":"3 rounds — 8 snatches/side, 10 push-ups, 30s rest","cue":"Knees are fine. Stopping is not.","start_remaining_seconds":480,"variation_key":"kb_snatch"}
  ]$j$::jsonb,
  mobility = $j$[
    {"exercise_key":"couch_stretch","name":"Couch stretch","prescription":"45s/side","cue":"If the foot cramps, curl the toes under.","start_remaining_seconds":240},
    {"exercise_key":"seated_straddle","name":"Seated straddle","prescription":"60s","cue":"Long spine, hinge from the hips.","start_remaining_seconds":240},
    {"exercise_key":"frog_stretch","name":"Frog stretch","prescription":"45s","cue":"Knees wide, back flat.","start_remaining_seconds":240},
    {"exercise_key":"deep_squat_rock","name":"Deep squat rock","prescription":"45s","cue":"Keep moving.","start_remaining_seconds":240}
  ]$j$::jsonb
where sort_order = 5;
