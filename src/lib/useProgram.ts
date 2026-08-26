import { useEffect, useState } from 'react'
import { configError, supabase } from './supabase'
import { phaseFromStart, variationMap, type PhaseState } from './phase'
import type { Movement, ProgramPhase, Settings, Workout } from './types'

export type ProgramData = {
  workouts: Workout[]
  movements: Map<string, Movement>
  phases: ProgramPhase[]
  settings: Settings
  phaseState: PhaseState
  /** exercise_key -> variation, already narrowed to the current phase. */
  variations: Map<string, string>
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ProgramData }

/** Loads the whole program in one shot. It's four small tables and it never
 *  changes during a session, so there's no reason to be cleverer than this. */
export function useProgram(): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    if (configError) {
      setState({ status: 'error', message: configError })
      return
    }

    async function load() {
      const [w, m, p, s] = await Promise.all([
        supabase.from('workouts').select('*').order('sort_order'),
        supabase.from('movements').select('*'),
        supabase.from('program_phases').select('*'),
        supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
      ])

      if (cancelled) return

      const failed = [w, m, p, s].find((r) => r.error)
      if (failed?.error) {
        setState({ status: 'error', message: failed.error.message })
        return
      }
      if (!s.data) {
        setState({
          status: 'error',
          message: 'No settings row. Run supabase/002_seed.sql in the SQL editor.',
        })
        return
      }

      const settings = s.data as Settings
      const phaseState = phaseFromStart(settings.program_start)
      const phases = (p.data ?? []) as ProgramPhase[]

      setState({
        status: 'ready',
        data: {
          workouts: (w.data ?? []) as Workout[],
          movements: new Map(((m.data ?? []) as Movement[]).map((x) => [x.exercise_key, x])),
          phases,
          settings,
          phaseState,
          variations: variationMap(phases, phaseState.phase),
        },
      })
    }

    load().catch((e: unknown) => {
      if (!cancelled) {
        setState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
