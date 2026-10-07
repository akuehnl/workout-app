import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProgram } from '../lib/useProgram'
import { variationFor } from '../lib/phase'
import { flattenWorkout, localDateString, saveRun, type FlatBlock } from '../lib/log'
import { formatStamp, formatStampPadded } from '../lib/time'
import type { Movement, Workout } from '../lib/types'
import {
  clearRun,
  createRun,
  elapsedMs,
  goBack,
  isFinished,
  loadRun,
  bumpCount,
  markDone,
  noteWithCount,
  pause,
  persistRun,
  reconcile,
  remainingSeconds,
  resume,
  currentTiming,
  setNote,
  skip,
  toggleItem,
  type PersistedRun,
} from '../lib/runner'
import { ClockBar, FocusCard, ListRow } from '../components/Runner'
import { Card, ErrorState, Loading } from '../components/Ui'

export default function Run() {
  const { sortOrder } = useParams()
  const state = useProgram()

  if (state.status === 'loading') return <Loading what="the session" />
  if (state.status === 'error') return <ErrorState message={state.message} />

  const workout = state.data.workouts.find((w) => String(w.sort_order) === sortOrder)
  if (!workout) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 pt-10">
        <Card className="p-4">
          <p className="text-small text-muted">
            There&rsquo;s no session {sortOrder}.{' '}
            <Link to="/workout/today" className="font-medium text-accent underline underline-offset-2">
              Back to Today
            </Link>
          </p>
        </Card>
      </div>
    )
  }

  return (
    <RunSession
      workout={workout}
      movements={state.data.movements}
      variations={state.data.variations}
      phase={state.data.phaseState.phase}
    />
  )
}

