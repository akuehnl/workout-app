import { useCallback, useEffect, useState } from 'react'
import { useProgram } from '../lib/useProgram'
import { configError } from '../lib/supabase'
import { localDateString, relativeDay } from '../lib/log'
import {
  FIELDS,
  countUntimed,
  deleteMetric,
  fetchMetrics,
  fieldFor,
  formatClockTime,
  formatDelta,
  formatValue,
  hasMeasurementTime,
  isEmpty,
  latestAndPrevious,
  saveGoalWeight,
  saveMetric,
  series,
  withinWindow,
  type Metric,
  type MetricField,
  type MetricValues,
} from '../lib/metrics'
import {
  chartEndDate,
  evaluateAll,
  fitQuality,
  type WindowKey,
  type WindowState,
} from '../lib/regression'
import type { TrendLine } from '../lib/metrics'
import WeightChart from '../components/WeightChart'
import { Card, ErrorState, Loading, Screen, SectionLabel } from '../components/Ui'

type Draft = Partial<Record<MetricField, string>>

const DEFAULT_WINDOW = { start: '13:00', end: '17:30' }

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

/** "14:30:00" -> "14:30" for an <input type="time">. */
function toTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  const m = value.match(/^(\d{1,2}):(\d{2})/)
  return m ? `${m[1]!.padStart(2, '0')}:${m[2]}` : ''
}

