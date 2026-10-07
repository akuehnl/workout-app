import { supabase } from './supabase'

/* ---------------------------------------------------------------------------
   The Scripture study section. Independent of the workout half -- nothing here
   imports from log.ts, runner.ts or streaks.ts, and nothing there imports from
   here.

   MEMORY VERSES: references only. esvUrl builds a link from the reference so
   the text can be read on esv.org. No verse text is stored, fetched or
   bundled, and none should be added.
   --------------------------------------------------------------------------- */

export type StudyBlock = { time_range: string; instruction: string }

export type StudyMonth = {
  month_number: number
  month_label: string
  exam_section: string
  focus: string
  canon_resource: string
  supplement: string | null
  has_gap: boolean
}

export type StudyWeek = {
  week_number: number
  month_number: number
  start_date: string
  end_date: string
  subject: string
  /** A reference, e.g. "2 Timothy 3:16-17". Never the verse text. */
  memory_verse_ref: string
  memory_verse_code: string
}

export type StudyDay = 'monday' | 'thursday' | 'friday'

export type StudySession = {
  id: string
  week_number: number
  day: StudyDay
  session_date: string
  blocks: StudyBlock[]
  completed: boolean
  completed_at: string | null
  notes: string
}

/** The fixed weekly shape: Monday reads, Thursday confesses, Friday
 *  synthesises. */
export const SESSION_KIND: Record<StudyDay, string> = {
  monday: 'Scripture',
  thursday: 'Confession',
  friday: 'Synthesis',
}

export const DAY_LABEL: Record<StudyDay, string> = {
  monday: 'Monday',
  thursday: 'Thursday',
  friday: 'Friday',
}

/** esv.org takes the reference in the path with "+" for spaces:
 *  https://www.esv.org/2+Timothy+3:16-17/ */
export function esvUrl(reference: string): string {
  return `https://www.esv.org/${reference.trim().replace(/\s+/g, '+')}/`
}

// --- dates ------------------------------------------------------------------

const DAY_MS = 86_400_000
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Parse "YYYY-MM-DD" as LOCAL midnight. Not new Date(iso), which is UTC and
 *  reads as the previous day anywhere west of Greenwich. */
export function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Whole days from a to b. Positive means b is later. */
export function daysBetween(aIso: string, bIso: string): number {
  return Math.round((localDate(bIso).getTime() - localDate(aIso).getTime()) / DAY_MS)
}

/** "Oct 2026", matching the month_label format the arc is seeded with. */
export function monthLabelFor(iso: string): string {
  const d = localDate(iso)
  return `${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`
}

export function formatLongDate(iso: string): string {
  return localDate(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// --- loading ----------------------------------------------------------------

export type StudyData = {
  months: StudyMonth[]
  weeks: StudyWeek[]
  /** Oldest first. The whole plan is a few dozen rows, so it all comes down. */
  sessions: StudySession[]
  weekByNumber: Map<number, StudyWeek>
  monthByNumber: Map<number, StudyMonth>
  monthByLabel: Map<string, StudyMonth>
}

export async function fetchStudy(): Promise<StudyData> {
  const [m, w, s] = await Promise.all([
    supabase.from('study_months').select('*').order('month_number'),
    supabase.from('study_weeks').select('*').order('week_number'),
    supabase.from('study_sessions').select('*').order('session_date'),
  ])
  if (m.error) throw new Error(m.error.message)
  if (w.error) throw new Error(w.error.message)
  if (s.error) throw new Error(s.error.message)

  const months = (m.data ?? []) as StudyMonth[]
  const weeks = (w.data ?? []) as StudyWeek[]
  const sessions = (s.data ?? []) as StudySession[]

  return {
    months,
    weeks,
    sessions,
    weekByNumber: new Map(weeks.map((x) => [x.week_number, x])),
    monthByNumber: new Map(months.map((x) => [x.month_number, x])),
    monthByLabel: new Map(months.map((x) => [x.month_label, x])),
  }
}

// --- which session is up ----------------------------------------------------

/** The one rule: the earliest session not yet completed.
 *
 *  Sessions can be done early or late, so "what is up next" can't be "what is
 *  scheduled today" -- a Monday left unchecked stays at the front until it is
 *  done. Nothing is ever skipped past, which is the intent. */
export function nextIncomplete(sessions: StudySession[]): StudySession | null {
  let best: StudySession | null = null
  for (const s of sessions) {
    if (s.completed) continue
    if (!best || s.session_date < best.session_date) best = s
  }
  return best
}

export type Timing =
  | { status: 'overdue'; days: number }
  | { status: 'today' }
  | { status: 'upcoming'; days: number }

export function timingFor(session: StudySession, today: string = todayIso()): Timing {
  const delta = daysBetween(today, session.session_date)
  if (delta < 0) return { status: 'overdue', days: -delta }
  if (delta === 0) return { status: 'today' }
  return { status: 'upcoming', days: delta }
}

export function describeTiming(timing: Timing): string {
  if (timing.status === 'today') return 'Today'
  if (timing.status === 'overdue') {
    return timing.days === 1 ? 'Yesterday, not done' : `${timing.days} days ago, not done`
  }
  return timing.days === 1 ? 'Tomorrow' : `In ${timing.days} days`
}

/** Every session that is late and still unchecked, oldest first. Surfaced
 *  rather than hidden -- a missed Thursday should be visible. */
export function overdueSessions(
  sessions: StudySession[],
  today: string = todayIso(),
): StudySession[] {
  return sessions.filter((s) => !s.completed && s.session_date < today)
}

/** Position of a session in the full ordered list, for prev/next stepping. */
export function sessionIndex(sessions: StudySession[], id: string): number {
  return sessions.findIndex((s) => s.id === id)
}

// --- month coverage ---------------------------------------------------------

/** The arc row covering a date, whether or not it has weeks seeded. */
export function monthForDate(data: StudyData, iso: string): StudyMonth | null {
  return data.monthByLabel.get(monthLabelFor(iso)) ?? null
}

export function weeksForMonth(data: StudyData, monthNumber: number): StudyWeek[] {
  return data.weeks.filter((w) => w.month_number === monthNumber)
}

/** True when the plan simply hasn't been written out this far yet -- a state
 *  to render, not an error. */
export function monthHasNoAssignments(data: StudyData, iso: string): boolean {
  const month = monthForDate(data, iso)
  if (!month) return false
  return weeksForMonth(data, month.month_number).length === 0
}