function RunSession({
  workout,
  movements,
  variations,
  phase,
}: {
  workout: Workout
  movements: Map<string, Movement>
  variations: Map<string, string>
  phase: number
}) {
  const navigate = useNavigate()
  const blocks = useMemo<FlatBlock[]>(() => flattenWorkout(workout), [workout])

  const [run, setRun] = useState<PersistedRun>(() => {
    const cached = loadRun()
    // Resume only if the cache is for THIS session. Starting a different one
    // replaces it; Today surfaces an in-progress run so that isn't a surprise.
    if (cached && cached.workoutId === workout.id) return reconcile(cached, blocks)
    return createRun({
      workoutId: workout.id,
      sortOrder: workout.sort_order,
      phase,
      totalSeconds: workout.total_seconds,
      blocks,
    })
  })

  const [now, setNow] = useState(() => Date.now())
  const [justDone, setJustDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const clockRef = useRef<HTMLDivElement>(null)

  // The clock is derived from wall-clock time, so this interval only decides
  // how often the display refreshes -- it never accumulates drift.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    persistRun(run)
  }, [run])

  const finished = isFinished(run)
  const current = finished ? null : blocks[run.index]!
  const remaining = remainingSeconds(run, now)

  // From the notes: the small clock should show when the NEXT line is due and
  // how long is left on this one -- not the stamp this line was meant to start
  // at, which has already gone by and can't be acted on.
  const timing = finished ? null : currentTiming(run, now, blocks)
  const nextStartRemaining = timing?.nextStartRemaining ?? null
  const leftOnCurrent = timing?.leftOnCurrent ?? null
  const isLast = timing?.isLastGroup ?? false

  // Keep the travelling clock where the eye already is when it moves down.
  useEffect(() => {
    if (finished || run.view !== 'list') return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    clockRef.current?.scrollIntoView({
      block: 'center',
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [run.index, run.view, finished])

  const handleDone = useCallback(() => {
    setJustDone(true)
    setRun((r) => markDone(r, Date.now()))
    window.setTimeout(() => setJustDone(false), 320)
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const startedAt = new Date(run.startedAtMs)
    const totalSeconds = Math.round(run.boundaryElapsedMs / 1000)
    const completedAt = new Date(run.startedAtMs + run.pausedTotalMs + run.boundaryElapsedMs)

    try {
      await saveRun({
        date: localDateString(completedAt),
        workoutId: run.workoutId,
        phase: run.phase,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        totalSeconds,
        sessionNotes: run.sessionNotes,
        items: run.items.map((item, i) => ({
          exercise_key: item.exercise_key,
          sort_order: blocks[i]!.ord,
          checked: item.checked,
          split_seconds: item.split_seconds,
          notes: noteWithCount(item, blocks[i]!.counter?.label),
        })),
      })
      clearRun()
      navigate('/workout/today', { replace: true })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  // --- summary -------------------------------------------------------------
  if (finished) {
    const total = Math.round(run.boundaryElapsedMs / 1000)
    const doneCount = run.items.filter((i) => i.checked).length
    return (
      <div className="mx-auto w-full max-w-xl px-4 pt-6">
        <p className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
          {workout.name}
        </p>
        <h1 className="mt-1 text-title font-semibold">Session done</h1>

        <Card className="mt-4 p-4">
          <div className="flex items-baseline gap-3">
            <span className="font-[family-name:var(--font-stamp)] text-display font-semibold tabular-nums">
              {formatStamp(total)}
            </span>
            <span className="text-small text-muted">
              {doneCount} of {run.items.length} done
              {total <= workout.total_seconds
                ? ` · ${formatStamp(workout.total_seconds - total)} under`
                : ` · ${formatStamp(total - workout.total_seconds)} over`}
            </span>
          </div>
        </Card>

        <h2 className="mt-6 text-label font-semibold uppercase tracking-[0.06em] text-faint">
          Splits
        </h2>
        <ul className="mt-2 space-y-1">
          {blocks.map((block, i) => {
            const item = run.items[i]!
            return (
              <li
                key={block.exercise_key}
                className="flex items-baseline gap-3 rounded-card bg-surface px-3 py-2
                           border border-line"
              >
                <span aria-hidden className={item.checked ? 'text-accent' : 'text-faint'}>
                  {item.checked ? '✓' : '·'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${item.checked ? '' : 'text-muted'}`}>
                    {block.name}
                  </span>
                  {item.notes && <span className="block text-small text-muted">{item.notes}</span>}
                </span>
                <span className="shrink-0 font-[family-name:var(--font-stamp)] text-small tabular-nums text-muted">
                  {item.split_seconds === null ? '—' : formatStampPadded(item.split_seconds)}
                </span>
              </li>
            )
          })}
        </ul>

        <label className="mt-6 block">
          <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
            Session notes
          </span>
          <textarea
            value={run.sessionNotes}
            onChange={(e) => setRun((r) => ({ ...r, sessionNotes: e.target.value }))}
            rows={4}
            placeholder="Anything that wasn't about one movement."
            className="mt-2 w-full rounded-card border border-line bg-surface p-3 text-body
                       outline-none focus:border-line-strong"
          />
        </label>

        {saveError && (
          <p className="mt-3 rounded-card bg-sunken p-3 text-small text-muted">
            Couldn&rsquo;t save: {saveError}. Your run is still held on this device — try again.
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-4 flex min-h-14 w-full items-center justify-center rounded-card bg-accent
                     px-4 text-body font-semibold text-white active:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save session'}
        </button>

        <button
          type="button"
          onClick={() => setRun((r) => goBack(r))}
          className="mt-2 flex min-h-12 w-full items-center justify-center rounded-card
                     text-small text-muted active:bg-sunken"
        >
          Back to the last movement
        </button>
      </div>
    )
  }

  // --- running -------------------------------------------------------------
  const block = current!
  const item = run.items[run.index]!
  const paused = run.pausedAtMs !== null

  const header = (
    <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 pt-4">
      <Link to="/workout/today" className="min-h-11 py-2 text-small text-muted">
        ← Today
      </Link>
      <span className="truncate text-small font-medium">{workout.name}</span>
      <button
        type="button"
        onClick={() => setRun((r) => ({ ...r, view: r.view === 'focus' ? 'list' : 'focus' }))}
        className="min-h-11 rounded-card px-2 py-2 text-small text-muted active:bg-sunken"
      >
        {run.view === 'focus' ? 'List' : 'Focus'}
      </button>
    </div>
  )

  const clock = (
    <div ref={clockRef}>
      <ClockBar
        remaining={remaining}
        leftOnCurrent={leftOnCurrent}
        nextStartRemaining={nextStartRemaining}
        isLast={isLast}
        paused={paused}
        onTogglePause={() =>
          setRun((r) => (r.pausedAtMs !== null ? resume(r, Date.now()) : pause(r, Date.now())))
        }
      />
    </div>
  )

  if (run.view === 'list') {
    return (
      <div className="pb-8">
        {header}
        <div className="mx-auto w-full max-w-xl px-4 pt-3">
          <ul className="space-y-2">
            {blocks.map((b, i) => (
              <Fragment key={b.exercise_key}>
                {/* The clock lives directly above the current line, so it
                    travels down the list as lines get checked off. */}
                {i === run.index && <li>{clock}</li>}
                <ListRow
                  block={b}
                  run={run}
                  index={i}
                  isCurrent={i === run.index}
                  onToggle={() => setRun((r) => toggleItem(r, Date.now(), i))}
                  onNote={(v) => setRun((r) => setNote(r, i, v))}
                />
              </Fragment>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-8">
      {header}
      <div className="mx-auto w-full max-w-xl px-4 pt-3">
        {clock}

        <FocusCard
          block={block}
          movement={movements.get(block.exercise_key)}
          variation={variationFor(block, variations)}
          note={item.notes}
          onNote={(v) => setRun((r) => setNote(r, r.index, v))}
          index={run.index}
          count={item.count}
          onBump={(delta) => setRun((r) => bumpCount(r, r.index, delta))}
        />

        <button
          type="button"
          onClick={handleDone}
          className={`mt-4 flex min-h-16 w-full items-center justify-center gap-2 rounded-card
                      px-4 text-heading font-semibold text-white active:opacity-90
                      ${justDone ? 'bg-accent-ink' : 'bg-accent'}`}
        >
          {justDone ? (
            <span aria-hidden className="animate-check-in text-title">
              ✓
            </span>
          ) : (
            'Done'
          )}
        </button>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setRun((r) => goBack(r))}
            disabled={run.index === 0}
            className="min-h-12 flex-1 rounded-card text-small text-muted active:bg-sunken
                       disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setRun((r) => skip(r, Date.now()))}
            className="min-h-12 flex-1 rounded-card text-small text-muted active:bg-sunken"
          >
            Skip
          </button>
        </div>

        <p className="mt-4 text-center text-label text-faint">
          {run.index + 1} of {blocks.length}
          {' · '}
          {formatStamp(elapsedMs(run, now) / 1000)} elapsed
        </p>
      </div>
    </div>
  )
}
