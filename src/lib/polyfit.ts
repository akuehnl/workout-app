import { dayNumber, isoFromDay, type ChartPoint } from './metrics'
import {
  MAX_PROJECTION_DAYS,
  MIN_READINGS,
  MIN_SPAN_FRACTION,
  WINDOWS,
  type Projection,
  type WindowKey,
} from './regression'

/* ---------------------------------------------------------------------------
   Polynomial fits, offered alongside the straight line.

   A curve will describe the readings you already have better than a line does
   — that is close to guaranteed, since it has more freedom to bend. It does
   NOT follow that it predicts better. Extrapolating a quadratic a few months
   past the last reading can send it somewhere absurd, and a cubic more so.
   Hence the per-degree minimums below, and hence the warning the UI shows.
   --------------------------------------------------------------------------- */

export type ModelKind = 'linear' | 'quadratic' | 'cubic'

export const MODELS: {
  kind: ModelKind
  label: string
  degree: number
  minReadings: number
}[] = [
  { kind: 'linear', label: 'Line', degree: 1, minReadings: MIN_READINGS },
  { kind: 'quadratic', label: 'Curve', degree: 2, minReadings: 8 },
  { kind: 'cubic', label: 'Cubic', degree: 3, minReadings: 12 },
]

export function modelFor(kind: ModelKind) {
  return MODELS.find((m) => m.kind === kind) ?? MODELS[0]!
}

export type PolyFit = {
  kind: ModelKind
  degree: number
  /** Ascending powers, applied to (day - x0). */
  coefficients: number[]
  /** Day numbers run to ~9,800; cubing that wrecks the conditioning of the
   *  normal equations, so the fit is centred on the first reading. */
  x0: number
  r2: number
  readings: number
  spanDays: number
  firstDate: string
  lastDate: string
  /** Rate at the LAST reading, per week. For a line that is just the slope;
   *  for a curve it is the tangent at the end, which is the honest answer to
   *  "what is it doing now". */
  perWeek: number
}

/** Gauss-Jordan with partial pivoting. At most 4x4 here, so the plain
 *  implementation is the right one. Returns null if the system is singular,
 *  which happens when every reading sits on one day. */
function solve(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length
  const m = matrix.map((row, i) => [...row, rhs[i]!])

  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r
    }
    if (Math.abs(m[pivot]![col]!) < 1e-12) return null

    const swap = m[col]!
    m[col] = m[pivot]!
    m[pivot] = swap

    const d = m[col]![col]!
    for (let c = col; c <= n; c++) m[col]![c] = m[col]![c]! / d

    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = m[r]![col]!
      if (factor === 0) continue
      for (let c = col; c <= n; c++) m[r]![c] = m[r]![c]! - factor * m[col]![c]!
    }
  }
  return m.map((row) => row[n]!)
}

/** Horner, so the evaluation stays stable at higher degrees. */
export function polyAt(fit: PolyFit, day: number): number {
  const x = day - fit.x0
  let out = 0
  for (let i = fit.coefficients.length - 1; i >= 0; i--) {
    out = out * x + fit.coefficients[i]!
  }
  return out
}

/** Derivative, per day. */
export function polySlope(fit: PolyFit, day: number): number {
  const x = day - fit.x0
  let out = 0
  for (let i = fit.coefficients.length - 1; i >= 1; i--) {
    out = out * x + i * fit.coefficients[i]!
  }
  return out
}

export function fitPolynomial(points: ChartPoint[], kind: ModelKind): PolyFit | null {
  const spec = modelFor(kind)
  const degree = spec.degree
  if (points.length < degree + 1) return null

  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1))
  const x0 = dayNumber(sorted[0]!.date)
  const xs = sorted.map((p) => dayNumber(p.date) - x0)
  const ys = sorted.map((p) => p.value)

  // Normal equations for the Vandermonde system: (VᵀV)c = Vᵀy.
  const n = degree + 1
  const a: number[][] = []
  const b: number[] = []
  for (let i = 0; i < n; i++) {
    const row: number[] = []
    for (let j = 0; j < n; j++) {
      row.push(xs.reduce((sum, x) => sum + Math.pow(x, i + j), 0))
    }
    a.push(row)
    b.push(xs.reduce((sum, x, k) => sum + Math.pow(x, i) * ys[k]!, 0))
  }

  const coefficients = solve(a, b)
  if (!coefficients || coefficients.some((c) => !Number.isFinite(c))) return null

  const fit: PolyFit = {
    kind,
    degree,
    coefficients,
    x0,
    r2: 0,
    readings: points.length,
    spanDays: Math.max(...xs) - Math.min(...xs),
    firstDate: sorted[0]!.date,
    lastDate: sorted[sorted.length - 1]!.date,
    perWeek: 0,
  }

  const meanY = ys.reduce((s, y) => s + y, 0) / ys.length
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0)
  const ssRes = ys.reduce((s, y, k) => s + (y - polyAt(fit, xs[k]! + x0)) ** 2, 0)
  fit.r2 = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot))
  fit.perWeek = polySlope(fit, dayNumber(fit.lastDate)) * 7

  return fit
}

