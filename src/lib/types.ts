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
}

export type SectionName = 'warmup' | 'main' | 'finisher' | 'mobility'

export const SECTIONS: { key: SectionName; label: string }[] = [
  { key: 'warmup', label: 'Warmup' },
  { key: 'main', label: 'Main' },
  { key: 'finisher', label: 'Finisher' },
  { key: 'mobility', label: 'Mobility' },
]
