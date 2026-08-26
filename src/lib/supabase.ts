import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Set when the env vars are missing. The app renders a setup message instead
 *  of white-screening -- which is what throwing at import time would do, and
 *  the most likely time for that to happen is the first deploy to Pages. */
export const configError: string | null =
  !url || !anonKey
    ? 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. Locally: copy .env.example to .env and fill both in, then restart the dev server. On GitHub Pages: they have to be set as build-time variables in the workflow.'
    : null

/** The project ref out of the Supabase URL (the "abcdefgh" in
 *  https://abcdefgh.supabase.co). Shown small at the bottom of the Program
 *  screen so it's obvious at a glance which project the app is talking to --
 *  this app is meant to have its own, separate from anything else you run. */
export const projectRef: string = (() => {
  if (!url) return 'not configured'
  try {
    return new URL(url).hostname.split('.')[0] ?? 'unknown'
  } catch {
    return 'unparseable url'
  }
})()

// Anon key only, no auth, single user. Deliberate -- see the project notes.
// When config is missing we still build a client against a placeholder so that
// nothing throws at import; useProgram checks configError before using it.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder',
  { auth: { persistSession: false, autoRefreshToken: false } },
)