/** When the fitted model crosses the goal.
 *
 *  Scanned forward a day at a time rather than solved algebraically: it works
 *  at any degree, finds the FIRST crossing rather than whichever root the
 *  algebra hands back, and cannot return a date in the past. */
export function projectPoly(
  fit: PolyFit,
  goal: number | null,
  today: string,
): Projection {
  if (goal === null) return { status: 'no-goal' }

  const t0 = dayNumber(today)
  const current = polyAt(fit, t0)
  if (Math.abs(goal - current) < 0.1) return { status: 'reached' }

  let previous = current
  for (let d = 1; d <= MAX_PROJECTION_DAYS; d++) {
    const value = polyAt(fit, t0 + d)
    if ((previous - goal) * (value - goal) <= 0) {
      return { status: 'reaches', date: isoFromDay(t0 + d), days: d }
    }
    previous = value
  }

  const perWeekNow = polySlope(fit, t0) * 7
  if (Math.abs(perWeekNow) < 0.05) return { status: 'flat' }
  return Math.sign(goal - current) !== Math.sign(perWeekNow)
    ? { status: 'away' }
    : { status: 'beyond' }
}

export type ModelWindowState =
  | {
      key: WindowKey
      label: string
      days: number
      status: 'ready'
      fit: PolyFit
      projection: Projection
    }
  | {
      key: WindowKey
      label: string
      days: number
      status: 'insufficient'
      readings: number
      spanDays: number
      needDays: number
      /** Set when the window covers enough time but holds too few readings for
       *  this degree -- a different problem from "come back in two weeks". */
      needReadings: number
    }

/** The same gate as the linear path, plus the degree's own minimum: a
 *  quadratic through five readings is a shape, not a trend. */
export function evaluateWindowFor(
  all: ChartPoint[],
  window: { key: WindowKey; label: string; days: number },
  kind: ModelKind,
  goal: number | null,
  today: string,
): ModelWindowState {
  const spec = modelFor(kind)
  const cutoff = dayNumber(today) - window.days
  const inWindow = all.filter((p) => dayNumber(p.date) >= cutoff)

  const requiredSpan = window.days * MIN_SPAN_FRACTION
  const xs = inWindow.map((p) => dayNumber(p.date))
  const spanDays = xs.length > 0 ? Math.max(...xs) - Math.min(...xs) : 0
  const base = { key: window.key, label: window.label, days: window.days }

  const enough = inWindow.length >= spec.minReadings && spanDays >= requiredSpan
  if (enough) {
    const fit = fitPolynomial(inWindow, kind)
    if (fit) {
      return { ...base, status: 'ready', fit, projection: projectPoly(fit, goal, today) }
    }
  }

  return {
    ...base,
    status: 'insufficient',
    readings: inWindow.length,
    spanDays: Math.round(spanDays),
    needDays: Math.max(0, Math.ceil(requiredSpan - spanDays)),
    needReadings: Math.max(0, spec.minReadings - inWindow.length),
  }
}

export function evaluateAllFor(
  all: ChartPoint[],
  kind: ModelKind,
  goal: number | null,
  today: string,
): ModelWindowState[] {
  return WINDOWS.map((w) => evaluateWindowFor(all, w, kind, goal, today))
}

export function chartEndDateFor(state: ModelWindowState, today: string): string | null {
  if (state.status !== 'ready') return null
  const p = state.projection
  if (p.status === 'reaches') return p.date
  if (p.status === 'beyond') return isoFromDay(dayNumber(today) + MAX_PROJECTION_DAYS)
  return null
}
