import type { Block, ProgramPhase } from './types'

export const PHASE_LENGTH_WEEKS = 4
export const TOTAL_PHASES = 4
const DAY_MS = 86_400_000

/** Parse "YYYY-MM-DD" as a LOCAL midnight, not UTC. `new Date("2026-08-24")`
 *  is UTC midnight, which reads as the 23rd anywhere west of Greenwich and
 *  would tip the phase over a day early. */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export type PhaseState = {
  /** 1–4. Clamped at 4 once the program runs past the end. */
  phase: number
  /** Whole weeks since program_start. */
  weeksElapsed: number
  /** 1–4, which week of the current phase we're in. */
  weekInPhase: number
  /** True once week 16 has passed — Phase 4 is done and it's time to decide
   *  what happens next. We never silently loop back to Phase 1. */
  isProgramComplete: boolean
}

/** The phase is computed from program_start, never stored. It advances on the
 *  clock every 4 weeks regardless of how many sessions have been completed —
 *  no dates, no calendar, no catching up. */
export function phaseFromStart(programStart: string, now: Date = new Date()): PhaseState {
  const start = localDate(programStart)
  const today = startOfLocalDay(now)
  const daysElapsed = Math.floor((today.getTime() - start.getTime()) / DAY_MS)
  const weeksElapsed = Math.max(0, Math.floor(daysElapsed / 7))
  const phaseIndex = Math.floor(weeksElapsed / PHASE_LENGTH_WEEKS)

  return {
    phase: Math.min(phaseIndex + 1, TOTAL_PHASES),
    weeksElapsed,
    weekInPhase: (weeksElapsed % PHASE_LENGTH_WEEKS) + 1,
    isProgramComplete: phaseIndex >= TOTAL_PHASES,
  }
}

export const PHASE_4_COMPLETE_MESSAGE =
  'Phase 4 complete. If these are getting easy, it\u2019s time for heavier bells \u2014 a pair of 35s or a 53 would be the next buy.'

/** exercise_key -> variation, for one phase. */
export function variationMap(rows: ProgramPhase[], phase: number): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of rows) {
    if (row.phase === phase) map.set(row.exercise_key, row.variation)
  }
  return map
}

/** Which program_phases key (if any) governs this block. Falls back to the
 *  block's own key so a plain movement like `front_squat` needs no extra field. */
export function variationKeyFor(block: Block): string | null {
  if (block.variation_key === null) return null
  return block.variation_key ?? block.exercise_key
}

/** The phase variation to show beside a block's prescription, or null if this
 *  block doesn't progress. */
export function variationFor(block: Block, variations: Map<string, string>): string | null {
  const key = variationKeyFor(block)
  if (!key) return null
  return variations.get(key) ?? null
}
