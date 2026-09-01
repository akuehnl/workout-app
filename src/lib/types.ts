/** One line of a workout. Warmup drills, main lifts, the finisher and each
 *  mobility piece are all this shape — in Step 2 every one of them becomes its
 *  own log row with its own checkbox and notes field. */
export type Block = {
  /** Unique within its workout. This is the id that log rows are keyed by. */
  exercise_key: string
  name: string
  prescription: string
  cue: string
  /** Seconds that should be LEFT on the countdown when this block starts.
   *  Session 1 opens at 1800 and its last block starts at 300. */
  start_remaining_seconds: number
  /** How long to rest between sets on this line, e.g. "60s between sets".
   *  Absent on warmup and mobility, where it doesn't apply. */
  rest?: string | null
  /** Present when this line should show a tally in the runner (Cindy's
   *  rounds). The count is written to the top of the line's note. */
  counter?: { label: string } | null
  /** Optional pointer into program_phases. Lets a finisher inherit the phase
   *  variation of the movement that actually progresses (the snatch, the
   *  swing) without colliding with that movement's own key earlier in the
   *  session. Null means this block does not progress by phase. */
  variation_key?: string | null
}

export type Workout = {
  id: string
  sort_order: number
  name: string
  focus: string
  total_seconds: number
  /** Why this session gets the mobility it gets. */
  mobility_note: string
  /** Movement patterns this session hammers. The queue uses these to avoid
   *  handing back a session that repeats yesterday's work. */
  muscle_tags: string[]
  warmup: Block[]
  main: Block[]
  finisher: Block[]
  mobility: Block[]
}

export type Movement = {
  exercise_key: string
  name: string
  description: string
  cue: string
  video_url: string | null
}

export type ProgramPhase = {
  phase: number
  exercise_key: string
  variation: string
}

export type Settings = {
  id: number
  program_start: string // ISO date, e.g. "2026-08-24"
  /** The goal line on the weight chart. Null means no goal set. */
  goal_weight_lbs: number | null
}

export type SectionName = 'warmup' | 'main' | 'finisher' | 'mobility'

export const SECTIONS: { key: SectionName; label: string }[] = [
  { key: 'warmup', label: 'Warmup' },
  { key: 'main', label: 'Main' },
  { key: 'finisher', label: 'Finisher' },
  { key: 'mobility', label: 'Mobility' },
]
