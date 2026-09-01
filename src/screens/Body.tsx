import { useCallback, useEffect, useState } from 'react'
import { useProgram } from '../lib/useProgram'
import { configError } from '../lib/supabase'
import { localDateString, relativeDay } from '../lib/log'
import {
  FIELDS,
  deleteMetric,
  fetchMetrics,
  formatDelta,
  formatValue,
  isEmpty,
  latestAndPrevious,
  saveGoalWeight,
  saveMetric,
  weightSeries,
  type Metric,
  type MetricField,
  type MetricValues,
} from '../lib/metrics'
import WeightChart from '../components/WeightChart'
import { Card, ErrorState, Loading, Screen, SectionLabel } from '../components/Ui'

type Draft = Partial<Record<MetricField, string>>

function draftFrom(metric: Metric | null): Draft {
  if (!metric) return {}
  const draft: Draft = {}
  for (const { key } of FIELDS) {
    const value = metric[key]
    if (value !== null && value !== undefined) draft[key] = String(Number(value))
  }
  return draft
}

function valuesFrom(draft: Draft): MetricValues {
  const values: MetricValues = {}
  for (const { key } of FIELDS) {
    const raw = (draft[key] ?? '').trim()
    const n = Number(raw)
    values[key] = raw === '' || !Number.isFinite(n) || n <= 0 ? null : n
  }
  return values
}

