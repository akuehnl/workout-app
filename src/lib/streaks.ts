import type { TrainingLog } from './log'

/** Four sessions a week is the commitment. The streak asks one question of
 *  each week -- did it reach four? -- and nothing about which days. */
export const WEEKLY_TARGET = 4

const DAY_MS = 86_400_000

/** Weeks run Monday to Sunday. That isn't arbitrary: program_start is a
 *  Monday, so these are the same week boundaries the phase counter already
 *  uses, and a week never straddles a phase change. */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** The Monday on or before `d`. */
export function startOfWeek(d: Date): Date {
  const day = d.getDay() // 0 = Sunday
  const back = day === 0 ? 6 : day - 1
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back)
}

export type WeekSummary = {
  /** Monday, ISO. */
  start: string
  /** Sunday, ISO. */
  end: string
  count: number
  hitTarget: boolean
  /** The week we're in now -- still has time left on it. */
  isCurrent: boolean
}

/** One row per week from the first logged session through this week, newest
 *  first. Weeks with nothing in them are included: a gap is information. */
export function buildWeeks(logs: TrainingLog[], now: Date = new Date()): WeekSummary[] {
  if (logs.length === 0) return []

  const counts = new Map<string, number>()
  let earliest: Date | null = null

  for (const log of logs) {
    const monday = startOfWeek(localDate(log.date))
    const key = iso(monday)
    counts.set(key, (counts.get(key) ?? 0) + 1)
    if (!earliest || monday < earliest) earliest = monday
  }

  const currentMonday = startOfWeek(now)
  const currentKey = iso(currentMonday)

  const weeks: WeekSummary[] = []
  for (let cursor = new Date(currentMonday); cursor >= earliest!; ) {
    const key = iso(cursor)
    const count = counts.get(key) ?? 0
    weeks.push({
      start: key,
      end: iso(new Date(cursor.getTime() + 6 * DAY_MS)),
      count,
      hitTarget: count >= WEEKLY_TARGET,
      isCurrent: key === currentKey,
    })
    cursor = new Date(cursor.getTime() - 7 * DAY_MS)
  }
  return weeks
}

/** Consecutive weeks that reached the target, counting back from now.
 *
 *  A current week that hasn't got there yet is skipped rather than counted as
 *  a miss -- it isn't over. It only becomes a break once the week has ended
 *  under four. A current week that HAS reached four counts immediately. */
export function consecutiveWeeks(weeks: WeekSummary[]): number {
  let i = 0
  if (weeks[0]?.isCurrent && !weeks[0].hitTarget) i = 1

  let streak = 0
  for (; i < weeks.length; i++) {
    if (!weeks[i]!.hitTarget) break
    streak++
  }
  return streak
}

export function sessionsThisWeek(weeks: WeekSummary[]): number {
  return weeks[0]?.isCurrent ? weeks[0].count : 0
}

/** Whole days since the most recent session, or null if there are none. */
export function daysSinceLast(logs: TrainingLog[], now: Date = new Date()): number | null {
  let latest: string | null = null
  for (const log of logs) if (!latest || log.date > latest) latest = log.date
  if (!latest) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((today.getTime() - localDate(latest).getTime()) / DAY_MS))
}

/** "25 Aug – 31 Aug", dropping the repeated month where it reads better. */
export function formatWeekRange(week: WeekSummary): string {
  const start = localDate(week.start)
  const end = localDate(week.end)
  const month = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' })
  const sameMonth = start.getMonth() === end.getMonth()
  return sameMonth
    ? `${start.getDate()}–${end.getDate()} ${month(start)}`
    : `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)}`
}
