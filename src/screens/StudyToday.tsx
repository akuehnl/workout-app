import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudy } from '../lib/useStudy'
import {
  DAY_LABEL,
  SESSION_KIND,
  describeTiming,
  esvUrl,
  formatLongDate,
  monthForDate,
  monthHasNoAssignments,
  nextIncomplete,
  overdueSessions,
  sessionIndex,
  timingFor,
  todayIso,
  type StudySession,
  type StudyWeek,
} from '../lib/study'
import { Card, ErrorState, Loading, Screen, SectionLabel } from '../components/Ui'

export default function StudyToday() {
  const study = useStudy()
  // Which session is on screen. Null means "whatever is up next" -- stepping
  // away from that is how a session gets done early or late.
  const [viewingId, setViewingId] = useState<string | null>(null)

  if (study.status === 'loading') return <Loading what="the study plan" />
  if (study.status === 'error') return <ErrorState message={study.message} />

  const { sessions } = study.data
  const today = todayIso()
  const upNext = nextIncomplete(sessions)
  const viewing =
    (viewingId ? sessions.find((s) => s.id === viewingId) : null) ?? upNext ?? null

  const header = (
    <div className="mb-4 flex items-center justify-between gap-3">
      <Link to="/" className="text-small font-medium text-muted underline underline-offset-2">
        ← Menu
      </Link>
      {viewing && upNext && viewing.id !== upNext.id && (
        <button
          type="button"
          onClick={() => setViewingId(null)}
          className="text-small font-medium text-accent underline underline-offset-2"
        >
          Back to what&rsquo;s next
        </button>
      )}
    </div>
  )

  // Nothing left in what has been written out so far.
  if (!viewing) {
    const month = monthForDate(study.data, today)
    return (
      <Screen title="Study">
        {header}
        <Card className="p-5">
          <h2 className="text-heading font-semibold">
            {sessions.length === 0 ? 'No sessions yet' : 'All caught up'}
          </h2>
          <p className="mt-2 text-small text-muted">
            {sessions.length === 0
              ? 'The plan has no sessions loaded yet.'
              : `Every session written out so far is done. ${
                  month ? `This month is ${month.month_label}.` : ''
                } The next month gets added when you're ready for it.`}
          </p>
        </Card>
      </Screen>
    )
  }

  const week = study.data.weekByNumber.get(viewing.week_number)
  const month = week ? study.data.monthByNumber.get(week.month_number) : undefined
  const timing = timingFor(viewing, today)
  const index = sessionIndex(sessions, viewing.id)
  const prev = index > 0 ? sessions[index - 1]! : null
  const next = index < sessions.length - 1 ? sessions[index + 1]! : null
  const stillOverdue = overdueSessions(sessions, today).filter((s) => s.id !== viewing.id)
  const noAssignments = monthHasNoAssignments(study.data, today)

  return (
    <Screen title="Study">
      {header}

      {noAssignments && (
        <Card className="mb-3 p-4">
          <p className="text-small text-muted">
            No assignments yet for {monthForDate(study.data, today)?.month_label ?? 'this month'}.
            Showing the next session still outstanding.
          </p>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-label font-semibold uppercase tracking-[0.06em] text-faint">
            {describeTiming(timing)}
          </span>
          {viewing.completed && (
            <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-label font-semibold text-accent-ink">
              Done
            </span>
          )}
        </div>

        <h2 className="mt-1 text-title font-semibold tracking-tight">
          {SESSION_KIND[viewing.day]}
        </h2>
        <p className="mt-0.5 text-small text-muted">
          {DAY_LABEL[viewing.day]} &middot; {formatLongDate(viewing.session_date)}
          {week && <> &middot; week {week.week_number}</>}
        </p>

        {week && <p className="mt-3 text-body">{week.subject}</p>}

        {month && (
          <p className="mt-2 text-small text-faint">
            {month.month_label} &middot; {month.exam_section} &middot; {month.focus}
          </p>
        )}
      </Card>

      {week && (
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
          <p className="mt-1 text-small text-faint">Opens on esv.org.</p>
        </Card>
      )}

      <div className="mt-5">
        <SectionLabel>The half hour</SectionLabel>
        <ol className="mt-2 space-y-2">
          {viewing.blocks.map((block, i) => (
            <li key={`${block.time_range}-${i}`}>
              <Card className="flex gap-3 p-3">
                <span className="shrink-0 font-[family-name:var(--font-stamp)] text-small tabular-nums text-faint">
                  {block.time_range}
                </span>
                <span className="min-w-0 flex-1 text-small">{block.instruction}</span>
              </Card>
            </li>
          ))}
        </ol>
      </div>

      {/* Step 3 adds the check-off and the notes field here. */}
      <Card className="mt-4 p-4">
        <p className="text-small text-muted">
          Marking a session complete and saving notes comes next. For now this view is
          read-only.
        </p>
      </Card>

      {/* Stepping either way is how a session gets done early or late. */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && setViewingId(prev.id)}
          className="min-h-12 flex-1 rounded-card border border-line text-small font-medium
                     active:bg-sunken disabled:opacity-40"
        >
          ← Earlier
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={() => next && setViewingId(next.id)}
          className="min-h-12 flex-1 rounded-card border border-line text-small font-medium
                     active:bg-sunken disabled:opacity-40"
        >
          Later →
        </button>
      </div>

      {stillOverdue.length > 0 && (
        <div className="mt-6">
          <SectionLabel>Still outstanding</SectionLabel>
          <ul className="mt-2 space-y-2">
            {stillOverdue.map((session) => (
              <li key={session.id}>
                <OverdueRow
                  session={session}
                  week={study.data.weekByNumber.get(session.week_number)}
                  onOpen={() => setViewingId(session.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Screen>
  )
}

function OverdueRow({
  session,
  week,
  onOpen,
}: {
  session: StudySession
  week: StudyWeek | undefined
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-14 w-full items-center gap-3 rounded-card border border-line
                 bg-surface px-4 py-3 text-left active:bg-sunken"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{SESSION_KIND[session.day]}</span>
        <span className="block truncate text-small text-muted">
          {DAY_LABEL[session.day]} &middot; {formatLongDate(session.session_date)}
          {week && <> &middot; {week.memory_verse_code}</>}
        </span>
      </span>
      <span className="shrink-0 text-small text-faint">
        {describeTiming(timingFor(session))}
      </span>
    </button>
  )
}
