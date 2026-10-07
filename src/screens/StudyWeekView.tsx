import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStudy } from '../lib/useStudy'
import {
  DAY_LABEL,
  SESSION_KIND,
  defaultWeek,
  esvUrl,
  formatWeekRange,
  progressSoFar,
  sessionsForWeek,
  todayIso,
  type StudySession,
} from '../lib/study'
import { Card, ErrorState, Loading, Screen, SectionLabel } from '../components/Ui'

export default function StudyWeekView() {
  const study = useStudy()
  const navigate = useNavigate()
  const [weekNumber, setWeekNumber] = useState<number | null>(null)

  if (study.status === 'loading') return <Loading what="the week" />
  if (study.status === 'error') return <ErrorState message={study.message} />

  const { weeks, sessions } = study.data
  const today = todayIso()

  const header = (
    <div className="mb-4">
      <Link to="/" className="text-small font-medium text-muted underline underline-offset-2">
        ← Menu
      </Link>
    </div>
  )

  if (weeks.length === 0) {
    return (
      <Screen title="Week">
        {header}
        <Card className="p-5">
          <p className="text-small text-muted">No weeks written out yet.</p>
        </Card>
      </Screen>
    )
  }

  const fallback = defaultWeek(study.data, today)
  const week = (weekNumber !== null ? study.data.weekByNumber.get(weekNumber) : null) ?? fallback!
  const mine = sessionsForWeek(sessions, week.week_number)
  const done = mine.filter((s) => s.completed).length

  const index = weeks.findIndex((w) => w.week_number === week.week_number)
  const prev = index > 0 ? weeks[index - 1]! : null
  const next = index < weeks.length - 1 ? weeks[index + 1]! : null
  const isCurrent = today >= week.start_date && today <= week.end_date

  const overall = progressSoFar(sessions, today)

  return (
    <Screen title="Week">
      {header}

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
            Week {week.week_number}
            {isCurrent && <span className="text-accent"> · this week</span>}
          </span>
          <span className="shrink-0 text-small text-muted">{formatWeekRange(week)}</span>
        </div>

        <p className="mt-2 text-body">{week.subject}</p>

        <p className="mt-3 flex items-baseline gap-2">
          <span
            className={`font-[family-name:var(--font-stamp)] text-title font-semibold tabular-nums
                        ${done === mine.length && mine.length > 0 ? 'text-accent' : ''}`}
          >
            {done}
          </span>
          <span className="text-small text-muted">of {mine.length} done this week</span>
        </p>
      </Card>

      <Card className="mt-2 p-4">
        <p className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
          Memory verse {week.memory_verse_code}
        </p>
        <a
          href={esvUrl(week.memory_verse_ref)}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 inline-flex min-h-11 items-center text-heading font-semibold text-accent
                     underline decoration-accent/30 underline-offset-2"
        >
          {week.memory_verse_ref}
        </a>
      </Card>

      <div className="mt-5">
        <SectionLabel>Sessions</SectionLabel>
        <ul className="mt-2 space-y-2">
          {mine.map((session) => (
            <li key={session.id}>
              <SessionRow session={session} today={today} onOpen={() => navigate('/study/today')} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && setWeekNumber(prev.week_number)}
          className="min-h-12 flex-1 rounded-card border border-line text-small font-medium
                     active:bg-sunken disabled:opacity-40"
        >
          {prev ? `← Week ${prev.week_number}` : '← Earlier'}
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={() => next && setWeekNumber(next.week_number)}
          className="min-h-12 flex-1 rounded-card border border-line text-small font-medium
                     active:bg-sunken disabled:opacity-40"
        >
          {next ? `Week ${next.week_number} →` : 'Later →'}
        </button>
      </div>

      <Card className="mt-6 p-4">
        <p className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
          All time
        </p>
        <p className="mt-1 text-small">
          <span className="font-[family-name:var(--font-stamp)] font-semibold tabular-nums">
            {overall.completed}
          </span>{' '}
          of{' '}
          <span className="font-[family-name:var(--font-stamp)] font-semibold tabular-nums">
            {overall.elapsed}
          </span>{' '}
          sessions done so far
        </p>
        <p className="mt-1 text-small text-faint">
          Counted against sessions whose date has passed, not against the whole plan.
        </p>
      </Card>
    </Screen>
  )
}

function SessionRow({
  session,
  today,
  onOpen,
}: {
  session: StudySession
  today: string
  onOpen: () => void
}) {
  const isToday = session.session_date === today
  const late = !session.completed && session.session_date < today

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-start gap-3 rounded-card border bg-surface px-3 py-3 text-left
                  active:bg-sunken ${isToday ? 'border-line-strong' : 'border-line'}`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-card border
                    text-small font-semibold ${
                      session.completed
                        ? 'border-accent bg-accent text-white'
                        : 'border-line-strong bg-surface text-faint'
                    }`}
      >
        {session.completed ? '✓' : ''}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {SESSION_KIND[session.day]}
          {isToday && <span className="ml-2 text-small font-normal text-accent">today</span>}
          {late && <span className="ml-2 text-small font-normal text-muted">not done</span>}
        </span>
        <span className="block text-small text-muted">
          {DAY_LABEL[session.day]} &middot; {session.session_date} &middot;{' '}
          {session.blocks.length} {session.blocks.length === 1 ? 'block' : 'blocks'}
        </span>
        {session.notes.trim() && (
          <span className="mt-1 block text-small text-muted">{session.notes}</span>
        )}
      </span>
    </button>
  )
}
