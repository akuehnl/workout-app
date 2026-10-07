import { Link } from 'react-router-dom'
import { useProgram } from '../lib/useProgram'
import { projectRef } from '../lib/supabase'
import { BUILD_ID } from '../lib/version'
import { formatStamp } from '../lib/time'
import { PHASE_4_COMPLETE_MESSAGE } from '../lib/phase'
import { Card, ErrorState, Loading, PhaseBadge, Screen } from '../components/Ui'

export default function Program() {
  const state = useProgram()

  if (state.status === 'loading') return <Loading what="the program" />
  if (state.status === 'error') return <ErrorState message={state.message} />

  const { workouts, phaseState } = state.data

  return (
    <Screen title="Program" subtitle="Five sessions. Pick one to read it through.">
      <div className="mb-4 flex items-center gap-3">
        <PhaseBadge phase={phaseState.phase} />
        <span className="text-small text-muted">Week {phaseState.weekInPhase} of 4</span>
      </div>

      {phaseState.isProgramComplete && (
        <Card className="mb-4 border-accent/30 bg-accent-soft p-4">
          <p className="text-small text-accent-ink">{PHASE_4_COMPLETE_MESSAGE}</p>
          <p className="mt-2 text-small text-accent-ink/80">
            Nothing has looped back to Phase 1. Decide whether to restart the phases or log new
            equipment, then update <code>program_start</code> in the settings table.
          </p>
        </Card>
      )}

      <ul className="space-y-2">
        {workouts.map((w) => {
          const count =
            w.warmup.length + w.main.length + w.finisher.length + w.mobility.length
          return (
            <li key={w.id}>
              <Link
                to={`/workout/program/${w.sort_order}`}
                className="flex min-h-16 items-center gap-4 rounded-card border border-line
                           bg-surface px-4 py-3 active:bg-sunken"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-pill
                                 bg-sunken text-small font-semibold text-muted">
                  {w.sort_order}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-heading font-semibold">{w.name}</span>
                  <span className="block truncate text-small text-muted">{w.focus}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-[family-name:var(--font-stamp)] tabular-nums text-small">
                    {formatStamp(w.total_seconds)}
                  </span>
                  <span className="block text-label text-faint">{count} lines</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="mt-8 text-center text-label text-faint">
        Supabase project <span className="font-[family-name:var(--font-stamp)]">{projectRef}</span>
        {' · build '}
        <span className="font-[family-name:var(--font-stamp)]">{BUILD_ID}</span>
      </p>
    </Screen>
  )
}
