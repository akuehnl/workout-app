-- ============================================================================
-- Step 1 seed data. Run 001_schema.sql first. Safe to re-run -- every insert
-- upserts, so pasting this again after an edit just refreshes the content.
--
-- All literals are dollar-quoted ($d$...$d$) so apostrophes need no escaping.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- PREFLIGHT: refuse to seed a project that is not this app's.
-- 001_schema.sql creates workout_app_marker; if it is missing, either you have
-- not run the schema file yet or you are in the wrong Supabase project.
-- ---------------------------------------------------------------------------
do $guard$
begin
  if not exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'workout_app_marker'
  ) then
    raise exception using
      errcode = 'raise_exception',
      message = 'Nothing seeded -- this project is not set up for the workout app.',
      hint    = 'Run supabase/001_schema.sql in THIS project first. If it refused, you are in the wrong project.';
  end if;
end
$guard$;

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------
insert into public.settings (id, program_start)
values (1, '2026-08-24')
on conflict (id) do update set program_start = excluded.program_start;


-- ---------------------------------------------------------------------------
-- movements
--
-- video_url is a YouTube SEARCH url for every movement rather than a specific
-- video id. Search urls do not rot; a hand-picked id can point at a deleted
-- video or, worse, the wrong movement. Swap in specific links you like.
-- ---------------------------------------------------------------------------
insert into public.movements (exercise_key, name, description, cue, video_url) values

