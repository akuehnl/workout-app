import { Link, useParams } from 'react-router-dom'
import { useProgram } from '../lib/useProgram'
import { variationFor } from '../lib/phase'
import { formatStamp } from '../lib/time'
import { SECTIONS, type Block } from '../lib/types'
import { Card, ErrorState, Loading, PhaseBadge, Screen, SectionLabel, Stamp, WatchLink }
  from '../components/Ui'

/** Blocks that run back to back share one countdown stamp -- the three warmup
 *  drills all start at 30:00. Group them so the stamp prints once per block
 *  rather than once per line. */
function groupByStamp(blocks: Block[]): { stamp: number; items: Block[] }[] {
  const groups: { stamp: number; items: Block[] }[] = []
  for (const b of blocks) {
    const last = groups[groups.length - 1]
    if (last && last.stamp === b.start_remaining_seconds) last.items.push(b)
    else groups.push({ stamp: b.start_remaining_seconds, items: [b] })
  }
  return groups
}

export default function WorkoutDetail() {
  const { sortOrder } = useParams()
  const state = useProgram()

  if (state.status === 'loading') return <Loading what="the session" />
  if (state.status === 'error') return <ErrorState message={state.message} />

  const { workouts, movements, variations, phaseState } = state.data
  const workout = workouts.find((w) => String(w.sort_order) === sortOrder)

  if (!workout) {
    return (
      <Screen title="Not found">
        <Card className="p-4">
          <p className="text-small text-muted">
            There&rsquo;s no session {sortOrder}.{' '}
            <Link to="/program" className="font-medium text-accent underline underline-offset-2">
              Back to the program
            </Link>
            .
          </p>
        </Card>
      </Screen>
    )
  }

  // Every distinct movement in this session, in the order it first appears.
  const seen = new Set<string>()
  const usedKeys: string[] = []
  for (const section of SECTIONS) {
    for (const b of workout[section.key]) {
      if (!seen.has(b.exercise_key)) {
        seen.add(b.exercise_key)
        usedKeys.push(b.exercise_key)
      }
    }
  }

  return (
    <Screen
      title={workout.name}
      subtitle={
        <>
          {workout.focus} &middot; {formatStamp(workout.total_seconds)}
        </>
      }
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <PhaseBadge phase={phaseState.phase} />
        <Link
          to="/program"
          className="text-small font-medium text-muted underline underline-offset-2"
        >
          All sessions
        </Link>
      </div>

      <p className="mb-5 text-small text-muted">
        Stamps are the time that should be <strong className="font-semibold text-ink">left</strong>{' '}
        on the clock when a block starts. The clock counts down.
      </p>

      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const blocks = workout[section.key]
          if (blocks.length === 0) return null

          return (
            <section key={section.key}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <SectionLabel>{section.label}</SectionLabel>
                {section.key === 'finisher' && (
                  <span className="text-label text-faint">One block, not sets</span>
                )}
              </div>

              <Card className="divide-y divide-line">
                {groupByStamp(blocks).map((group) => (
                  <div key={group.stamp} className="flex gap-3 p-3">
                    <Stamp seconds={group.stamp} className="pt-0.5 text-small" />
                    <ul className="min-w-0 flex-1 space-y-3">
                      {group.items.map((b) => {
                        const movement = movements.get(b.exercise_key)
                        const variation = variationFor(b, variations)
                        return (
                          <li key={b.exercise_key}>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="min-w-0 font-medium">{b.name}</span>
                              <WatchLink url={movement?.video_url} label={b.name} />
                            </div>
                            <p className="text-small text-muted">
                              {b.prescription}
                              {variation && (
                                <>
                                  {' '}
                                  &middot;{' '}
                                  <span className="font-medium text-accent-ink">{variation}</span>
                                </>
                              )}
                            </p>
                            {b.cue && <p className="text-small text-faint">{b.cue}</p>}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </Card>

              {section.key === 'mobility' && (
                <div className="mt-2 space-y-1 px-1">
                  <p className="text-small text-muted">{workout.mobility_note}</p>
                  <p className="text-small text-faint">
                    Mobility is deliberately not matched to what you just trained, and it stays as
                    one block at the end. Both are on purpose.
                  </p>
                </div>
              )}
            </section>
          )
        })}
      </div>

      <section className="mt-10">
        <SectionLabel>Movement descriptions</SectionLabel>
        <ul className="mt-2 space-y-2">
          {usedKeys.map((key) => {
            const m = movements.get(key)
            if (!m) return null
            return (
              <li key={key}>
                <Card className="p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="min-w-0 font-medium">{m.name}</h3>
                    <WatchLink url={m.video_url} label={m.name} />
                  </div>
                  <p className="mt-1 text-small text-muted">{m.description}</p>
                </Card>
              </li>
            )
          })}
        </ul>
      </section>
    </Screen>
  )
}