export default function Body() {
  const program = useProgram()
  const [metrics, setMetrics] = useState<Metric[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [date, setDate] = useState(() => localDateString())
  const [draft, setDraft] = useState<Draft>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const [goalDraft, setGoalDraft] = useState('')
  const [goalSaved, setGoalSaved] = useState(false)

  const reload = useCallback(async () => {
    try {
      setMetrics(await fetchMetrics())
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    if (configError) {
      setLoadError(configError)
      return
    }
    void reload()
  }, [reload])

  // Seed the goal box once the program (and with it settings) has loaded.
  useEffect(() => {
    if (program.status === 'ready') {
      const goal = program.data.settings.goal_weight_lbs
      setGoalDraft(goal === null || goal === undefined ? '' : String(Number(goal)))
    }
  }, [program.status])

  if (program.status === 'error') return <ErrorState message={program.message} />
  if (loadError) return <ErrorState message={loadError} />
  if (program.status === 'loading' || metrics === null) return <Loading what="your numbers" />

  const goal = program.data.settings.goal_weight_lbs
  const goalNumber = goal === null || goal === undefined ? null : Number(goal)
  const series = weightSeries(metrics)
  const weight = latestAndPrevious(metrics, 'weight_lbs')

  async function handleSave() {
    const values = valuesFrom(draft)
    if (isEmpty(values)) {
      setSaveError('Nothing to save — fill in at least one number.')
      return
    }
    setBusy(true)
    setSaveError(null)
    try {
      await saveMetric(date, values)
      setDraft({})
      setEditingId(null)
      setDate(localDateString())
      await reload()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  async function handleDelete(id: string) {
    setBusy(true)
    setSaveError(null)
    try {
      await deleteMetric(id)
      if (editingId === id) {
        setEditingId(null)
        setDraft({})
        setDate(localDateString())
      }
      setConfirmDelete(null)
      await reload()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  async function handleGoal() {
    const raw = goalDraft.trim()
    const n = Number(raw)
    const next = raw === '' || !Number.isFinite(n) || n <= 0 ? null : n
    setBusy(true)
    try {
      await saveGoalWeight(next)
      setGoalSaved(true)
      window.setTimeout(() => setGoalSaved(false), 1500)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  function startEdit(metric: Metric) {
    setEditingId(metric.id)
    setDate(metric.date)
    setDraft(draftFrom(metric))
    setSaveError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Screen title="Body" subtitle="Weight and measurements. Every field is optional.">
      {/* --- headline ------------------------------------------------------ */}
      <Card className="p-5">
        {weight.latest ? (
          <>
            <p className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
              Latest weight
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-stamp)] text-display font-semibold tabular-nums">
                {Math.round(weight.latest.value * 10) / 10}
              </span>
              <span className="text-title text-faint">lb</span>
            </p>
            <p className="mt-1 text-small text-muted">
              {relativeDay(weight.latest.date)}
              {weight.previous && (
                <>
                  {' · '}
                  {formatDelta(weight.latest.value - weight.previous.value, 'lb')} since{' '}
                  {relativeDay(weight.previous.date)}
                </>
              )}
            </p>
            {goalNumber !== null && (
              <p className="mt-1 text-small text-accent-ink">
                {Math.abs(Math.round((weight.latest.value - goalNumber) * 10) / 10)} lb{' '}
                {weight.latest.value > goalNumber ? 'above' : 'below'} your {goalNumber} lb goal
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-heading font-semibold">Nothing recorded yet</h2>
            <p className="mt-2 text-small text-muted">
              Add a weight below and this fills in — the number, how it&rsquo;s moved, and a chart
              once there are two of them.
            </p>
          </>
        )}
      </Card>

      {/* --- chart --------------------------------------------------------- */}
      <div className="mt-3">
        <SectionLabel>Weight over time</SectionLabel>
        <Card className="mt-2 p-3">
          <WeightChart points={series} goal={goalNumber} />
        </Card>
      </div>

      {/* --- entry form ---------------------------------------------------- */}
      <div className="mt-6">
        <SectionLabel>{editingId ? 'Edit entry' : 'Add an entry'}</SectionLabel>
        <Card className="mt-2 p-4">
          <label className="block">
            <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
              Date
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

          <div className="mt-3 grid grid-cols-2 gap-2">
            {FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
                  {field.label} <span className="font-normal normal-case">({field.unit})</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={field.step}
                  min={0}
                  value={draft[field.key] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                  className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface
                             px-3 text-body outline-none focus:border-line-strong"
                />
              </label>
            ))}
          </div>

          {saveError && (
            <p className="mt-3 rounded-card bg-sunken p-3 text-small text-muted">{saveError}</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="mt-4 flex min-h-14 w-full items-center justify-center rounded-card bg-accent
                       px-4 text-body font-semibold text-white active:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Save entry'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setDraft({})
                setDate(localDateString())
                setSaveError(null)
              }}
              className="mt-2 min-h-12 w-full rounded-card text-small text-muted active:bg-sunken"
            >
              Cancel
            </button>
          )}

          <p className="mt-3 text-small text-faint">
            One entry per day. Saving a date you already have corrects it rather than adding a
            second.
          </p>
        </Card>
      </div>

      {/* --- goal ---------------------------------------------------------- */}
      <div className="mt-6">
        <SectionLabel>Goal weight</SectionLabel>
        <Card className="mt-2 p-4">
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
                Target (lb)
              </span>
              <input
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="Leave blank for none"
                className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface
                           px-3 text-body outline-none focus:border-line-strong"
              />
            </label>
            <button
              type="button"
              onClick={handleGoal}
              disabled={busy}
              className="min-h-12 shrink-0 rounded-card border border-line px-4 text-small
                         font-medium active:bg-sunken disabled:opacity-50"
            >
              {goalSaved ? 'Saved' : 'Set'}
            </button>
          </div>
          <p className="mt-2 text-small text-faint">
            Drawn as the dashed line on the chart. Clear it to remove the line.
          </p>
        </Card>
      </div>

      {/* --- history ------------------------------------------------------- */}
      <div className="mt-6">
        <SectionLabel>History</SectionLabel>
        {metrics.length === 0 ? (
          <Card className="mt-2 p-4">
            <p className="text-small text-muted">Nothing logged yet.</p>
          </Card>
        ) : (
          <ul className="mt-2 space-y-2">
            {metrics.map((metric) => (
              <li key={metric.id}>
                <Card className="p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{metric.date}</span>
                    <span className="shrink-0 text-small text-muted">
                      {relativeDay(metric.date)}
                    </span>
                  </div>

                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {FIELDS.filter((f) => metric[f.key] !== null).map((field) => (
                      <div key={field.key} className="text-small">
                        <dt className="inline text-muted">{field.label} </dt>
                        <dd className="inline font-medium tabular-nums">
                          {formatValue(metric[field.key], field.unit)}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {confirmDelete === metric.id ? (
                    <div className="mt-3">
                      <p className="text-small">Delete the entry for {metric.date}?</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          disabled={busy}
                          className="min-h-11 flex-1 rounded-card border border-line text-small
                                     font-medium active:bg-sunken"
                        >
                          Keep it
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(metric.id)}
                          disabled={busy}
                          className="min-h-11 flex-1 rounded-card bg-ink text-small font-semibold
                                     text-white active:opacity-90 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(metric)}
                        className="min-h-11 flex-1 rounded-card border border-line text-small
                                   font-medium active:bg-sunken"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(metric.id)}
                        className="min-h-11 rounded-card px-4 text-small text-muted active:bg-sunken"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Screen>
  )
}