-- warmup and mobility -------------------------------------------------------
($d$hip_switches_90_90$d$, $d$90/90 hip switches$d$,
 $d$Sit with both knees bent at right angles, one leg in front of you and one out to the side. Rotate your knees across to the other side without using your hands. Keep the chest tall and move slowly.$d$,
 $d$Hands off the floor.$d$, $d$https://www.youtube.com/results?search_query=90+90+hip+switch$d$),

($d$bodyweight_squat$d$, $d$Bodyweight squats$d$,
 $d$Feet about shoulder width with the toes turned out a little. Sit down between your heels and stand back up, keeping the whole foot on the floor the entire time.$d$,
 $d$Chest up, heels down.$d$, $d$https://www.youtube.com/results?search_query=bodyweight+squat+form$d$),

($d$ankle_rock$d$, $d$Ankle rocks$d$,
 $d$Half-kneeling with the front foot flat on the floor. Drive the knee forward past the toes while the heel stays down. Rock in and out slowly rather than pushing into a hard stop.$d$,
 $d$Heel stays glued down.$d$, $d$https://www.youtube.com/results?search_query=kneeling+ankle+mobility+rock$d$),

($d$scapular_push_up$d$, $d$Scapular push-ups$d$,
 $d$In a push-up position with the arms straight, let the chest sink between the shoulder blades, then push the upper back up toward the ceiling. The elbows never bend — all the movement is at the shoulder blades.$d$,
 $d$Arms stay locked.$d$, $d$https://www.youtube.com/results?search_query=scapular+push+up$d$),

($d$shoulder_pass_through$d$, $d$Towel shoulder pass-throughs$d$,
 $d$Hold a towel wide with both hands and take it from in front of your hips up over your head and behind you, keeping the arms straight. Go wider on the towel if it pinches anywhere.$d$,
 $d$Straight arms, go wide.$d$, $d$https://www.youtube.com/results?search_query=shoulder+pass+through+towel$d$),

($d$wrist_circles$d$, $d$Wrist circles$d$,
 $d$Interlace the fingers or make loose fists and circle the wrists slowly in both directions. A minute here is what keeps the front rack from hurting later.$d$,
 $d$Both directions, slow.$d$, $d$https://www.youtube.com/results?search_query=wrist+mobility+warm+up$d$),

($d$dead_hang$d$, $d$Dead hangs$d$,
 $d$Hang from the bar with the arms straight and the shoulders relaxed but not completely slack. Builds grip and decompresses the shoulders before you start pulling.$d$,
 $d$Relax and breathe.$d$, $d$https://www.youtube.com/results?search_query=dead+hang+pull+up+bar$d$),

($d$glute_bridge$d$, $d$Glute bridges$d$,
 $d$On your back with the feet flat and close to your hips. Push through the heels and lift the hips until the body is straight from knee to shoulder, squeezing the glutes hard at the top.$d$,
 $d$Squeeze at the top.$d$, $d$https://www.youtube.com/results?search_query=glute+bridge+form$d$),

($d$cat_cow$d$, $d$Cat/cow$d$,
 $d$On hands and knees, alternate rounding the back up and letting it sag down, with the head following the spine. Move one segment at a time instead of swinging through it.$d$,
 $d$Slow, one segment at a time.$d$, $d$https://www.youtube.com/results?search_query=cat+cow+stretch$d$),

($d$worlds_greatest_stretch$d$, $d$World's greatest stretch$d$,
 $d$Deep lunge with the same-side hand on the floor next to the front foot, then rotate the other arm up toward the ceiling and follow it with your eyes. It hits the hip, the hamstring and the upper back in one shape.$d$,
 $d$Follow the hand with your eyes.$d$, $d$https://www.youtube.com/results?search_query=worlds+greatest+stretch$d$),

($d$arm_circles$d$, $d$Arm circles$d$,
 $d$Big slow circles forward and then backward, getting gradually bigger. Thirty seconds each direction is plenty.$d$,
 $d$Slow and big.$d$, $d$https://www.youtube.com/results?search_query=arm+circles+warm+up$d$),

($d$thoracic_extension$d$, $d$Thoracic extension over a KB$d$,
 $d$Lie back over a kettlebell placed under your upper back with the arms overhead. Let the ribs open and the upper back drape over the bell. Move the bell an inch at a time to find the tight spots.$d$,
 $d$Breathe into it, do not force it.$d$, $d$https://www.youtube.com/results?search_query=thoracic+extension+over+kettlebell$d$),

($d$doorway_pec_stretch$d$, $d$Doorway pec stretch$d$,
 $d$Forearm flat on a doorframe with the elbow at about shoulder height, then step through and turn your chest away from that arm. You should feel it across the front of the chest, not inside the shoulder joint.$d$,
 $d$Turn the chest away.$d$, $d$https://www.youtube.com/results?search_query=doorway+pec+stretch$d$),

($d$lat_stretch$d$, $d$Lat stretch on doorframe$d$,
 $d$Grab a doorframe or bar at about chest height, sit your hips back and let the arm go long. Lean away from the arm slightly to catch the side of the back just under the armpit.$d$,
 $d$Hips back, arm long.$d$, $d$https://www.youtube.com/results?search_query=lat+stretch+doorway$d$),

($d$deep_squat_rock$d$, $d$Deep squat rock$d$,
 $d$Sit in the bottom of a squat and rock side to side and in slow circles rather than holding still. The movement is the point — keep the whole foot down and keep moving the whole time.$d$,
 $d$Keep moving. Do not hold still.$d$, $d$https://www.youtube.com/results?search_query=deep+squat+rocking+mobility$d$),

($d$couch_stretch$d$, $d$Couch stretch$d$,
 $d$Back foot elevated on a couch or against a wall, front foot planted, kneeling tall with the glute squeezed. If the foot cramps, let the toes curl under against the wall instead of pointing, and start at 45 seconds a side.$d$,
 $d$Squeeze the glute, stay tall.$d$, $d$https://www.youtube.com/results?search_query=couch+stretch$d$),

($d$hip_stretch_90_90$d$, $d$90/90 hip stretch$d$,
 $d$The same shape as the switches, but held. Sit tall over the front leg to feel the outside of that hip, then fold forward over it if you want more.$d$,
 $d$Sit tall before you lean.$d$, $d$https://www.youtube.com/results?search_query=90+90+hip+stretch$d$),

($d$hamstring_stretch$d$, $d$Hamstring stretch$d$,
 $d$Heel on the floor or a low step with that leg straight, then hinge forward from the hips with a flat back. If you round the back you will feel it in the wrong place.$d$,
 $d$Hinge, do not round.$d$, $d$https://www.youtube.com/results?search_query=standing+hamstring+stretch+hinge$d$),

($d$pigeon$d$, $d$Pigeon$d$,
 $d$Front shin across in front of you, back leg straight behind. Stay upright first, then fold forward over the front leg. A cushion under the front hip makes it usable if the hip is tight.$d$,
 $d$Square the hips forward.$d$, $d$https://www.youtube.com/results?search_query=pigeon+pose+hip+stretch$d$),

($d$hamstring_floss$d$, $d$Hamstring floss$d$,
 $d$On your back with one leg up, alternately straighten the knee and point the toe, then bend the knee and pull the toe back. You are sliding the nerve rather than holding a stretch, so keep it moving.$d$,
 $d$Slide, do not hold.$d$, $d$https://www.youtube.com/results?search_query=hamstring+nerve+floss$d$),

($d$thoracic_rotation$d$, $d$Thoracic rotations$d$,
 $d$Side-lying with the knees stacked and bent and both arms out in front of you. Open the top arm across and behind you and let the chest follow, while the knees stay stacked.$d$,
 $d$Knees stay put.$d$, $d$https://www.youtube.com/results?search_query=side+lying+thoracic+rotation$d$),

($d$quad_hip_flexor_stretch$d$, $d$Quad and hip flexor stretch$d$,
 $d$Half-kneeling with the back foot pulled toward the glute, either by hand or against a wall. Tuck the tailbone under first — that is where the hip flexor stretch actually comes from.$d$,
 $d$Tuck the tailbone first.$d$, $d$https://www.youtube.com/results?search_query=kneeling+hip+flexor+quad+stretch$d$),

($d$seated_straddle$d$, $d$Seated straddle$d$,
 $d$Sit with the legs wide and the toes pointing up, then hinge forward from the hips with a long spine. Sitting on the edge of a cushion makes it much easier to hinge instead of round.$d$,
 $d$Long spine, hinge from the hips.$d$, $d$https://www.youtube.com/results?search_query=seated+straddle+stretch$d$),

-- main movements ------------------------------------------------------------
($d$front_squat$d$, $d$Double KB front squat$d$,
 $d$Both bells in the front rack with the elbows tucked in tight. Squat as deep as you can while keeping the torso upright, then drive back up through the whole foot.$d$,
 $d$Elbows in, torso tall.$d$, $d$https://www.youtube.com/results?search_query=double+kettlebell+front+squat$d$),

($d$front_rack$d$, $d$Front rack$d$,
 $d$Bells resting on the backs of the forearms, elbows tucked tight to the ribs, wrists straight. If the wrists bend back, the elbows are too low.$d$,
 $d$Straight wrists. Low elbows are the fault.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+front+rack+position$d$),

($d$reverse_lunge$d$, $d$KB reverse lunge$d$,
 $d$Step one foot straight back and lower until the back knee touches the floor lightly, then push through the front heel to stand. Stepping back rather than forward keeps the load off the front knee.$d$,
 $d$Back knee kisses the floor.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+reverse+lunge$d$),

($d$deficit_lunge$d$, $d$Deficit lunge$d$,
 $d$A reverse lunge with the front foot up on a plate or a step so the back knee travels further down. Same movement, more range at the hip.$d$,
 $d$Deeper, not faster.$d$, $d$https://www.youtube.com/results?search_query=deficit+reverse+lunge$d$),

($d$single_leg_rdl$d$, $d$Single-leg RDL$d$,
 $d$Stand on one leg with the bell in the opposite hand. Hinge at the hip and let the back leg rise until the torso is near parallel to the floor, then stand. Slow beats heavy — it is a balance movement first.$d$,
 $d$Hips square, back leg long.$d$, $d$https://www.youtube.com/results?search_query=single+leg+romanian+deadlift+kettlebell$d$),

($d$goblet_squat_hold$d$, $d$Goblet squat hold$d$,
 $d$Hold one bell at chest height and sit in the bottom of a squat. Use your elbows against the inside of the knees to push the knees out and sit a little taller.$d$,
 $d$Sit tall, breathe.$d$, $d$https://www.youtube.com/results?search_query=goblet+squat+hold$d$),

($d$dips$d$, $d$Dips$d$,
 $d$Support yourself on the bars with the arms locked out, then lower until the upper arms are about parallel to the floor and press back up. Keep the shoulders pulled down away from the ears.$d$,
 $d$Lower under control.$d$, $d$https://www.youtube.com/results?search_query=parallel+bar+dips+form$d$),

($d$overhead_press$d$, $d$Double KB overhead press$d$,
 $d$Start in the front rack and press both bells straight overhead until the arms lock out and the biceps are near your ears. Squeeze the glutes so the lower back does not arch.$d$,
 $d$Ribs down, full lockout.$d$, $d$https://www.youtube.com/results?search_query=double+kettlebell+overhead+press$d$),

($d$push_ups$d$, $d$Push-ups$d$,
 $d$Hands under the shoulders and the body in one straight line from head to heels. Lower until the chest is just off the floor with the elbows tracking back at about 45 degrees.$d$,
 $d$One straight line.$d$, $d$https://www.youtube.com/results?search_query=push+up+proper+form$d$),

($d$archer_push_up$d$, $d$Archer push-up$d$,
 $d$Wide hands, and lower toward one hand while the other arm stays straight and slides out to the side. It is half a one-arm push-up, and the straight arm can help as much as you need it to.$d$,
 $d$The straight arm helps as needed.$d$, $d$https://www.youtube.com/results?search_query=archer+push+up$d$),

($d$single_arm_bent_row$d$, $d$Single-arm KB bent row$d$,
 $d$Hinge forward with a flat back and brace the free hand on a bench or your knee. Pull the bell to your hip with the elbow close to the ribs, then lower it all the way down.$d$,
 $d$Elbow to the hip.$d$, $d$https://www.youtube.com/results?search_query=single+arm+kettlebell+row$d$),

($d$bent_row$d$, $d$Double KB bent row$d$,
 $d$Hinge forward with a flat back and both bells hanging under you. Pull both to your hips with the elbows close, pause for a beat, and lower under control.$d$,
 $d$Flat back, elbows close.$d$, $d$https://www.youtube.com/results?search_query=double+kettlebell+bent+over+row$d$),

($d$pull_ups$d$, $d$Pull-ups$d$,
 $d$Hang with the arms straight, pull until the chin clears the bar, then lower all the way back to a full hang. Leave two reps in reserve on every set here — the goal is quality volume, not failure.$d$,
 $d$Full hang every rep.$d$, $d$https://www.youtube.com/results?search_query=pull+up+proper+form$d$),

($d$kb_swing$d$, $d$KB swing$d$,
 $d$A hinge, not a squat, and not a front raise. Hike the bell back between your legs and snap the hips forward so it floats up to about chest height on its own.$d$,
 $d$Snap the hips. Arms are ropes.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+swing+hardstyle+form$d$),

($d$kb_high_pull$d$, $d$KB high pull$d$,
 $d$Like a swing, but as the bell floats up you pull it to chest height with the elbow leading and the bell staying close to you. The hips still do the work; the arm only steers.$d$,
 $d$Elbow leads, hips drive.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+high+pull$d$),

($d$kb_snatch$d$, $d$KB snatch$d$,
 $d$One motion from a swing to locked out overhead. Swing the bell back, drive with the hips, and as it rises pull it close to the body and punch your hand through so it lands softly on the back of the forearm — no banging the wrist.$d$,
 $d$Punch through. Do not let it flip over.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+snatch+technique$d$),

($d$clean_and_press$d$, $d$KB clean and press$d$,
 $d$Swing the bell back, then guide it up into the front rack so it lands softly on the forearm rather than flipping onto it. From the rack, press it straight overhead and lock out.$d$,
 $d$Land it soft, then press.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+clean+and+press$d$),

($d$front_rack_carry$d$, $d$Front-rack carry$d$,
 $d$Hold the bells in the front rack and walk. Ribs down, glutes tight, breathing shallow through a braced trunk — it is a core exercise that happens to involve walking.$d$,
 $d$Ribs down, walk tall.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+front+rack+carry$d$),

($d$get_up$d$, $d$Turkish get-up$d$,
 $d$Lie on your back, press a bell straight overhead, and stand up while keeping the arm locked out the whole way. About 30 seconds a rep — slow is the point. Keep your eyes on the bell until you are standing.$d$,
 $d$Eyes on the bell.$d$, $d$https://www.youtube.com/results?search_query=turkish+get+up+kettlebell+step+by+step$d$),

($d$hollow_hold$d$, $d$Hollow hold$d$,
 $d$On your back with the lower back pressed flat into the floor, arms and legs lifted a few inches. If the lower back comes off the floor, raise the legs higher until it does not.$d$,
 $d$Lower back flat, always.$d$, $d$https://www.youtube.com/results?search_query=hollow+body+hold$d$),

-- Cindy and the finishers ---------------------------------------------------
($d$cindy_warmup$d$, $d$Cindy warmup$d$,
 $d$Two easy rounds of the same three movements, just to get the pattern in and the shoulders warm. Nowhere near failure — this is a rehearsal, not a set.$d$,
 $d$Easy. It is a rehearsal.$d$, $d$https://www.youtube.com/results?search_query=cindy+wod+warm+up$d$),

($d$cindy$d$, $d$Cindy$d$,
 $d$Twenty minutes of as many rounds as possible: 5 pull-ups, 10 push-ups, 15 air squats. Pick a pace you can hold for the full twenty minutes rather than sprinting the first five. Write the round count in the notes — that number is the progression.$d$,
 $d$Steady from the first round.$d$, $d$https://www.youtube.com/results?search_query=cindy+crossfit+workout+strategy$d$),

($d$finisher_snatch_squat$d$, $d$Finisher — snatches and squats$d$,
 $d$One hard continuous block, not sets with rest. Hold a pace you can keep for all four rounds, and treat the 30 seconds between rounds as real rest rather than a reset.$d$,
 $d$One block, steady pace.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+snatch+technique$d$),

($d$finisher_highpull_pushup$d$, $d$Finisher — high pulls and push-ups$d$,
 $d$One hard continuous block rather than sets with rest. If the push-ups fall apart, drop to your knees and keep the pace instead of stopping.$d$,
 $d$Keep the pace.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+high+pull$d$),

($d$finisher_swing_pullup$d$, $d$Finisher — swings and pull-ups$d$,
 $d$One hard continuous block rather than sets with rest. Break the swings into chunks if you have to, but keep coming straight back to the bar.$d$,
 $d$Break the set, not the pace.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+swing+pull+up+conditioning$d$),

($d$finisher_snatch_pushup$d$, $d$Finisher — snatches and push-ups$d$,
 $d$One hard continuous block rather than sets with rest. Push-ups on the knees is a fine answer if there is nothing left in the arms.$d$,
 $d$Knees are fine. Stopping is not.$d$, $d$https://www.youtube.com/results?search_query=kettlebell+snatch+conditioning+finisher$d$)

on conflict (exercise_key) do update set
  name        = excluded.name,
  description = excluded.description,
  cue         = excluded.cue,
  video_url   = excluded.video_url;


-- ---------------------------------------------------------------------------
-- program_phases
--
-- Weights are fixed (two 25s, one 35), so progression is harder variations,
-- not more load. Cindy is absent on purpose -- its round count is its
-- progression.
-- ---------------------------------------------------------------------------
insert into public.program_phases (phase, exercise_key, variation) values
  (1, $d$front_squat$d$,    $d$Double 25s$d$),
  (2, $d$front_squat$d$,    $d$Double 25s, 3s eccentric$d$),
  (3, $d$front_squat$d$,    $d$Double 25s, 2s pause in the hole$d$),
  (4, $d$front_squat$d$,    $d$35 + 25 offset$d$),

  (1, $d$reverse_lunge$d$,  $d$Goblet 35$d$),
  (2, $d$reverse_lunge$d$,  $d$Double 25s$d$),
  (3, $d$reverse_lunge$d$,  $d$Deficit, double 25s$d$),
  (4, $d$reverse_lunge$d$,  $d$Rear-foot elevated, 35$d$),

  (1, $d$overhead_press$d$, $d$Double 25s$d$),
  (2, $d$overhead_press$d$, $d$35 single-arm$d$),
  (3, $d$overhead_press$d$, $d$35 single-arm, 3s eccentric$d$),
  (4, $d$overhead_press$d$, $d$Half-kneeling 35, strict$d$),

  (1, $d$dips$d$,           $d$Bodyweight$d$),
  (2, $d$dips$d$,           $d$3s eccentric$d$),
  (3, $d$dips$d$,           $d$Weighted (KB between the feet)$d$),
  (4, $d$dips$d$,           $d$Weighted + bottom pause$d$),

  (1, $d$push_ups$d$,       $d$Standard$d$),
  (2, $d$push_ups$d$,       $d$Feet elevated$d$),
  (3, $d$push_ups$d$,       $d$Archer$d$),
  (4, $d$push_ups$d$,       $d$Deficit archer$d$),

  (1, $d$pull_ups$d$,       $d$Standard$d$),
  (2, $d$pull_ups$d$,       $d$3s eccentric$d$),
  (3, $d$pull_ups$d$,       $d$Weighted (25 between the feet)$d$),
  (4, $d$pull_ups$d$,       $d$Weighted + top pause$d$),

  (1, $d$kb_swing$d$,       $d$Two-hand 35$d$),
  (2, $d$kb_swing$d$,       $d$Single-arm 25$d$),
  (3, $d$kb_swing$d$,       $d$Single-arm 35$d$),
  (4, $d$kb_swing$d$,       $d$Double 25s$d$),

  (1, $d$kb_snatch$d$,      $d$25$d$),
  (2, $d$kb_snatch$d$,      $d$35$d$),
  (3, $d$kb_snatch$d$,      $d$35, unbroken sets$d$),
  (4, $d$kb_snatch$d$,      $d$35, 12/side$d$),

  (1, $d$get_up$d$,         $d$Half get-up 25$d$),
  (2, $d$get_up$d$,         $d$Full 25$d$),
  (3, $d$get_up$d$,         $d$Full 35$d$),
  (4, $d$get_up$d$,         $d$Full 35, 3s pauses$d$)
on conflict (phase, exercise_key) do update set variation = excluded.variation;


-- ---------------------------------------------------------------------------
-- workouts
--
-- start_remaining_seconds is time LEFT on the countdown when the block starts.
-- Blocks that run together (the three warmup drills, the four mobility pieces)
-- share the block's stamp on purpose -- the stamps in the program are per
-- block, not per drill.
-- ---------------------------------------------------------------------------
insert into public.workouts
  (sort_order, name, focus, total_seconds, mobility_note, warmup, main, finisher, mobility) values

-- Session 1 -- Lower body (squat pattern) -- 30:00 -------------------------
(1, $d$Lower body$d$, $d$Squat pattern$d$, 1800,
 $d$Upper-body bias — the legs just worked. Hips and knees stay in as movement, not long holds.$d$,
 $j$[
   {"exercise_key":"hip_switches_90_90","name":"90/90 hip switches","prescription":"8/side","cue":"Hands off the floor.","start_remaining_seconds":1800},
   {"exercise_key":"bodyweight_squat","name":"Bodyweight squats","prescription":"15","cue":"Chest up, heels down.","start_remaining_seconds":1800},
   {"exercise_key":"ankle_rock","name":"Ankle rocks","prescription":"10/side","cue":"Heel stays glued down.","start_remaining_seconds":1800}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"front_squat","name":"Double KB front squat","prescription":"4×8","cue":"Elbows in, torso tall.","start_remaining_seconds":1620},
   {"exercise_key":"reverse_lunge","name":"KB reverse lunge","prescription":"3×8/side","cue":"Back knee kisses the floor.","start_remaining_seconds":1260},
   {"exercise_key":"single_leg_rdl","name":"Single-leg RDL","prescription":"3×8/side","cue":"Hips square, back leg long.","start_remaining_seconds":960},
   {"exercise_key":"goblet_squat_hold","name":"Goblet squat hold","prescription":"2×30s","cue":"Sit tall, breathe.","start_remaining_seconds":720}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"finisher_snatch_squat","name":"Finisher","prescription":"4 rounds — 8 snatches/side, 10 squats, 30s rest","cue":"One block, steady pace.","start_remaining_seconds":600,"variation_key":"kb_snatch"}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"thoracic_extension","name":"Thoracic extension over a KB","prescription":"60s","cue":"Breathe into it.","start_remaining_seconds":300},
   {"exercise_key":"doorway_pec_stretch","name":"Doorway pec stretch","prescription":"45s/side","cue":"Turn the chest away.","start_remaining_seconds":300},
   {"exercise_key":"lat_stretch","name":"Lat stretch on doorframe","prescription":"45s/side","cue":"Hips back, arm long.","start_remaining_seconds":300},
   {"exercise_key":"deep_squat_rock","name":"Deep squat rock","prescription":"90s","cue":"Keep moving.","start_remaining_seconds":300}
 ]$j$::jsonb),

-- Session 2 -- Upper push -- 28:00 -----------------------------------------
(2, $d$Upper push$d$, $d$Press and dip$d$, 1680,
 $d$Lower-body bias — this is a push day, so the legs get the deep holds.$d$,
 $j$[
   {"exercise_key":"scapular_push_up","name":"Scapular push-ups","prescription":"10","cue":"Arms stay locked.","start_remaining_seconds":1680},
   {"exercise_key":"shoulder_pass_through","name":"Towel shoulder pass-throughs","prescription":"10","cue":"Straight arms, go wide.","start_remaining_seconds":1680},
   {"exercise_key":"wrist_circles","name":"Wrist circles","prescription":"10 each direction","cue":"Slow.","start_remaining_seconds":1680}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"dips","name":"Dips","prescription":"4×8","cue":"Lower under control.","start_remaining_seconds":1500},
   {"exercise_key":"overhead_press","name":"Double KB overhead press","prescription":"4×6","cue":"Ribs down, full lockout.","start_remaining_seconds":1200},
   {"exercise_key":"push_ups","name":"Push-ups","prescription":"3×10","cue":"One straight line.","start_remaining_seconds":900},
   {"exercise_key":"single_arm_bent_row","name":"Single-arm KB bent row","prescription":"3×8/side (35)","cue":"Elbow to the hip.","start_remaining_seconds":720}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"finisher_highpull_pushup","name":"Finisher","prescription":"4 rounds — 10 high pulls/side, 10 push-ups, 30s rest","cue":"Keep the pace.","start_remaining_seconds":540,"variation_key":null}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"couch_stretch","name":"Couch stretch","prescription":"90s/side","cue":"If the foot cramps, curl the toes under and start at 45s.","start_remaining_seconds":360},
   {"exercise_key":"hip_stretch_90_90","name":"90/90 hip stretch","prescription":"45s/side","cue":"Sit tall before you lean.","start_remaining_seconds":360},
   {"exercise_key":"hamstring_stretch","name":"Hamstring stretch","prescription":"45s/side","cue":"Hinge, do not round.","start_remaining_seconds":360}
 ]$j$::jsonb),

-- Session 3 -- Cindy -- 28:00 ----------------------------------------------
(3, $d$Cindy$d$, $d$Conditioning$d$, 1680,
 $d$Mixed — Cindy trains everything, so nothing gets a long hold.$d$,
 $j$[
   {"exercise_key":"cindy_warmup","name":"Cindy warmup","prescription":"2 pull-ups, 5 push-ups, 10 squats — twice through","cue":"Easy. It is a rehearsal.","start_remaining_seconds":1680}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"cindy","name":"CINDY","prescription":"20-minute AMRAP — 5 pull-ups, 10 push-ups, 15 air squats","cue":"Round count goes in the notes.","start_remaining_seconds":1440}
 ]$j$::jsonb,
 $j$[]$j$::jsonb,
 $j$[
   {"exercise_key":"pigeon","name":"Pigeon","prescription":"45s/side","cue":"Square the hips forward.","start_remaining_seconds":240},
   {"exercise_key":"hamstring_floss","name":"Hamstring floss","prescription":"45s/side","cue":"Slide, do not hold.","start_remaining_seconds":240},
   {"exercise_key":"thoracic_rotation","name":"Thoracic rotations","prescription":"10/side","cue":"Knees stay put.","start_remaining_seconds":240}
 ]$j$::jsonb),

-- Session 4 -- Upper pull + hinge -- 28:00 ---------------------------------
(4, $d$Upper pull + hinge$d$, $d$Pull and hinge$d$, 1680,
 $d$Quads, hip flexors and chest — none of them trained today.$d$,
 $j$[
   {"exercise_key":"dead_hang","name":"Dead hangs","prescription":"2×20s","cue":"Relax and breathe.","start_remaining_seconds":1680},
   {"exercise_key":"glute_bridge","name":"Glute bridges","prescription":"15","cue":"Squeeze at the top.","start_remaining_seconds":1680},
   {"exercise_key":"cat_cow","name":"Cat/cow","prescription":"10","cue":"One segment at a time.","start_remaining_seconds":1680}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"pull_ups","name":"Pull-ups","prescription":"4×AMRAP (leave 2 in reserve)","cue":"Full hang every rep.","start_remaining_seconds":1500},
   {"exercise_key":"bent_row","name":"Double KB bent row","prescription":"4×8","cue":"Flat back, elbows close.","start_remaining_seconds":1200},
   {"exercise_key":"kb_swing","name":"KB swing","prescription":"5×15","cue":"Snap the hips. Arms are ropes.","start_remaining_seconds":960},
   {"exercise_key":"kb_high_pull","name":"KB high pull","prescription":"3×8","cue":"Elbow leads, hips drive.","start_remaining_seconds":660}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"finisher_swing_pullup","name":"Finisher","prescription":"3 rounds — 20 swings, 5 pull-ups, 30s rest","cue":"Break the set, not the pace.","start_remaining_seconds":480,"variation_key":"kb_swing"}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"quad_hip_flexor_stretch","name":"Quad and hip flexor stretch","prescription":"90s/side","cue":"Tuck the tailbone first.","start_remaining_seconds":300},
   {"exercise_key":"deep_squat_rock","name":"Deep squat rock","prescription":"60s","cue":"Keep moving.","start_remaining_seconds":300},
   {"exercise_key":"doorway_pec_stretch","name":"Doorway pec stretch","prescription":"30s/side","cue":"Turn the chest away.","start_remaining_seconds":300}
 ]$j$::jsonb),

-- Session 5 -- Full body + long mobility -- 30:00 --------------------------
(5, $d$Full body$d$, $d$Full body + long mobility$d$, 1800,
 $d$The catch-all — everything moderate.$d$,
 $j$[
   {"exercise_key":"worlds_greatest_stretch","name":"World's greatest stretch","prescription":"5/side","cue":"Follow the hand with your eyes.","start_remaining_seconds":1800},
   {"exercise_key":"arm_circles","name":"Arm circles","prescription":"20 each direction","cue":"Slow and big.","start_remaining_seconds":1800}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"clean_and_press","name":"KB clean and press","prescription":"4×6/side","cue":"Land it soft, then press.","start_remaining_seconds":1620},
   {"exercise_key":"front_rack_carry","name":"Front-rack carry","prescription":"3×40s","cue":"Ribs down, walk tall.","start_remaining_seconds":1260},
   {"exercise_key":"get_up","name":"Turkish get-up","prescription":"3×2/side","cue":"Eyes on the bell.","start_remaining_seconds":1020},
   {"exercise_key":"hollow_hold","name":"Hollow hold","prescription":"3×30s","cue":"Lower back flat.","start_remaining_seconds":720}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"finisher_snatch_pushup","name":"Finisher","prescription":"4 rounds — 8 snatches/side, 10 push-ups, 30s rest","cue":"Knees are fine. Stopping is not.","start_remaining_seconds":600,"variation_key":"kb_snatch"}
 ]$j$::jsonb,
 $j$[
   {"exercise_key":"couch_stretch","name":"Couch stretch","prescription":"60s/side","cue":"If the foot cramps, curl the toes under.","start_remaining_seconds":360},
   {"exercise_key":"pigeon","name":"Pigeon","prescription":"60s/side","cue":"Square the hips forward.","start_remaining_seconds":360},
   {"exercise_key":"seated_straddle","name":"Seated straddle","prescription":"60s","cue":"Long spine, hinge from the hips.","start_remaining_seconds":360},
   {"exercise_key":"deep_squat_rock","name":"Deep squat rock","prescription":"60s","cue":"Keep moving.","start_remaining_seconds":360}
 ]$j$::jsonb)

on conflict (sort_order) do update set
  name          = excluded.name,
  focus         = excluded.focus,
  total_seconds = excluded.total_seconds,
  mobility_note = excluded.mobility_note,
  warmup        = excluded.warmup,
  main          = excluded.main,
  finisher      = excluded.finisher,
  mobility      = excluded.mobility;