function nowTimeInput(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function Body() {
  const program = useProgram()
  const [metrics, setMetrics] = useState<Metric[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [timeSupported, setTimeSupported] = useState<boolean | null>(null)

  const [field, setField] = useState<MetricField>('weight_lbs')
  const [windowOnly, setWindowOnly] = useState(false)

  const [date, setDate] = useState(() => localDateString())
  const [time, setTime] = useState(() => nowTimeInput())
  const [draft, setDraft] = useState<Draft>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeWindow, setActiveWindow] = useState<WindowKey | null>(null)
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
    // Asked once: the time field and the window filter stay hidden until
    // 009_measurement_time.sql has been run, rather than erroring on save.
    void hasMeasurementTime().then(setTimeSupported)
  }, [reload])

  useEffect(() => {
    if (program.status === 'ready') {
      const goal = program.data.settings.goal_weight_lbs
      setGoalDraft(goal === null || goal === undefined ? '' : String(Number(goal)))
    }
  }, [program.status])

  if (program.status === 'error') return <ErrorState message={program.message} />
  if (loadError) return <ErrorState message={loadError} />
  if (program.status === 'loading' || metrics === null) return <Loading what="your numbers" />

  const settings = program.data.settings
  const win = {
    start: settings.metrics_window_start ?? DEFAULT_WINDOW.start,
    end: settings.metrics_window_end ?? DEFAULT_WINDOW.end,
  }
  const windowLabel = `${formatClockTime(win.start)}–${formatClockTime(win.end)}`

  const spec = fieldFor(field)
  const filterOn = windowOnly && timeSupported === true
  const visible = filterOn ? withinWindow(metrics, win.start, win.end) : metrics
  const points = series(visible, field)
  const droppedUntimed = countUntimed(metrics, field)

  // The goal only exists for weight; the other fields get a rate and no date.
  const goal = field === 'weight_lbs' ? settings.goal_weight_lbs : null
  const goalNumber = goal === null || goal === undefined ? null : Number(goal)

  const latest = latestAndPrevious(visible, field)
  const today = localDateString()
  const windows = evaluateAll(points, goalNumber, today)
  const active = windows.find((w) => w.key === activeWindow && w.status === 'ready')
  const trend: TrendLine | null =
    active && active.status === 'ready'
      ? {
          slopePerDay: active.fit.slopePerDay,
          intercept: active.fit.intercept,
          fromDate: active.fit.firstDate,
          throughDate: chartEndDate(active, today) ?? active.fit.lastDate,
          todayDate: today,
        }
      : null
  const locked = windows.filter((w) => w.status === 'insufficient')

  async function handleSave() {
    const values = valuesFrom(draft)
    if (isEmpty(values)) {
      setSaveError('Nothing to save — fill in at least one number.')
      return
    }
    setBusy(true)
    setSaveError(null)
    try {
      await saveMetric(date, values, timeSupported ? (time || null) : undefined)
      setDraft({})
      setEditingId(null)
      setDate(localDateString())
      setTime(nowTimeInput())
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
        setTime(nowTimeInput())
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
    setTime(toTimeInput(metric.measured_at))
    setDraft(draftFrom(metric))
    setSaveError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Screen title="Body" subtitle="Weight and measurements. Every field is optional.">
      {/* --- what the chart is showing ------------------------------------- */}
      <SectionLabel>Showing</SectionLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {FIELDS.map((f) => {
          const count = series(metrics, f.key).length
          const on = field === f.key
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setField(f.key)
                setActiveWindow(null)
              }}
              className={`min-h-11 rounded-card border px-3 text-small font-medium ${
                on
                  ? 'border-accent bg-accent text-white'
                  : count === 0
                    ? 'border-line bg-sunken text-faint'
                    : 'border-line bg-surface active:bg-sunken'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-label ${on ? 'text-white/70' : 'text-faint'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* --- headline ------------------------------------------------------ */}
      <Card className="mt-3 p-5">
        {latest.latest ? (
          <>
            <p className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
              Latest {spec.label.toLowerCase()}
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-stamp)] text-display font-semibold tabular-nums">
                {Math.round(latest.latest.value * 10) / 10}
              </span>
              <span className="text-title text-faint">{spec.unit}</span>
            </p>
            <p className="mt-1 text-small text-muted">
              {relativeDay(latest.latest.date)}
              {latest.previous && (
                <>
                  {' · '}
                  {formatDelta(latest.latest.value - latest.previous.value, spec.unit)} since{' '}
                  {relativeDay(latest.previous.date)}
                </>
              )}
            </p>
            {goalNumber !== null && (
              <p className="mt-1 text-small text-accent-ink">
                {Math.abs(Math.round((latest.latest.value - goalNumber) * 10) / 10)} {spec.unit}{' '}
                {latest.latest.value > goalNumber ? 'above' : 'below'} your {goalNumber}{' '}
                {spec.unit} goal
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-heading font-semibold">
              {filterOn ? `No ${spec.label.toLowerCase()} readings in that window` : 'Nothing recorded yet'}
            </h2>
            <p className="mt-2 text-small text-muted">
              {filterOn
                ? `${droppedUntimed} ${spec.label.toLowerCase()} ${droppedUntimed === 1 ? 'reading has' : 'readings have'} no recorded time, so the filter can't place them. Add times by editing an entry below.`
                : `Add a ${spec.label.toLowerCase()} reading below and this fills in.`}
            </p>
          </>
        )}
      </Card>

      {/* --- chart --------------------------------------------------------- */}
      <div className="mt-3">
        <SectionLabel>{spec.label} over time</SectionLabel>
        <Card className="mt-2 p-3">
          <WeightChart points={points} goal={goalNumber} trend={trend} minSpan={spec.minSpan} />
        </Card>
      </div>

      {/* --- time-of-day filter -------------------------------------------- */}
      {timeSupported === true && (
        <Card className="mt-2 p-4">
          <button
            type="button"
            role="switch"
            aria-checked={windowOnly}
            onClick={() => {
              setWindowOnly((v) => !v)
              setActiveWindow(null)
            }}
            className="flex w-full items-center gap-3 text-left"
          >
            <span
              aria-hidden
              className={`flex h-7 w-12 shrink-0 items-center rounded-pill px-1 ${
                windowOnly ? 'justify-end bg-accent' : 'justify-start bg-line-strong'
              }`}
            >
              <span className="block size-5 rounded-pill bg-surface" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-small font-medium">Before dinner only</span>
              <span className="block text-small text-muted">{windowLabel}</span>
            </span>
          </button>

          {windowOnly && droppedUntimed > 0 && (
            <p className="mt-3 text-small text-faint">
              {droppedUntimed} {droppedUntimed === 1 ? 'reading has' : 'readings have'} no recorded
              time and {droppedUntimed === 1 ? 'is' : 'are'} excluded. Readings taken before today
              never captured one — edit an entry to fill it in.
            </p>
          )}
        </Card>
      )}

      {/* --- projection ---------------------------------------------------- */}
      {points.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Projection</SectionLabel>
          <Card className="mt-2 p-4">
            <div className="flex gap-2">
              {windows.map((w) => {
                const ready = w.status === 'ready'
                const on = activeWindow === w.key && ready
                return (
                  <button
                    key={w.key}
                    type="button"
                    disabled={!ready}
                    aria-pressed={on}
                    aria-label={`Trend over the last ${w.label}`}
                    onClick={() => setActiveWindow(on ? null : w.key)}
                    className={`min-h-11 flex-1 rounded-card border text-small font-medium ${
                      on
                        ? 'border-accent bg-accent text-white'
                        : ready
                          ? 'border-line bg-surface active:bg-sunken'
                          : 'border-line bg-sunken text-faint'
                    }`}
                  >
                    {w.key.toUpperCase()}
                  </button>
                )
              })}
            </div>

            {active && active.status === 'ready' ? (
              <ProjectionReadout
                state={active}
                goal={goalNumber}
                unit={spec.unit}
                label={spec.label}
              />
            ) : (
              <p className="mt-3 text-small text-muted">
                {activeWindow === null
                  ? 'Pick a window to fit a trend line. Tap it again to hide it.'
                  : 'That window does not have enough history yet.'}
              </p>
            )}

            {locked.length > 0 && (
              <p className="mt-2 text-small text-faint">
                {locked.map((w) => w.key.toUpperCase()).join(' and ')}{' '}
                {locked.length === 1 ? 'needs' : 'need'} more{' '}
                {filterOn ? 'in-window ' : ''}history.
              </p>
            )}

            {filterOn && (
              <p className="mt-2 text-small text-faint">
                Fitted to the {windowLabel} readings only.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* --- entry form ---------------------------------------------------- */}
      <div className="mt-6">
        <SectionLabel>{editingId ? 'Edit entry' : 'Add an entry'}</SectionLabel>
        <Card className="mt-2 p-4">
          <div className="flex gap-2">
            <label className="min-w-0 flex-1">
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
            {timeSupported === true && (
              <label className="min-w-0 flex-1">
                <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
                  Time
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 block min-h-12 w-full rounded-card border border-line bg-surface px-3
                             text-body outline-none focus:border-line-strong"
                />
              </label>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
                  {f.label} <span className="font-normal normal-case">({f.unit})</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={f.step}
                  min={0}
                  value={draft[f.key] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
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
                setTime(nowTimeInput())
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
            Drawn as the dashed line on the weight chart. Clear it to remove the line.
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
                    <span className="font-medium">
                      {metric.date}
                      {formatClockTime(metric.measured_at) && (
                        <span className="ml-2 text-small font-normal text-muted">
                          {formatClockTime(metric.measured_at)}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-small text-muted">
                      {relativeDay(metric.date)}
                    </span>
                  </div>

                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {FIELDS.filter((f) => metric[f.key] !== null).map((f) => (
                      <div key={f.key} className="text-small">
                        <dt className="inline text-muted">{f.label} </dt>
                        <dd className="inline font-medium tabular-nums">
                          {formatValue(metric[f.key], f.unit)}
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

/** The sentence under the window chips. Always reports the rate; only names a
 *  date when the field has a goal to aim at. */
function ProjectionReadout({
  state,
  goal,
  unit,
  label,
}: {
  state: Extract<WindowState, { status: 'ready' }>
  goal: number | null
  unit: string
  label: string
}) {
  const { fit, projection } = state
  const magnitude = Math.abs(Math.round(fit.perWeek * 100) / 100)
  const rate = `${fit.perWeek >= 0 ? '+' : '−'}${magnitude} ${unit}/week`

  let headline: string
  let detail: string | null = null

  switch (projection.status) {
    case 'reaches': {
      const [y, m, d] = projection.date.split('-').map(Number)
      const when = new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      const weeks = Math.round(projection.days / 7)
      headline = `${goal} ${unit} around ${when}`
      detail = `${rate} · about ${weeks} ${weeks === 1 ? 'week' : 'weeks'} away`
      break
    }
    case 'beyond':
      headline = 'More than a year away'
      detail = `${rate} at this rate`
      break
    case 'away':
      headline = `Not heading for ${goal} ${unit}`
      detail = `${rate} over this window — moving away from the goal, so there's no date to project.`
      break
    case 'flat':
      headline = 'Flat over this window'
      detail = 'No trend to project from.'
      break
    case 'reached':
      headline = `Already at ${goal} ${unit} on this trend`
      break
    case 'no-goal':
      // Every field except weight lands here: a rate is still the useful part.
      headline = rate
      detail = `${label} over this window. No goal set for it, so there's no date to project.`
      break
  }

  return (
    <div className="mt-3">
      <p className="text-heading font-semibold">{headline}</p>
      {detail && <p className="mt-0.5 text-small text-muted">{detail}</p>}
      <p className="mt-2 text-small text-faint">
        Fitted to {fit.readings} readings over {Math.round(fit.spanDays)} days ·{' '}
        {fitQuality(fit.r2)} fit (R² {fit.r2.toFixed(2)})
      </p>
    </div>
  )
}
