import { Link } from 'react-router-dom'
import { useHistory } from '../lib/useHistory'
import {
  WEEKLY_TARGET,
  buildWeeks,
  consecutiveWeeks,
  daysSinceLast,
  formatWeekRange,
  sessionsThisWeek,
} from '../lib/streaks'
import { Card, ErrorState, Loading, Screen } from '../components/Ui'

export default function Streaks() {
  const history = useHistory()

  if (history.status === 'loading') return <Loading what="your history" />
  if (history.status === 'error') return <ErrorState message={history.message} />

  const { logs } = history.data

  if (logs.length === 0) {
    return (
      <Screen title="Streaks">
        <Card className="p-5">
          <h2 className="text-heading font-semibold">Nothing to count yet</h2>
          <p className="mt-2 text-small text-muted">
            This asks one question of each week: did you get four sessions in? Not which days —
            four across Monday to Thursday and four spread over seven days are the same good week.
          </p>
          <p className="mt-2 text-small text-muted">
            Once you&rsquo;ve logged a couple of weeks it&rsquo;ll show this week&rsquo;s count,
            how many weeks in a row you&rsquo;ve hit four, and a week-by-week history.
          </p>
          <Link
            to="/today"
            className="mt-3 flex min-h-14 items-center justify-center rounded-card bg-ink px-4
                       text-body font-semibold text-white active:opacity-90"
          >
            Start a session
          </Link>
        </Card>
      </Screen>
    )
  }

  const weeks = buildWeeks(logs)
  const thisWeek = sessionsThisWeek(weeks)
  const streak = consecutiveWeeks(weeks)
  const sinceLast = daysSinceLast(logs)
  const hitThisWeek = thisWeek >= WEEKLY_TARGET

  return (
    <Screen title="Streaks">
      <Card className="p-5">
        <p className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
          This week
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <span
            className={`font-[family-name:var(--font-stamp)] text-display font-semibold tabular-nums
                        ${hitThisWeek ? 'text-accent' : ''}`}
          >
            {thisWeek}
          </span>
          <span className="text-title text-faint">/ {WEEKLY_TARGET}</span>
        </p>
        <p className="mt-1 text-small text-muted">
          {hitThisWeek
            ? 'Week hit. Anything else is a bonus.'
            : `${WEEKLY_TARGET - thisWeek} more to make the week.`}
        </p>
      </Card>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Card className="p-4">
          <p className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
            Week streak
          </p>
          <p className="mt-1 text-title font-semibold tabular-nums">
            {streak}
            <span className="ml-1 text-small font-normal text-muted">
              {streak === 1 ? 'week' : 'weeks'}
            </span>
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
            All time
          </p>
          <p className="mt-1 text-title font-semibold tabular-nums">
            {logs.length}
            <span className="ml-1 text-small font-normal text-muted">
              {logs.length === 1 ? 'session' : 'sessions'}
            </span>
          </p>
        </Card>
      </div>

      <Card className="mt-2 p-4">
        <p className="text-small text-muted">
          {sinceLast === 0
            ? 'Last session was today.'
            : sinceLast === 1
              ? 'Last session was yesterday.'
              : `${sinceLast} days since your last session.`}
        </p>
      </Card>

      <h2 className="mt-6 text-label font-semibold uppercase tracking-[0.06em] text-faint">
        By week
      </h2>
      <ul className="mt-2 space-y-1">
        {weeks.map((week) => (
          <li
            key={week.start}
            className={`flex items-center gap-3 rounded-card border px-3 py-2.5 ${
              week.hitTarget ? 'border-accent/30 bg-accent-soft' : 'border-line bg-surface'
            }`}
          >
            <span
              className={`min-w-0 flex-1 truncate text-small ${
                week.hitTarget ? 'text-accent-ink' : 'text-muted'
              }`}
            >
              {formatWeekRange(week)}
              {week.isCurrent && <span className="text-faint"> · this week</span>}
            </span>
            <span
              className={`shrink-0 font-[family-name:var(--font-stamp)] text-small tabular-nums ${
                week.hitTarget ? 'font-semibold text-accent' : 'text-muted'
              }`}
            >
              {week.count}
            </span>
          </li>
        ))}
      </ul>

      {weeks.length < 2 && (
        <p className="mt-3 text-small text-faint">
          One week so far. The history fills in a row per week from here.
        </p>
      )}

      <p className="mt-6 text-small text-faint">
        Weeks run Monday to Sunday. A week in progress never breaks the streak — it only breaks
        once a week has ended under {WEEKLY_TARGET}.
      </p>
    </Screen>
  )
}
