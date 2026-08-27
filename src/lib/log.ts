import { supabase } from './supabase'
import { SECTIONS, type Block, type SectionName, type Workout } from './types'

export type TrainingLog = {
  id: string
  date: string
  /** Null for a session done outside the program ("went climbing"). Those
   *  count toward the week but say nothing about which session is up next. */
  workout_id: string | null
  /** The name of an ad-hoc session. Null for one of the five. */
  title: string | null
  phase: number
  started_at: string | null
  completed_at: string | null
  /** Null for sessions that were never run on a clock. */
  total_seconds: number | null
  session_notes: string
}

export type TrainingLogItem = {
  id: string
  training_log_id: string
  exercise_key: string
  sort_order: number
  checked: boolean
  split_seconds: number | null
  notes: string
}

/** A block plus where it sits in the flattened session. */
export type FlatBlock = Block & { section: SectionName; ord: number }

/** Flatten a workout to the single ordered list the runner walks and the log
 *  stores: warmup, then main, then finisher, then mobility.
 *
 *  `ord` is 1-based and MUST match the ordinality the seed SQL generates from
 *  `warmup || main || finisher || mobility`, or seeded rows and app-written
 *  rows would disagree about position. SECTIONS is declared in that order. */
export function flattenWorkout(workout: Workout): FlatBlock[] {
  const out: FlatBlock[] = []
  let ord = 1
  for (const { key } of SECTIONS) {
    for (const block of workout[key]) {
      out.push({ ...block, section: key, ord: ord++ })
    }
  }
  return out
}

/** workout_id -> the most recent date it was completed. */
export function lastDoneByWorkout(logs: TrainingLog[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const log of logs) {
    if (!log.workout_id) continue // ad-hoc: belongs to no session in the program
    const current = map.get(log.workout_id)
    if (!current || log.date > current) map.set(log.workout_id, log.date)
  }
  return map
}

/** The one queue rule: hand back whichever session has gone longest without
 *  being completed. A session never done sorts ahead of every session that has
 *  been. Ties break on sort_order.
 *
 *  This is the whole scheduler. Skipped sessions, extra sessions and time off
 *  all fall out of it -- there is nothing to miss and nothing to make up. */
export function nextUp(workouts: Workout[], logs: TrainingLog[]): Workout | null {
  if (workouts.length === 0) return null
  const lastDone = lastDoneByWorkout(logs)
  return [...workouts].sort((a, b) => {
    // '' sorts before any ISO date, which is exactly "never done comes first"
    const da = lastDone.get(a.id) ?? ''
    const db = lastDone.get(b.id) ?? ''
    if (da !== db) return da < db ? -1 : 1
    return a.sort_order - b.sort_order
  })[0]!
}

/** Cindy's round count lives in the notes on its own item -- that number is
 *  the progression. Pull the first number out of each and keep the best. */
export function bestCindyRounds(items: TrainingLogItem[]): number | null {
  let best: number | null = null
  for (const item of items) {
    if (item.exercise_key !== 'cindy') continue
    const match = item.notes.match(/\d+(?:\.\d+)?/)
    if (!match) continue
    const n = Number(match[0])
    if (Number.isFinite(n) && (best === null || n > best)) best = n
  }
  return best
}

export type LogHistory = {
  logs: TrainingLog[]
  /** training_log_id -> its items, already in sort_order. */
  itemsByLog: Map<string, TrainingLogItem[]>
  allItems: TrainingLogItem[]
}

export async function fetchHistory(): Promise<LogHistory> {
  const [l, i] = await Promise.all([
    supabase.from('training_log').select('*').order('date', { ascending: false }),
    supabase.from('training_log_items').select('*').order('sort_order'),
  ])
  if (l.error) throw new Error(l.error.message)
  if (i.error) throw new Error(i.error.message)

  const logs = (l.data ?? []) as TrainingLog[]
  const allItems = (i.data ?? []) as TrainingLogItem[]
  const itemsByLog = new Map<string, TrainingLogItem[]>()
  for (const item of allItems) {
    const list = itemsByLog.get(item.training_log_id)
    if (list) list.push(item)
    else itemsByLog.set(item.training_log_id, [item])
  }
  return { logs, itemsByLog, allItems }
}

