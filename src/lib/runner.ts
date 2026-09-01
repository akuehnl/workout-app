import type { FlatBlock } from './log'

/** The ONE localStorage exception in this app. This is a crash-safety cache so
 *  that locking the phone or refreshing mid-workout doesn't lose the run --
 *  not a data store. Supabase stays the source of truth: nothing here counts
 *  until the summary is saved, and this key is cleared the moment it is. */
const STORAGE_KEY = 'workout:run:v1'

export type RunItemState = {
  exercise_key: string
  checked: boolean
  split_seconds: number | null
  notes: string
  /** Tally for lines that carry a counter (Cindy's rounds). Written to the
   *  top of the note when the session is saved, which is where the best-ever
   *  figure is read back from. */
  count?: number
}

export type RunView = 'focus' | 'list'

export type PersistedRun = {
  v: 1
  workoutId: string
  sortOrder: number
  phase: number
  totalSeconds: number
  /** Wall-clock epoch ms. The clock is derived from this rather than counted
   *  down by an interval, so a backgrounded tab or a locked phone doesn't
   *  drift -- when you come back, the time really has passed. */
  startedAtMs: number
  pausedAtMs: number | null
  pausedTotalMs: number
  /** Elapsed ms at the point the current item started. Splits measure from it. */
  boundaryElapsedMs: number
  /** Cursor. Equal to items.length once every line has been passed. */
  index: number
  view: RunView
  sessionNotes: string
  items: RunItemState[]
}

export function createRun(input: {
  workoutId: string
  sortOrder: number
  phase: number
  totalSeconds: number
  blocks: FlatBlock[]
}): PersistedRun {
  return {
    v: 1,
    workoutId: input.workoutId,
    sortOrder: input.sortOrder,
    phase: input.phase,
    totalSeconds: input.totalSeconds,
    startedAtMs: Date.now(),
    pausedAtMs: null,
    pausedTotalMs: 0,
    boundaryElapsedMs: 0,
    index: 0,
    view: 'focus',
    sessionNotes: '',
    items: input.blocks.map((b) => ({
      exercise_key: b.exercise_key,
      checked: false,
      split_seconds: null,
      notes: '',
    })),
  }
}

// --- storage ---------------------------------------------------------------

export function loadRun(): PersistedRun | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedRun
    return parsed?.v === 1 && Array.isArray(parsed.items) ? parsed : null
  } catch {
    return null
  }
}

export function persistRun(run: PersistedRun): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(run))
  } catch {
    // Private mode, quota, whatever. The run still works in memory; it just
    // won't survive a refresh. Not worth interrupting a workout over.
  }
}

export function clearRun(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* see above */
  }
}

/** Rebuild the item list from the program, carrying over whatever the cached
 *  run already recorded. Keeps a restored run honest if the program changed
 *  underneath it. */
export function reconcile(run: PersistedRun, blocks: FlatBlock[]): PersistedRun {
  const byKey = new Map(run.items.map((i) => [i.exercise_key, i]))
  const items = blocks.map(
    (b) =>
      byKey.get(b.exercise_key) ?? {
        exercise_key: b.exercise_key,
        checked: false,
        split_seconds: null,
        notes: '',
      },
  )
  return { ...run, items, index: Math.min(run.index, items.length) }
}

// --- the clock -------------------------------------------------------------

export function elapsedMs(run: PersistedRun, nowMs: number): number {
  const end = run.pausedAtMs ?? nowMs
  return Math.max(0, end - run.startedAtMs - run.pausedTotalMs)
}

/** Seconds left. Goes negative once you run past the session total -- that's
 *  real information, so it isn't clamped. */
export function remainingSeconds(run: PersistedRun, nowMs: number): number {
  return run.totalSeconds - elapsedMs(run, nowMs) / 1000
}

/** Actual remaining minus what should be remaining. Positive is ahead. */
export function paceSeconds(run: PersistedRun, nowMs: number, targetRemaining: number): number {
  return remainingSeconds(run, nowMs) - targetRemaining
}

export function pause(run: PersistedRun, nowMs: number): PersistedRun {
  return run.pausedAtMs === null ? { ...run, pausedAtMs: nowMs } : run
}

export function resume(run: PersistedRun, nowMs: number): PersistedRun {
  if (run.pausedAtMs === null) return run
  return {
    ...run,
    pausedAtMs: null,
    pausedTotalMs: run.pausedTotalMs + (nowMs - run.pausedAtMs),
  }
}

