import { supabase } from './supabase'

export type Metric = {
  id: string
  date: string
  weight_lbs: number | null
  chest_in: number | null
  waist_in: number | null
  hips_in: number | null
  arm_in: number | null
  thigh_in: number | null
}

export type MetricField = Exclude<keyof Metric, 'id' | 'date'>

/** The fields, in the order they're entered and shown. Weight leads because
 *  it's the one that gets logged on its own most days. */
export const FIELDS: { key: MetricField; label: string; unit: string; step: number }[] = [
  { key: 'weight_lbs', label: 'Weight', unit: 'lb', step: 0.1 },
  { key: 'chest_in', label: 'Chest', unit: 'in', step: 0.25 },
  { key: 'waist_in', label: 'Waist', unit: 'in', step: 0.25 },
  { key: 'hips_in', label: 'Hips', unit: 'in', step: 0.25 },
  { key: 'arm_in', label: 'Arm', unit: 'in', step: 0.25 },
  { key: 'thigh_in', label: 'Thigh', unit: 'in', step: 0.25 },
]

export type MetricValues = Partial<Record<MetricField, number | null>>

export async function fetchMetrics(): Promise<Metric[]> {
  const { data, error } = await supabase.from('metrics').select('*').order('date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Metric[]
}

/** One row per date, so saving the same day again corrects it instead of
 *  stacking a second entry. */
export async function saveMetric(date: string, values: MetricValues): Promise<void> {
  const { error } = await supabase
    .from('metrics')
    .upsert({ date, ...values }, { onConflict: 'date' })
  if (error) throw new Error(error.message)
}

export async function deleteMetric(id: string): Promise<void> {
  const { error } = await supabase.from('metrics').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function saveGoalWeight(goal: number | null): Promise<void> {
  const { error } = await supabase.from('settings').update({ goal_weight_lbs: goal }).eq('id', 1)
  if (error) throw new Error(error.message)
}

/** True when the row carries nothing worth saving. */
export function isEmpty(values: MetricValues): boolean {
  return FIELDS.every(({ key }) => values[key] === null || values[key] === undefined)
}

/** Oldest-first weight readings, which is the order a chart needs. */
export function weightSeries(metrics: Metric[]): { date: string; value: number }[] {
  return metrics
    .filter((m): m is Metric & { weight_lbs: number } => m.weight_lbs !== null)
    .map((m) => ({ date: m.date, value: Number(m.weight_lbs) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** The most recent non-null reading for a field, and the one before it, so the
 *  screen can show a direction of travel without inventing a trend line. */
export function latestAndPrevious(
  metrics: Metric[],
  field: MetricField,
): { latest: { date: string; value: number } | null; previous: { date: string; value: number } | null } {
  const readings = metrics
    .filter((m) => m[field] !== null)
    .map((m) => ({ date: m.date, value: Number(m[field]) }))
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0)) // newest first
  return { latest: readings[0] ?? null, previous: readings[1] ?? null }
}

/** Numbers move in the direction you want or they don't; which direction is
 *  "good" depends on the goal, so this only reports the delta and leaves the
 *  judgement to whoever reads it. */
export function formatDelta(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10
  if (rounded === 0) return `no change`
  const sign = rounded > 0 ? '+' : '−'
  return `${sign}${Math.abs(rounded)} ${unit}`
}

export function formatValue(value: number | null, unit: string): string {
  if (value === null) return '—'
  const rounded = Math.round(Number(value) * 10) / 10
  return `${rounded} ${unit}`
}

/* ---------------------------------------------------------------------------
   Chart geometry.

   Kept as a pure function so the scaling can be tested without a browser, and
   so the chart stays ~60 lines of inline SVG rather than a charting library.
   --------------------------------------------------------------------------- */

export type ChartPoint = { date: string; value: number }

export type ChartGeometry = {
  width: number
  height: number
  /** Polyline through the readings. */
  path: string
  dots: { x: number; y: number; date: string; value: number }[]
  /** Null when no goal is set -- the line simply isn't drawn. */
  goalY: number | null
  yTicks: { y: number; label: string }[]
  xLabels: { x: number; label: string; anchor: 'start' | 'middle' | 'end' }[]
  /** The fitted trend, when one is being shown. */
  trendPath: string | null
  /** Where today sits once the axis runs into the future, so the projection
   *  can be visually separated from what has actually happened. */
  todayX: number | null
}

/** A fitted line to draw. It spans only the readings it was fitted to and then
 *  forward -- extrapolating it back across data it never saw would put a steep
 *  two-week slope somewhere absurd a month ago. */
export type TrendLine = {
  slopePerDay: number
  intercept: number
  fromDate: string
  throughDate: string
  todayDate: string
}

const PAD = { top: 10, right: 10, bottom: 20, left: 32 }

/** A nearly-flat series shouldn't be stretched into a mountain range, so the
 *  y-axis never spans less than this. */
const MIN_SPAN_LBS = 4

/* Day arithmetic, anchored to a fixed LOCAL midnight.
 *
 * The obvious version -- local-midnight-ms / 86400000 -- is not a whole number
 * anywhere except UTC, and rounding it back to a date lands a day early west
 * of Greenwich. Counting whole days from a local reference instead is exact,
 * and going through the Date constructor keeps it right across DST, where a
 * day is 23 or 25 hours long. */
const DAY_MS = 86_400_000
const EPOCH = new Date(2000, 0, 1).getTime()

export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round((new Date(y!, (m ?? 1) - 1, d ?? 1).getTime() - EPOCH) / DAY_MS)
}

export function isoFromDay(day: number): string {
  const date = new Date(2000, 0, 1 + Math.round(day))
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dateMs(iso: string): number {
  return EPOCH + dayNumber(iso) * DAY_MS
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function buildChart(
  points: ChartPoint[],
  goal: number | null,
  trend: TrendLine | null = null,
  width = 320,
  height = 170,
): ChartGeometry | null {
  if (points.length === 0) return null

  const trendAt = (day: number) => trend!.slopePerDay * day + trend!.intercept

  const values = points.map((p) => p.value)
  // The goal has to be inside the domain or the line would sit off-canvas, and
  // so do both ends of the trend line for the same reason.
  const candidates = goal !== null ? [...values, goal] : [...values]
  if (trend) {
    candidates.push(trendAt(dayNumber(trend.fromDate)))
    candidates.push(trendAt(dayNumber(trend.throughDate)))
  }
  let lo = Math.min(...candidates)
  let hi = Math.max(...candidates)

  if (hi - lo < MIN_SPAN_LBS) {
    const mid = (hi + lo) / 2
    lo = mid - MIN_SPAN_LBS / 2
    hi = mid + MIN_SPAN_LBS / 2
  }
  const breathingRoom = (hi - lo) * 0.12
  lo -= breathingRoom
  hi += breathingRoom

  const x0 = PAD.left
  const x1 = width - PAD.right
  const y0 = PAD.top
  const y1 = height - PAD.bottom

  const times = points.map((p) => dateMs(p.date))
  const tMin = Math.min(...times)
  // The axis runs out to the projection when there is one.
  const tMax = Math.max(...times, trend ? dateMs(trend.throughDate) : -Infinity)
  // A single reading, or several on one day, sits in the middle rather than
  // dividing by zero.
  const xOf = (t: number) =>
    tMax === tMin ? (x0 + x1) / 2 : x0 + ((t - tMin) / (tMax - tMin)) * (x1 - x0)
  const yOf = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0)

  const dots = points.map((p, i) => ({
    x: Math.round(xOf(times[i]!) * 10) / 10,
    y: Math.round(yOf(p.value) * 10) / 10,
    date: p.date,
    value: p.value,
  }))

  const path = dots.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x},${d.y}`).join(' ')

  const yTicks = [hi, (hi + lo) / 2, lo].map((v) => ({
    y: Math.round(yOf(v) * 10) / 10,
    label: String(Math.round(v)),
  }))

  const first = points[0]!
  const last = points[points.length - 1]!
  const rightLabel = trend ? trend.throughDate : last.date
  const xLabels =
    !trend && (points.length === 1 || first.date === last.date)
      ? [{ x: (x0 + x1) / 2, label: shortDate(first.date), anchor: 'middle' as const }]
      : [
          { x: x0, label: shortDate(first.date), anchor: 'start' as const },
          { x: x1, label: shortDate(rightLabel), anchor: 'end' as const },
        ]

  let trendPath: string | null = null
  let todayX: number | null = null
  if (trend) {
    const fromMs = dateMs(trend.fromDate)
    const throughMs = dateMs(trend.throughDate)
    const y1v = trendAt(dayNumber(trend.fromDate))
    const y2v = trendAt(dayNumber(trend.throughDate))
    trendPath =
      `M${Math.round(xOf(fromMs) * 10) / 10},${Math.round(yOf(y1v) * 10) / 10} ` +
      `L${Math.round(xOf(throughMs) * 10) / 10},${Math.round(yOf(y2v) * 10) / 10}`
    todayX = Math.round(xOf(dateMs(trend.todayDate)) * 10) / 10
  }

  return {
    width,
    height,
    path,
    dots,
    goalY: goal === null ? null : Math.round(yOf(goal) * 10) / 10,
    yTicks,
    xLabels,
    trendPath,
    todayX,
  }
}
