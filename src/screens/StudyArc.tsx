import { Link } from 'react-router-dom'
import { useStudy } from '../lib/useStudy'
import { monthLabelFor, todayIso, weekCountByMonth } from '../lib/study'
import { Card, ErrorState, Loading, Screen } from '../components/Ui'

export default function StudyArc() {
  const study = useStudy()

  if (study.status === 'loading') return <Loading what="the arc" />
  if (study.status === 'error') return <ErrorState message={study.message} />

  const { months } = study.data
  const today = todayIso()
  const currentLabel = monthLabelFor(today)
  const weekCounts = weekCountByMonth(study.data)

  return (
    <Screen
      title="Arc"
      subtitle={
        months.length > 0
          ? `${months.length} months, ${months[0]!.month_label} to ${months[months.length - 1]!.month_label}.`
          : undefined
      }
    >
      <div className="mb-4">
        <Link to="/" className="text-small font-medium text-muted underline underline-offset-2">
          ← Menu
        </Link>
      </div>

      {months.length === 0 ? (
        <Card className="p-5">
          <p className="text-small text-muted">The arc has no months loaded.</p>
        </Card>
      ) : (
        <ol className="space-y-2">
          {months.map((month) => {
            const isCurrent = month.month_label === currentLabel
            const weeks = weekCounts.get(month.month_number) ?? 0
            return (
              <li key={month.month_number}>
                <div
                  className={`rounded-card border p-4 ${
                    isCurrent ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`text-small font-semibold ${isCurrent ? 'text-accent-ink' : ''}`}
                    >
                      {month.month_number}. {month.month_label}
                      {isCurrent && (
                        <span className="ml-2 font-normal text-accent">this month</span>
                      )}
                    </span>
                    <span className="shrink-0 text-label uppercase tracking-[0.06em] text-faint">
                      {month.exam_section}
                    </span>
                  </div>

                  <p className={`mt-1 text-small ${isCurrent ? 'text-accent-ink' : ''}`}>
                    {month.focus}
                  </p>

                  <p className="mt-2 text-small text-muted">{month.canon_resource}</p>

                  {month.supplement && (
                    <p className="mt-1 text-small text-muted">{month.supplement}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {month.has_gap && (
                      <span className="rounded-pill bg-sunken px-2 py-0.5 text-label font-medium text-muted">
                        resource gap
                      </span>
                    )}
                    <span className="text-label text-faint">
                      {weeks === 0
                        ? 'not written out yet'
                        : `${weeks} ${weeks === 1 ? 'week' : 'weeks'} written`}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <p className="mt-6 text-small text-faint">
        A resource gap means the Canon+ material for that month is thin and needs filling. Months
        are written out one at a time, so most of these have no weeks yet.
      </p>
    </Screen>
  )
}