// --- moving through the session --------------------------------------------

function splitFor(run: PersistedRun, nowMs: number): number {
  return Math.max(0, Math.round((elapsedMs(run, nowMs) - run.boundaryElapsedMs) / 1000))
}

/** Mark the current line done, record its split, advance. */
export function markDone(run: PersistedRun, nowMs: number): PersistedRun {
  if (run.index >= run.items.length) return run
  const split = splitFor(run, nowMs)
  return {
    ...run,
    items: run.items.map((it, k) =>
      k === run.index ? { ...it, checked: true, split_seconds: split } : it,
    ),
    boundaryElapsedMs: elapsedMs(run, nowMs),
    index: run.index + 1,
  }
}

/** Advance without marking it done. No split -- it wasn't performed. */
export function skip(run: PersistedRun, nowMs: number): PersistedRun {
  if (run.index >= run.items.length) return run
  return {
    ...run,
    items: run.items.map((it, k) =>
      k === run.index ? { ...it, checked: false, split_seconds: null } : it,
    ),
    boundaryElapsedMs: elapsedMs(run, nowMs),
    index: run.index + 1,
  }
}

/** Step back to fix a mistake. The previous line keeps what it recorded until
 *  you change it; the split boundary is wound back so re-doing it measures
 *  from the right place. */
export function goBack(run: PersistedRun): PersistedRun {
  if (run.index === 0) return run
  const prevIndex = run.index - 1
  const prev = run.items[prevIndex]!
  return {
    ...run,
    index: prevIndex,
    boundaryElapsedMs: Math.max(0, run.boundaryElapsedMs - (prev.split_seconds ?? 0) * 1000),
  }
}

/** List view: tap any line's checkbox.
 *  - Checking the current line behaves exactly like Done, so the clock moves
 *    down to sit above the next one.
 *  - Unchecking a line moves the cursor back to it, which is how you fix a
 *    mis-tap without leaving the list. */
export function toggleItem(run: PersistedRun, nowMs: number, i: number): PersistedRun {
  const item = run.items[i]
  if (!item) return run

  if (item.checked) {
    return {
      ...run,
      items: run.items.map((it, k) =>
        k === i ? { ...it, checked: false, split_seconds: null } : it,
      ),
      index: i,
      boundaryElapsedMs:
        i === run.index - 1
          ? Math.max(0, run.boundaryElapsedMs - (item.split_seconds ?? 0) * 1000)
          : run.boundaryElapsedMs,
    }
  }

  const isCurrent = i === run.index
  return {
    ...run,
    items: run.items.map((it, k) =>
      k === i ? { ...it, checked: true, split_seconds: isCurrent ? splitFor(run, nowMs) : null } : it,
    ),
    index: i + 1,
    boundaryElapsedMs: isCurrent ? elapsedMs(run, nowMs) : run.boundaryElapsedMs,
  }
}

export function setNote(run: PersistedRun, i: number, notes: string): PersistedRun {
  return { ...run, items: run.items.map((it, k) => (k === i ? { ...it, notes } : it)) }
}

/** Nudge a counter. Never goes below zero -- the -1 exists to undo a
 *  double-tap, not to go negative. */
export function bumpCount(run: PersistedRun, i: number, delta: number): PersistedRun {
  return {
    ...run,
    items: run.items.map((it, k) =>
      k === i ? { ...it, count: Math.max(0, (it.count ?? 0) + delta) } : it,
    ),
  }
}

/** The note as it should be stored: a counter's tally goes on the first line
 *  so it reads back as "12 rounds" and can be parsed out again. */
export function noteWithCount(
  item: RunItemState,
  counterLabel: string | null | undefined,
): string {
  if (!counterLabel || item.count === undefined) return item.notes
  return `${item.count} ${counterLabel}
${item.notes}`.trim()
}

/** Seconds left before the NEXT line is due to start. Negative once this line
 *  has run long. The last line counts down to the end of the session. */
export function secondsLeftOnCurrent(
  run: PersistedRun,
  nowMs: number,
  nextStartRemaining: number,
): number {
  return remainingSeconds(run, nowMs) - nextStartRemaining
}

export function isFinished(run: PersistedRun): boolean {
  return run.index >= run.items.length
}
