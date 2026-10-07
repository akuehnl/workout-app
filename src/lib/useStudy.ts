import { useCallback, useEffect, useState } from 'react'
import { configError } from './supabase'
import { fetchStudy, type StudyData } from './study'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: StudyData }

/** The study plan. Same shape as useProgram and useHistory: a discriminated
 *  union, configError checked first, no state set after unmount.
 *
 *  Sessions change when one is checked off, so this exposes reload. */
export function useStudy(): State & { reload: () => void } {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    if (configError) {
      setState({ status: 'error', message: configError })
      return
    }

    setState({ status: 'loading' })
    fetchStudy()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
        }
      })

    return () => {
      cancelled = true
    }
  }, [nonce])

  return { ...state, reload }
}
