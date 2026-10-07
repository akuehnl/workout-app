import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProgram } from '../lib/useProgram'
import { phaseFromStart } from '../lib/phase'
import { addAdHocLog, flattenWorkout, localDateString } from '../lib/log'
import { Card, ErrorState, Loading, Screen } from '../components/Ui'

const OTHER = 'other'

export default function LogNew() {
  const program = useProgram()
  const navigate = useNavigate()

  const [date, setDate] = useState(() => localDateString())
  const [choice, setChoice] = useState<string>(OTHER)
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (program.status === 'loading') return <Loading what="the program" />
  if (program.status === 'error') return <ErrorState message={program.message} />

  const { workouts, settings } = program.data
  const chosen = workouts.find((w) => w.id === choice)
  const canSave = chosen !== undefined || title.trim().length > 0

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      // The phase is whatever was running on the DAY it was done, not today --
      // backdating a session from three weeks ago should record that phase.
      const [y, m, d] = date.split('-').map(Number)
      const phase = phaseFromStart(settings.program_start, new Date(y!, (m ?? 1) - 1, d ?? 1)).phase
      const mins = Number(minutes)

      await addAdHocLog({
        date,
        phase,
        workoutId: chosen?.id ?? null,
        title: chosen ? null : title.trim(),
        totalSeconds: Number.isFinite(mins) && mins > 0 ? Math.round(mins * 60) : null,
        sessionNotes: notes,
        blocks: chosen ? flattenWorkout(chosen) : [],
      })
      navigate('/workout/log', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <Screen
      title="Log a session"
      subtitle="For one you did away from the app, so the week still counts it."
    >
      <div className="mb-4">
        <Link to="/workout/log" className="text-small font-medium text-muted underline underline-offset-2">
          ← All sessions
        </Link>
      </div>

      <Card className="p-4">
        <label className="block">
          <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
            When
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={localDateString()}
            className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface px-3
                       text-body outline-none focus:border-line-strong"
          />
        </label>
      </Card>

      <h2 className="mt-4 text-label font-semibold uppercase tracking-[0.06em] text-faint">
        What did you do
      </h2>
      <ul className="mt-2 space-y-2">
        {workouts.map((w) => (
          <li key={w.id}>
            <button
              type="button"
              onClick={() => setChoice(w.id)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-card border px-4 text-left
                          ${
                            choice === w.id
                              ? 'border-accent bg-accent-soft'
                              : 'border-line bg-surface active:bg-sunken'
                          }`}
            >
              <span
                aria-hidden
                className={`size-2 shrink-0 rounded-pill ${
                  choice === w.id ? 'bg-accent' : 'bg-line-strong'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{w.name}</span>
                <span className="block truncate text-small text-muted">{w.focus}</span>
              </span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setChoice(OTHER)}
            className={`flex min-h-14 w-full items-center gap-3 rounded-card border px-4 text-left
                        ${
                          choice === OTHER
                            ? 'border-accent bg-accent-soft'
                            : 'border-line bg-surface active:bg-sunken'
                        }`}
          >
            <span
              aria-hidden
              className={`size-2 shrink-0 rounded-pill ${
                choice === OTHER ? 'bg-accent' : 'bg-line-strong'
              }`}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Something else</span>
              <span className="block text-small text-muted">
                Counts toward the week, not the queue
              </span>
            </span>
          </button>
        </li>
      </ul>

      {choice === OTHER && (
        <label className="mt-3 block">
          <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
            What was it
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Climbing, long run, whatever it was"
            className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface px-3
                       text-body outline-none focus:border-line-strong"
          />
        </label>
      )}

      <label className="mt-3 block">
        <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
          Minutes <span className="font-normal normal-case tracking-normal">(optional)</span>
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Leave blank if you didn't time it"
          className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface px-3
                     text-body outline-none focus:border-line-strong"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
          Notes <span className="font-normal normal-case tracking-normal">(optional)</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-card border border-line bg-surface p-3 text-body
                     outline-none focus:border-line-strong"
        />
      </label>

      {chosen && (
        <p className="mt-3 text-small text-muted">
          Logged as {chosen.name}, so it also moves that session to the back of the queue. Its
          lines are added as done — open the entry afterwards if you want to correct any.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-card bg-sunken p-3 text-small text-muted">
          Couldn&rsquo;t save: {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !canSave}
        className="mt-4 flex min-h-14 w-full items-center justify-center rounded-card bg-accent px-4
                   text-body font-semibold text-white active:opacity-90 disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Add to the log'}
      </button>
    </Screen>
  )
}
