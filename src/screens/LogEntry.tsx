import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProgram } from '../lib/useProgram'
import { useHistory } from '../lib/useHistory'
import {
  deleteLog,
  flattenWorkout,
  relativeDay,
  updateLog,
  updateLogItems,
  type TrainingLogItem,
} from '../lib/log'
import { formatStamp, formatStampPadded } from '../lib/time'
import { Card, ErrorState, Loading, Screen } from '../components/Ui'

export default function LogEntry() {
  const { logId } = useParams()
  const program = useProgram()
  const history = useHistory()

  if (program.status === 'loading' || history.status === 'loading') {
    return <Loading what="the session" />
  }
  if (program.status === 'error') return <ErrorState message={program.message} />
  if (history.status === 'error') return <ErrorState message={history.message} />

  const log = history.data.logs.find((l) => l.id === logId)
  if (!log) {
    return (
      <Screen title="Not found">
        <Card className="p-4">
          <p className="text-small text-muted">
            That session isn&rsquo;t in the log.{' '}
            <Link to="/log" className="font-medium text-accent underline underline-offset-2">
              Back to the log
            </Link>
          </p>
        </Card>
      </Screen>
    )
  }

  const workout = program.data.workouts.find((w) => w.id === log.workout_id)
  // Movements dropped from a session still have rows in old logs, so fall back
  // to the movements table before giving up and showing a raw key.
  const names = new Map<string, string>(
    [...program.data.movements].map(([key, m]) => [key, m.name]),
  )
  if (workout) for (const b of flattenWorkout(workout)) names.set(b.exercise_key, b.name)

  return (
    <Editor
      key={log.id}
      log={log}
      items={history.data.itemsByLog.get(log.id) ?? []}
      names={names}
      workoutName={workout?.name ?? log.title ?? 'Session'}
      isAdHoc={!log.workout_id}
    />
  )
}

function Editor({
  log,
  items,
  names,
  workoutName,
  isAdHoc,
}: {
  log: import('../lib/log').TrainingLog
  items: TrainingLogItem[]
  names: Map<string, string>
  workoutName: string
  isAdHoc: boolean
}) {
  const navigate = useNavigate()
  const [date, setDate] = useState(log.date)
  const [title, setTitle] = useState(log.title ?? '')
  const [sessionNotes, setSessionNotes] = useState(log.session_notes)
  const [rows, setRows] = useState(
    items.map((i) => ({ id: i.id, exercise_key: i.exercise_key, checked: i.checked, notes: i.notes, split_seconds: i.split_seconds })),
  )
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const dirty =
    date !== log.date ||
    title !== (log.title ?? '') ||
    sessionNotes !== log.session_notes ||
    rows.some((r, i) => r.checked !== items[i]?.checked || r.notes !== items[i]?.notes)

  async function handleSave() {
    setBusy('save')
    setError(null)
    try {
      await updateLog(log.id, {
        date,
        session_notes: sessionNotes,
        ...(isAdHoc ? { title: title.trim() || workoutName } : {}),
      })
      if (rows.length > 0) {
        await updateLogItems(rows.map((r) => ({ id: r.id, checked: r.checked, notes: r.notes })))
      }
      navigate('/log', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(null)
    }
  }

  async function handleDelete() {
    setBusy('delete')
    setError(null)
    try {
      await deleteLog(log.id)
      navigate('/log', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(null)
    }
  }

  return (
    <Screen title={workoutName} subtitle={`${log.date} · ${relativeDay(log.date)}`}>
      <div className="mb-4">
        <Link to="/log" className="text-small font-medium text-muted underline underline-offset-2">
          ← All sessions
        </Link>
      </div>

      <Card className="p-4">
        <label className="block">
          <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
            Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface px-3
                       text-body outline-none focus:border-line-strong"
          />
        </label>

        {isAdHoc && (
          <label className="mt-3 block">
            <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
              What it was
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface px-3
                         text-body outline-none focus:border-line-strong"
            />
          </label>
        )}

        <p className="mt-3 text-small text-muted">
          Phase {log.phase} ·{' '}
          {log.total_seconds === null ? 'not timed' : formatStamp(log.total_seconds)}
          {rows.length > 0 && ` · ${rows.filter((r) => r.checked).length}/${rows.length} done`}
        </p>
      </Card>

      <label className="mt-4 block">
        <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
          Session notes
        </span>
        <textarea
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          rows={5}
          placeholder="Anything that wasn't about one movement."
          className="mt-1 w-full rounded-card border border-line bg-surface p-3 text-body
                     outline-none focus:border-line-strong"
        />
      </label>

      {rows.length > 0 && (
        <>
          <h2 className="mt-6 text-label font-semibold uppercase tracking-[0.06em] text-faint">
            Movements
          </h2>
          <ul className="mt-2 space-y-2">
            {rows.map((row, i) => (
              <li key={row.id} className="rounded-card border border-line bg-surface px-3 py-2">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={row.checked}
                    aria-label={`Mark ${names.get(row.exercise_key) ?? row.exercise_key} done`}
                    onClick={() =>
                      setRows((rs) =>
                        rs.map((r, k) => (k === i ? { ...r, checked: !r.checked } : r)),
                      )
                    }
                    className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-card
                                border ${
                                  row.checked
                                    ? 'border-accent bg-accent text-white'
                                    : 'border-line-strong bg-surface'
                                }`}
                  >
                    {row.checked && (
                      <span aria-hidden className="text-body font-semibold">
                        ✓
                      </span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 font-medium">
                        {names.get(row.exercise_key) ?? row.exercise_key}
                      </span>
                      <span className="shrink-0 font-[family-name:var(--font-stamp)] text-label tabular-nums text-faint">
                        {row.split_seconds === null ? '—' : formatStampPadded(row.split_seconds)}
                      </span>
                    </div>
                    <textarea
                      value={row.notes}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((r, k) => (k === i ? { ...r, notes: e.target.value } : r)),
                        )
                      }
                      rows={row.notes ? 2 : 1}
                      placeholder="Note"
                      aria-label={`Notes for ${names.get(row.exercise_key) ?? row.exercise_key}`}
                      className="mt-1 w-full rounded-card border border-line bg-surface p-2 text-small
                                 outline-none focus:border-line-strong"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {error && (
        <p className="mt-4 rounded-card bg-sunken p-3 text-small text-muted">
          Couldn&rsquo;t save: {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={busy !== null || !dirty}
        className="mt-4 flex min-h-14 w-full items-center justify-center rounded-card bg-accent px-4
                   text-body font-semibold text-white active:opacity-90 disabled:opacity-40"
      >
        {busy === 'save' ? 'Saving…' : dirty ? 'Save changes' : 'No changes'}
      </button>

      {/* Delete is deliberately two-tap. Deleting a session removes its lines
          and its notes for good, and it changes the streak. */}
      <div className="mt-8 rounded-card border border-line p-4">
        {confirmingDelete ? (
          <>
            <p className="text-small font-medium">Delete this session?</p>
            <p className="mt-1 text-small text-muted">
              {workoutName} on {log.date}, with {rows.length} lines and every note on them. This
              can&rsquo;t be undone, and your streak will be recounted without it.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy !== null}
                className="min-h-12 flex-1 rounded-card border border-line text-small font-medium
                           active:bg-sunken"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy !== null}
                className="min-h-12 flex-1 rounded-card bg-ink text-small font-semibold text-white
                           active:opacity-90 disabled:opacity-60"
              >
                {busy === 'delete' ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="min-h-12 w-full rounded-card text-small text-muted active:bg-sunken"
          >
            Delete this session
          </button>
        )}
      </div>
    </Screen>
  )
}
