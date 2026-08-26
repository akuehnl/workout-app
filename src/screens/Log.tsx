import { Link } from 'react-router-dom'
import { useProgram } from '../lib/useProgram'
import { useHistory } from '../lib/useHistory'
import { flattenWorkout, relativeDay, type TrainingLogItem } from '../lib/log'
import { formatStamp } from '../lib/time'
import { Card, ErrorState, Loading, Screen } from '../components/Ui'

export default function Log() {
  const program = useProgram()
  const history = useHistory()

  if (program.status === 'loading' || history.status === 'loading') {
    return <Loading what="your history" />
  }
  if (program.status === 'error') return <ErrorState message={program.message} />
  if (history.status === 'error') return <ErrorState message={history.message} />

  const { workouts } = program.data
  const { logs, itemsByLog } = history.data

  if (logs.length === 0) {
    return (
      <Screen title="Log">
        <Card className="p-5">
          <h2 className="text-heading font-semibold">Nothing logged yet</h2>
          <p className="mt-2 text-small text-muted">
            Finish a session and it lands here — the date, how long it took, and every note you
            wrote, per movement and for the session as a whole.
          </p>
          <Link
            to="/today"
            className="mt-3 flex min-h-14 items-center justify-center rounded-card bg-ink px-4
                       text-body font-semibold text-white active:opacity-90"
          >
            Start one
          </Link>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen title="Log" subtitle={`${logs.length} sessions, newest first.`}>
      <div className="space-y-3">
        {logs.map((log) => {
          const workout = workouts.find((w) => w.id === log.workout_id)
          const items = itemsByLog.get(log.id) ?? []
          const names = new Map(
            workout ? flattenWorkout(workout).map((b) => [b.exercise_key, b.name]) : [],
          )
          const doneCount = items.filter((i) => i.checked).length
          const noted = items.filter((i) => i.notes.trim().length > 0)

          return (
            <Card key={log.id} className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="min-w-0 truncate text-heading font-semibold">
                  {workout?.name ?? 'Unknown session'}
                </h2>
                <span className="shrink-0 text-small text-muted">{relativeDay(log.date)}</span>
              </div>

              <p className="mt-0.5 text-small text-muted">
                {log.date} · Phase {log.phase} ·{' '}
                {log.total_seconds === null ? 'not timed' : formatStamp(log.total_seconds)}
                {items.length > 0 && ` · ${doneCount}/${items.length} done`}
              </p>

              {log.session_notes.trim() && (
                <p className="mt-3 whitespace-pre-line rounded-card bg-sunken p-3 text-small">
                  {log.session_notes}
                </p>
              )}

              {noted.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {noted.map((item: TrainingLogItem) => (
                    <li key={item.id} className="text-small">
                      <span className={item.checked ? 'font-medium' : 'font-medium text-muted'}>
                        {names.get(item.exercise_key) ?? item.exercise_key}
                        {!item.checked && ' (not done)'}
                      </span>
                      <span className="text-muted"> — {item.notes}</span>
                    </li>
                  ))}
                </ul>
              )}

              {noted.length === 0 && !log.session_notes.trim() && (
                <p className="mt-3 text-small text-faint">No notes.</p>
              )}
            </Card>
          )
        })}
      </div>
    </Screen>
  )
}