export type SaveItem = {
  exercise_key: string
  sort_order: number
  checked: boolean
  split_seconds: number | null
  notes: string
}

/** Write a finished run. The log row goes in first so its id can key the
 *  items; if the item insert fails the log row is removed again rather than
 *  left behind as a session with no lines. */
export async function saveRun(input: {
  date: string
  workoutId: string
  phase: number
  startedAt: string
  completedAt: string
  totalSeconds: number
  sessionNotes: string
  items: SaveItem[]
}): Promise<string> {
  const { data, error } = await supabase
    .from('training_log')
    .insert({
      date: input.date,
      workout_id: input.workoutId,
      phase: input.phase,
      started_at: input.startedAt,
      completed_at: input.completedAt,
      total_seconds: input.totalSeconds,
      session_notes: input.sessionNotes,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  const logId = data.id as string

  const { error: itemsError } = await supabase.from('training_log_items').insert(
    input.items.map((item) => ({
      training_log_id: logId,
      exercise_key: item.exercise_key,
      sort_order: item.sort_order,
      checked: item.checked,
      split_seconds: item.split_seconds,
      notes: item.notes,
    })),
  )

  if (itemsError) {
    await supabase.from('training_log').delete().eq('id', logId)
    throw new Error(itemsError.message)
  }

  return logId
}

/** Local YYYY-MM-DD. Not toISOString() -- that's UTC, and a workout finished
 *  at 9pm local would land on tomorrow's date for most of the Americas. */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** "today", "yesterday", "4 days ago", "3 weeks ago". */
export function relativeDay(iso: string, now: Date = new Date()): string {
  const [y, m, d] = iso.split('-').map(Number)
  const then = new Date(y!, (m ?? 1) - 1, d ?? 1)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((today.getTime() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks < 8 ? `${weeks} weeks ago` : `${Math.floor(days / 30)} months ago`
}


/** Save edits to one logged session. Only the fields the edit screen exposes. */
export async function updateLog(
  logId: string,
  patch: { date?: string; session_notes?: string; title?: string | null; total_seconds?: number | null },
): Promise<void> {
  const { error } = await supabase.from('training_log').update(patch).eq('id', logId)
  if (error) throw new Error(error.message)
}

/** Save edits to the per-line rows of one session. */
export async function updateLogItems(
  items: { id: string; checked: boolean; notes: string }[],
): Promise<void> {
  // Supabase has no bulk-update-by-row, and these are at most ~12 rows, so
  // individual updates are simpler than an upsert that could resurrect a
  // deleted row.
  const results = await Promise.all(
    items.map((item) =>
      supabase
        .from('training_log_items')
        .update({ checked: item.checked, notes: item.notes })
        .eq('id', item.id),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)
}

/** Remove a logged session. training_log_items cascades, so its lines go too. */
export async function deleteLog(logId: string): Promise<void> {
  const { error } = await supabase.from('training_log').delete().eq('id', logId)
  if (error) throw new Error(error.message)
}

/** Log a session done away from the app.
 *
 *  Pass workoutId when it was one of the five -- it then feeds the queue like
 *  any other session. Leave it null and give a title for anything else; that
 *  still counts toward the week.
 *
 *  When it maps to one of the five, its lines are created too (unchecked, no
 *  splits) so the entry can be opened and filled in afterwards. */
export async function addAdHocLog(input: {
  date: string
  phase: number
  workoutId: string | null
  title: string | null
  totalSeconds: number | null
  sessionNotes: string
  blocks: FlatBlock[]
}): Promise<string> {
  const { data, error } = await supabase
    .from('training_log')
    .insert({
      date: input.date,
      workout_id: input.workoutId,
      title: input.title,
      phase: input.phase,
      started_at: null,
      completed_at: null,
      total_seconds: input.totalSeconds,
      session_notes: input.sessionNotes,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  const logId = data.id as string

  if (input.blocks.length > 0) {
    const { error: itemsError } = await supabase.from('training_log_items').insert(
      input.blocks.map((b) => ({
        training_log_id: logId,
        exercise_key: b.exercise_key,
        sort_order: b.ord,
        checked: true,
        split_seconds: null,
        notes: '',
      })),
    )
    if (itemsError) {
      await supabase.from('training_log').delete().eq('id', logId)
      throw new Error(itemsError.message)
    }
  }

  return logId
}
