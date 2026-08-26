# Workout

Private single-user workout web app. Five-session kettlebell program, read on a
phone browser. No login, no accounts.

Step 1 of 3: the shell deploys, opens straight to the app, and the whole
program is readable. The runner, the log and streaks come in Steps 2 and 3.

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
4. Project Settings -> API -> copy the **Project URL** and the **anon public**
   key.

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
