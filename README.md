# Workout

Private single-user workout web app. Five-session kettlebell program, read on a
phone browser. No login, no accounts.

Steps 1 and 2 of 3: the program is readable, the app hands you whichever
session you have gone longest without doing, runs you through it on a live
countdown one movement at a time, and logs every line with its own note.
Streaks is Step 3.

## Setup

### 1. A NEW Supabase project

This app needs **its own Supabase project**, separate from anything else you
run. Two of its table names (`settings`, `movements`) are generic enough to
collide with another app's schema.

`supabase/001_schema.sql` refuses to run if it finds tables with those names in
a database that isn't already this app's, so a wrong-project paste fails loudly
instead of quietly seeding into the other app's tables. If you see
`WRONG SUPABASE PROJECT`, that guard did its job -- make a new project.

1. supabase.com -> New project.
2. SQL Editor -> paste all of `supabase/001_schema.sql` -> Run.
3. New query -> paste all of `supabase/002_seed.sql` -> Run.
4. New query -> paste all of `supabase/003_log_schema.sql` -> Run.
5. New query -> paste all of `supabase/004_seed_history.sql` -> Run.
6. Project Settings -> API -> copy the **Project URL** and the **anon public**
   key.

Run them in order. Each file refuses to run if the one before it hasn't.

### 2. Local

```
cp .env.example .env      # then fill in the two values
npm install
npm run dev
```

The Program screen prints the connected project ref at the bottom, so you can
confirm on your phone that it's talking to the right database.

### 3. GitHub Pages

`base` in `vite.config.ts` is built from `REPO_NAME`, currently `workout-app`.
It must match your repository name exactly, case-sensitive. Change it there if
your repo is called something else.

Then in the repo:

- Settings -> Secrets and variables -> Actions -> add `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`.
- Settings -> Pages -> Source: **GitHub Actions**.
- Push to `main`.

The app lands at `https://<you>.github.io/<repo>/`.

Vite inlines `VITE_*` variables at build time, so the anon key is in the
published bundle. That's expected here. Keep the repo private.

## Notes

- Routing is `HashRouter` because Pages has no SPA path fallback.
- `start_remaining_seconds` is time **left** on the countdown when a block
  starts, not elapsed. Session 1 opens at 1800 and its last block starts at 300.
- The phase is computed from `settings.program_start`, never stored. It moves
  every 4 weeks on the clock regardless of how many sessions you've done.
- Design tokens live in the `@theme` block at the top of `src/index.css`.
- There is no schedule and no dates. The queue rule is one line: hand back the
  session gone longest without completion. Nothing is ever "missed".
- The runner clock is derived from a wall-clock timestamp rather than counted
  down by an interval, so backgrounding the tab or locking the phone doesn't
  make it drift.
- `localStorage` holds one key, `workout:run:v1`, as a crash-safety cache for
  an in-progress run. It is cleared the moment the session is saved. Supabase
  stays the source of truth.
