import { dayNumber, isoFromDay, type ChartPoint } from './metrics'

export { dayNumber, isoFromDay }

/* ---------------------------------------------------------------------------
   Least-squares fit over a window of weigh-ins, and what it implies about
   reaching the goal.

   The point of the windows is to compare a recent rate against a longer one.
   The point of the gating below is that a rate fitted to three readings across
   six days is noise wearing a trend's clothes -- it will happily claim you're
   two weeks from a goal you're months from.
   --------------------------------------------------------------------------- */

export type WindowKey = '2w' | '1m' | '2m' | '6m'

export const WINDOWS: { key: WindowKey; label: string; days: number }[] = [
  { key: '2w', label: '2 weeks', days: 14 },
  { key: '1m', label: '1 month', days: 30 },
  { key: '2m', label: '2 months', days: 60 },
  { key: '6m', label: '6 months', days: 182 },
]

/** A window needs this many weigh-ins before it's offered at all. */
export const MIN_READINGS = 4

/** ...and they have to cover this much of the window. Four readings crammed
 *  into the last three days don't describe a month, whatever they're labelled. */
export const MIN_SPAN_FRACTION = 0.7

/** Past this, the answer is "not this year" rather than a date. */
export const MAX_PROJECTION_DAYS = 365

/** Below this the trend is flat enough that dividing by it produces nonsense. */
const FLAT_LBS_PER_WEEK = 0.05

export type Fit = {
  slopePerDay: number
  intercept: number
  /** 0 to 1. How much of the variation the line actually explains. */
  r2: number
  readings: number
  spanDays: number
  perWeek: number
  firstDate: string
  lastDate: string
}

export function linearFit(points: ChartPoint[]): Fit | null {
  if (points.length < 2) return null

  const xs = points.map((p) => dayNumber(p.date))
  const ys = points.map((p) => p.value)
  const n = points.length
  const meanX = xs.reduce((s, x) => s + x, 0) / n
  const meanY = ys.reduce((s, y) => s + y, 0) / n

  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - meanX) * (ys[i]! - meanY)
    den += (xs[i]! - meanX) ** 2
  }
  // Every reading on the same day: a vertical line, no slope to speak of.
  if (den === 0) return null

  const slopePerDay = num / den
  const intercept = meanY - slopePerDay * meanX

  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0)
  const ssRes = ys.reduce((s, y, i) => s + (y - (slopePerDay * xs[i]! + intercept)) ** 2, 0)

  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1))

  return {
    slopePerDay,
    intercept,
    r2: ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot),
    readings: n,
    spanDays: Math.max(...xs) - Math.min(...xs),
    perWeek: slopePerDay * 7,
    firstDate: sorted[0]!.date,
    lastDate: sorted[sorted.length - 1]!.date,
  }
}

export function valueAt(fit: Fit, day: number): number {
  return fit.slopePerDay * day + fit.intercept
}

export type Projection =
  | { status: 'reaches'; date: string; days: number }
  | { status: 'beyond' }
  | { status: 'away' }
  | { status: 'flat' }
  | { status: 'reached' }
  | { status: 'no-goal' }

export function project(fit: Fit, goal: number | null, todayIso: string): Projection {
  if (goal === null) return { status: 'no-goal' }

  const today = dayNumber(todayIso)
  const current = valueAt(fit, today)
  const gap = goal - current

  if (Math.abs(gap) < 0.1) return { status: 'reached' }
  if (Math.abs(fit.perWeek) < FLAT_LBS_PER_WEEK) return { status: 'flat' }
  // Moving the wrong way: the line never crosses the goal going forward.
  if (Math.sign(gap) !== Math.sign(fit.slopePerDay)) return { status: 'away' }

  const days = gap / fit.slopePerDay
  if (days > MAX_PROJECTION_DAYS) return { status: 'beyond' }
  return { status: 'reaches', date: isoFromDay(today + days), days: Math.round(days) }
}

export type WindowState =
  | {
      key: WindowKey
      label: string
      days: number
      status: 'ready'
      fit: Fit
      projection: Projection
    }
  | {
      key: WindowKey
      label: string
      days: number
      status: 'insufficient'
      readings: number
      spanDays: number
      /** Roughly how many more days of history this window needs. */
      needDays: number
    }

/** Decide whether a window can be trusted, and if so what it says. */
export function evaluateWindow(
  all: ChartPoint[],
  window: { key: WindowKey; label: string; days: number },
  goal: number | null,
  todayIso: string,
): WindowState {
  const today = dayNumber(todayIso)
  const cutoff = today - window.days
  const inWindow = all.filter((p) => dayNumber(p.date) >= cutoff)

  const requiredSpan = window.days * MIN_SPAN_FRACTION
  const xs = inWindow.map((p) => dayNumber(p.date))
  const spanDays = xs.length > 0 ? Math.max(...xs) - Math.min(...xs) : 0

  const base = { key: window.key, label: window.label, days: window.days }

  if (inWindow.length < MIN_READINGS || spanDays < requiredSpan) {
    return {
      ...base,
      status: 'insufficient',
      readings: inWindow.length,
      spanDays: Math.round(spanDays),
      needDays: Math.max(0, Math.ceil(requiredSpan - spanDays)),
    }
  }

  const fit = linearFit(inWindow)
  if (!fit) {
    return {
      ...base,
      status: 'insufficient',
      readings: inWindow.length,
      spanDays: Math.round(spanDays),
      needDays: Math.max(1, Math.ceil(requiredSpan - spanDays)),
    }
  }

  return { ...base, status: 'ready', fit, projection: project(fit, goal, todayIso) }
}

export function evaluateAll(
  all: ChartPoint[],
  goal: number | null,
  todayIso: string,
): WindowState[] {
  return WINDOWS.map((w) => evaluateWindow(all, w, goal, todayIso))
}

/** Plain words for R². A number most people don't read is worth translating. */
export function fitQuality(r2: number): string {
  if (r2 >= 0.8) return 'tight'
  if (r2 >= 0.5) return 'moderate'
  return 'loose'
}

/** How far right the chart should run for this window: out to the projected
 *  date when the trend is heading for the goal, otherwise not at all. A trend
 *  moving away from the goal has no date to show. */
export function chartEndDate(state: WindowState, todayIso: string): string | null {
  if (state.status !== 'ready') return null
  const p = state.projection
  if (p.status === 'reaches') return p.date
  if (p.status === 'beyond') return isoFromDay(dayNumber(todayIso) + MAX_PROJECTION_DAYS)
  return null
}
