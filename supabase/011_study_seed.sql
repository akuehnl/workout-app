-- ============================================================================
-- Scripture study: seed.
--
-- Run AFTER 010_study_schema.sql. Safe to re-run -- every insert upserts.
--
-- Months 1-24 (the whole arc), weeks 1-4 (month one only), and the twelve
-- sessions of those four weeks. Months 2-24 have no weeks on purpose.
--
-- MEMORY VERSES ARE REFERENCES ONLY. No verse text appears below, and none
-- should be added.
-- ============================================================================

do $guard$
begin
  if not exists (select 1 from information_schema.tables
                  where table_schema = 'public' and table_name = 'study_months') then
    raise exception using
      errcode = 'raise_exception',
      message = 'Nothing seeded -- the study tables do not exist.',
      hint    = 'Run supabase/010_study_schema.sql in this project first.';
  end if;
end
$guard$;


-- ---------------------------------------------------------------------------
-- The 24-month arc. has_gap marks a month whose Canon+ resource was listed
-- with a "(gap)" note; the suffix is lifted into the flag rather than left in
-- the text.
-- ---------------------------------------------------------------------------
insert into public.study_months
  (month_number, month_label, exam_section, focus, canon_resource, supplement, has_gap) values
  (1,  $d$Oct 2026$d$, $d$Bible$d$,       $d$Canon shape, OT book order, Genesis 1-11$d$,                       $d$Leithart, A House for My Name$d$,                                    null, false),
  (2,  $d$Nov 2026$d$, $d$Bible$d$,       $d$Pentateuch; Abraham to Moses; the Ten Commandments$d$,             $d$Jordan, Primeval Saints; Surveying the Text I$d$,                    null, false),
  (3,  $d$Dec 2026$d$, $d$Bible$d$,       $d$Joshua, Judges, Samuel; the united kingdom$d$,                     $d$Leithart, A Son to Me; Surveying the Text II$d$,                     null, false),
  (4,  $d$Jan 2027$d$, $d$Bible$d$,       $d$Kings, Chronicles, exile and return$d$,                            $d$Leithart, From Silence to Song$d$,                                   null, false),
  (5,  $d$Feb 2027$d$, $d$Bible$d$,       $d$Major and minor prophets, sorted by era$d$,                        $d$Surveying the Text, prophets volumes$d$,                             null, false),
  (6,  $d$Mar 2027$d$, $d$Bible$d$,       $d$Psalms and wisdom literature$d$,                                   $d$Surveying the Text, poetry volume; Leithart, Wise Words$d$,          null, false),
  (7,  $d$Apr 2027$d$, $d$Bible$d$,       $d$Gospels and Acts; dating of the Gospels$d$,                        $d$Leithart, The Four; Surveying the Text VI$d$,                        null, false),
  (8,  $d$May 2027$d$, $d$Bible$d$,       $d$Epistles and Revelation; theme, date, recipients$d$,               $d$Surveying the Text VII and VIII$d$,                                  null, false),
  (9,  $d$Jun 2027$d$, $d$Bibliology$d$,  $d$Text, manuscripts, translation$d$,                                 $d$Jordan, Today's Christian and the Church's Bible$d$,                 null, true),
  (10, $d$Jul 2027$d$, $d$Bibliology$d$,  $d$Creeds, councils, sola Scriptura$d$,                               $d$Wilson, Mere Fundamentalism$d$,                                      null, true),
  (11, $d$Aug 2027$d$, $d$Apologetics$d$, $d$Method; answering unbelief in practice$d$,                         $d$Wilson, Persuasions; Refuting the New Atheists$d$,                   null, false),
  (12, $d$Sep 2027$d$, $d$Theology$d$,    $d$God's attributes; angels and Satan$d$,                             $d$Wilson, Bound Only Once$d$,                                          null, false),
  (13, $d$Oct 2027$d$, $d$Theology$d$,    $d$Trinity: economic and ontological$d$,                              $d$Ministerial Conference audio$d$,                                     null, true),
  (14, $d$Nov 2027$d$, $d$Theology$d$,    $d$Christology; Chalcedon; two natures$d$,                            $d$Mere Fundamentalism, creed sections$d$,                              null, true),
  (15, $d$Dec 2027$d$, $d$Theology$d$,    $d$Covenant theology; Adam in Eden$d$,                                $d$Wilson, Reformed Is Not Enough$d$,                                   null, false),
  (16, $d$Jan 2028$d$, $d$Theology$d$,    $d$Atonement, justification, sanctification$d$,                       $d$Wilson, To the Church in Rome$d$,                                    null, false),
  (17, $d$Feb 2028$d$, $d$History$d$,     $d$The ancient church; Athanasius, Augustine$d$,                      $d$Wilson, A Pastoral Overview of Church History 1-2$d$,                null, false),
  (18, $d$Mar 2028$d$, $d$History$d$,     $d$The medieval church; Anselm, Wycliffe, Huss$d$,                    $d$Pastoral Overview 2-3; Sunshine, 32 Christians$d$,                   null, false),
  (19, $d$Apr 2028$d$, $d$History$d$,     $d$Reformation; offices, succession, miracles today$d$,               $d$Pastoral Overview 4-5; Working Toward Reformation$d$,                null, false),
  (20, $d$May 2028$d$, $d$Worship$d$,     $d$Regulative principle; covenant renewal; music$d$,                  $d$Wilson, Worship of the Saints$d$,                                    null, false),
  (21, $d$Jun 2028$d$, $d$Sacraments$d$,  $d$Baptism and the Supper$d$,                                         $d$Leithart, Blessed Are the Hungry; Wilson, Clean Water, Red Wine, Broken Bread$d$, null, false),
  (22, $d$Jul 2028$d$, $d$Eschatology$d$, $d$The kingdom; death, resurrection, hell$d$,                         $d$Wilson, Heaven Misplaced$d$,                                         null, true),
  (23, $d$Aug 2028$d$, $d$Eschatology$d$, $d$Olivet Discourse; millennial views; Revelation$d$,                 $d$Wilson, When the Man Comes Around; And It Came to Pass$d$,           null, false),
  (24, $d$Sep 2028$d$, $d$Ethics and Pastoral$d$, $d$Life, marriage, sexuality, war; preaching and counsel$d$,  $d$Wilson, Mere Christendom; Ministerial Conference audio$d$,           null, false)
on conflict (month_number) do update set
  month_label    = excluded.month_label,
  exam_section   = excluded.exam_section,
  focus          = excluded.focus,
  canon_resource = excluded.canon_resource,
  supplement     = excluded.supplement,
  has_gap        = excluded.has_gap;


-- ---------------------------------------------------------------------------
-- Weeks 1-4, month one. References only.
-- ---------------------------------------------------------------------------
insert into public.study_weeks
  (week_number, month_number, start_date, end_date, subject, memory_verse_ref, memory_verse_code) values
  (1, 1, date $d$2026-10-05$d$, date $d$2026-10-09$d$,
      $d$The shape of the canon and the opening chapters of Genesis$d$, $d$2 Timothy 3:16-17$d$, $d$MV01$d$),
  (2, 1, date $d$2026-10-12$d$, date $d$2026-10-16$d$,
      $d$The fall, the flood, and Babel$d$,                             $d$Genesis 3:15$d$,      $d$MV02$d$),
  (3, 1, date $d$2026-10-19$d$, date $d$2026-10-23$d$,
      $d$Canon structure and the call of Abram$d$,                      $d$2 Peter 1:20-21$d$,   $d$MV03$d$),
  (4, 1, date $d$2026-10-26$d$, date $d$2026-10-30$d$,
      $d$Month one review$d$,                                           $d$Hebrews 4:12$d$,      $d$MV04$d$)
on conflict (week_number) do update set
  month_number      = excluded.month_number,
  start_date        = excluded.start_date,
  end_date          = excluded.end_date,
  subject           = excluded.subject,
  memory_verse_ref  = excluded.memory_verse_ref,
  memory_verse_code = excluded.memory_verse_code;


-- ---------------------------------------------------------------------------
-- The twelve sessions. completed/completed_at/notes are deliberately NOT in
-- the upsert's update list -- re-running the seed must never wipe a check-off
-- or a note.
-- ---------------------------------------------------------------------------
insert into public.study_sessions (week_number, day, session_date, blocks) values

-- Week 1 ---------------------------------------------------------------------
(1, $d$monday$d$, date $d$2026-10-05$d$, $j$[
  {"time_range":"0:00–0:04","instruction":"Page one of the notebook. Date it, and write one sentence on why you are doing this."},
  {"time_range":"0:04–0:24","instruction":"Read Genesis 1–2 slowly, in print. List the six days down the page, one line each, with what was made. Then two or three lines on how chapter 2 relates to chapter 1."},
  {"time_range":"0:24–0:30","instruction":"Write out MV01 longhand, tagged in the margin. Create the \"Scripture Memory\" set in Quizlet and type it in: front = reference, back = full ESV text."}
]$j$::jsonb),

(1, $d$thursday$d$, date $d$2026-10-08$d$, $j$[
  {"time_range":"0:00–0:03","instruction":"Recite MV01 from memory. Check it."},
  {"time_range":"0:03–0:25","instruction":"Westminster Confession ch. 1, all ten paragraphs. One line per paragraph in your own words. Mark paragraphs 6 and 10."},
  {"time_range":"0:25–0:30","instruction":"Start a boxed list headed \"Scripture's authority — refs\". Seed from the proofs under WCF 1.1–1.4."}
]$j$::jsonb),

(1, $d$friday$d$, date $d$2026-10-09$d$, $j$[
  {"time_range":"0:00–0:20","instruction":"Genesis 1–2 synthesis. Half a page: your current reading, three reasons from the text. Then one line each on six-day creation, day-age, framework, analogical day."},
  {"time_range":"0:20–0:25","instruction":"Write the Old Testament books in order from memory. Check. Circle misses."},
  {"time_range":"0:25–0:30","instruction":"Write MV01 from memory, check, then three sentences summarizing the week."}
]$j$::jsonb),

-- Week 2 ---------------------------------------------------------------------
(2, $d$monday$d$, date $d$2026-10-12$d$, $j$[
  {"time_range":"0:00–0:05","instruction":"Recite MV01 cold, then check."},
  {"time_range":"0:05–0:25","instruction":"Read Genesis 3–6. Notebook: what changes between 2:25 and 3:7, in your own words; then the terms of the curse in 3:14–19, one line each."},
  {"time_range":"0:25–0:30","instruction":"Write MV02 longhand, tag it, add to Quizlet."}
]$j$::jsonb),

(2, $d$thursday$d$, date $d$2026-10-15$d$, $j$[
  {"time_range":"0:00–0:03","instruction":"Drill MV02."},
  {"time_range":"0:03–0:25","instruction":"WCF 4 (Of Creation) and WCF 6 (Of the Fall of Man). One line per paragraph."},
  {"time_range":"0:25–0:30","instruction":"Start a boxed list headed \"Covenant theology — refs\". Seed from the WCF 6 proofs."}
]$j$::jsonb),

(2, $d$friday$d$, date $d$2026-10-16$d$, $j$[
  {"time_range":"0:00–0:25","instruction":"Read Genesis 7–11. Notebook: trace the flood as de-creation and re-creation — what in chapters 8–9 echoes chapter 1? Then two lines on what Babel is doing in the story."},
  {"time_range":"0:25–0:30","instruction":"Write MV02 from memory, check, three-sentence week summary."}
]$j$::jsonb),

-- Week 3 ---------------------------------------------------------------------
(3, $d$monday$d$, date $d$2026-10-19$d$, $j$[
  {"time_range":"0:00–0:05","instruction":"Recite MV02 cold, then check."},
  {"time_range":"0:05–0:25","instruction":"Read Genesis 12 and 15. Notebook: the terms of the Abrahamic covenant, one line each; then what chapter 15 adds that chapter 12 did not say."},
  {"time_range":"0:25–0:30","instruction":"Write MV03 longhand, tag it, add to Quizlet."}
]$j$::jsonb),

(3, $d$thursday$d$, date $d$2026-10-22$d$, $j$[
  {"time_range":"0:00–0:03","instruction":"Drill MV03."},
  {"time_range":"0:03–0:25","instruction":"WCF 7 (Of God's Covenant with Man). One line per paragraph. Then Belgic Confession articles 2–7 — one line each."},
  {"time_range":"0:25–0:30","instruction":"Add to both boxed lists from this week's reading."}
]$j$::jsonb),

(3, $d$friday$d$, date $d$2026-10-23$d$, $j$[
  {"time_range":"0:00–0:20","instruction":"Write the Old Testament books grouped by division — Law, History, Poetry, Major Prophets, Minor Prophets — from memory. Check against the Bible. The divisions are the part worth holding; the exam assigns stretches, not the whole list."},
  {"time_range":"0:20–0:25","instruction":"Outline Genesis: theme, date, recipients, occasion. Four lines. Use the ESV Study Bible introduction as your framework."},
  {"time_range":"0:25–0:30","instruction":"Write MV03 from memory, check, three-sentence week summary."}
]$j$::jsonb),

-- Week 4 ---------------------------------------------------------------------
(4, $d$monday$d$, date $d$2026-10-26$d$, $j$[
  {"time_range":"0:00–0:05","instruction":"Recite MV03 cold, then check."},
  {"time_range":"0:05–0:25","instruction":"Reread Genesis 1–11 quickly, a chapter at a glance. Notebook: one line per chapter, eleven lines, what happens."},
  {"time_range":"0:25–0:30","instruction":"Write MV04 longhand, tag it, add to Quizlet."}
]$j$::jsonb),

(4, $d$thursday$d$, date $d$2026-10-29$d$, $j$[
  {"time_range":"0:00–0:03","instruction":"Drill MV04."},
  {"time_range":"0:03–0:25","instruction":"Reread WCF 1.6 and 1.10, slowly. Then write half a page: what the Confession claims Scripture is sufficient for, and what it does not claim."},
  {"time_range":"0:25–0:30","instruction":"Review all four MV cards in Quizlet in the reverse direction — text to reference."}
]$j$::jsonb),

(4, $d$friday$d$, date $d$2026-10-30$d$, $j$[
  {"time_range":"0:00–0:10","instruction":"Write the Old Testament books in order from memory, timed. Compare to week 3."},
  {"time_range":"0:10–0:25","instruction":"Month one review. Notebook: three paragraphs — what you now understand that you did not on Oct 5, what is still unclear, and what you want month two to settle."},
  {"time_range":"0:25–0:30","instruction":"Write MV04 from memory, check, three-sentence week summary."}
]$j$::jsonb)

on conflict (week_number, day) do update set
  session_date = excluded.session_date,
  blocks       = excluded.blocks;
