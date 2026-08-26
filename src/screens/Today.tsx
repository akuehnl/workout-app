import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProgram } from '../lib/useProgram'
import { useHistory } from '../lib/useHistory'
import {
  bestCindyRounds,
  flattenWorkout,
  lastDoneByWorkout,
  nextUp,
  relativeDay,
} from '../lib/log'
import { loadRun } from '../lib/runner'
import { formatStamp } from '../lib/time'
import type { Workout } from '../lib/types'
import { Card, ErrorState, Loading, PhaseBadge, Screen } from '../components/Ui'

export default function Today() {
  const program = useProgram()
  const history = useHistory()
  const [showAll, setShowAll] = useState(false)

  if (program.status === 'loading' || history.status === 'loading') {
    return <Loading what="your program" />
  }
  if (program.status === 'error') return <ErrorState message={program.message} />
  if (history.status === 'error') return <ErrorState message={history.message} />

  const { workouts, phaseState } = program.data
  const { logs, allItems } = history.data

  const next = nextUp(workouts, logs)
  const lastDone = lastDoneByWorkout(logs)
  const cindyBest = bestCindyRounds(allItems)

  // An unfinished run held in the crash-safety cache. Surfaced here so that
  // starting something else doesn't silently throw it away.
  const cached = loadRun()
  const cachedWorkout = cached ? workouts.find((w) => w.id === cached.workoutId) : undefined

  return (
    <Screen title="Today">
      <div className="mb-4 flex items-center justify-between gap-3">
        <PhaseBadge phase={phaseState.phase} />
        <Link to="/log" className="text-small font-medium text-muted underline underline-offset-2">
          Log
        </Link>
      </div>

      {cached && cachedWorkout && (
        <Card className="mb-3 border-accent/30 bg-accent-soft p-4">
          <p className="text-small font-medium text-accent-ink">
            {cachedWorkout.name} is still in progress
          </p>
          <p className="mt-1 text-small text-accent-ink/80">
            {cached.items.filter((i) => i.checked).length} of {cached.items.length} lines done.
            Starting a different session replaces it.
          </p>
          <Link
            to={`/run/${cachedWorkout.sort_order}`}
            className="mt-3 flex min-h-12 items-center justify-center rounded-card bg-accent
                       px-4 text-body font-semibold text-white active:opacity-90"
          >
            Resume
          </Link>
        </Card>
      )}

      {next ? (
        <NextCard
          workout={next}
          lastDoneOn={lastDone.get(next.id)}
          cindyBest={next.sort_order === 3 ? cindyBest : null}
        />
      ) : (
        <Card className="p-5">
          <p className="text-small text-muted">No sessions in the program yet.</p>
        </Card>
      )}

      <button
        type="button"
        onClick={() => setShowAll((s) => !s)}
        className="mt-4 min-h-12 w-full rounded-card text-small text-muted active:bg-sunken"
        aria-expanded={showAll}
      >
        {showAll ? 'Hide the others' : 'Do a different one'}
      </button>

      {showAll && (
        <ul className="mt-1 space-y-2">
          {workouts.map((w) => {
            const on = lastDone.get(w.id)
            return (
              <li key={w.id}>
                <Link
                  to={`/run/${w.sort_order}`}
                  className="flex min-h-16 items-center gap-3 rounded-card border border-line
                             bg-surface px-4 py-3 active:bg-sunken"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{w.name}</span>
                    <span className="block truncate text-small text-muted">
                      {on ? `Last done ${relativeDay(on)}` : 'Never done'}
                      {w.sort_order === 3 && cindyBest !== null && ` · best ${cindyBest} rounds`}
                    </span>
                  </span>
                  <span className="shrink-0 font-[family-name:var(--font-stamp)] text-small tabular-nums text-muted">
                    {formatStamp(w.total_seconds)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Screen>
  )
}

function NextCard({
  workout,
  lastDoneOn,
  cindyBest,
}: {
  workout: Workout
  lastDoneOn: string | undefined
  cindyBest: number | null
}) {
  const lines = flattenWorkout(workout).length
  return (
    <Card className="p-5">
      <p className="text-label font-semibold uppercase tracking-[0.06em] text-faint">Next up</p>
      <h2 className="mt-1 text-display font-semibold tracking-tight">{workout.name}</h2>
      <p className="mt-1 text-body text-muted">{workout.focus}</p>

      <p className="mt-3 text-small text-muted">
        {formatStamp(workout.total_seconds)} · {lines} lines ·{' '}
        {lastDoneOn ? `last done ${relativeDay(lastDoneOn)}` : 'never done'}
      </p>

      {cindyBest !== null && (
        <p className="mt-1 text-small text-accent-ink">Best so far: {cindyBest} rounds</p>
      )}

      <Link
        to={`/run/${workout.sort_order}`}
        className="mt-4 flex min-h-16 items-center justify-center rounded-card bg-accent px-4
                   text-heading font-semibold text-white active:opacity-90"
      >
        Start
      </Link>
    </Card>
  )
}
