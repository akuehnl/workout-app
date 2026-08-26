import { useCallback, useEffect, useState } from 'react'
import { configError } from './supabase'
import { fetchHistory, type LogHistory } from './log'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: LogHistory }

/** The completed-session history. Separate from useProgram because the program
 *  never changes during a session and this does -- finishing a run has to be
 *  able to refetch it. */
export function useHistory(): State & { reload: () => void } {
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
    fetchHistory()
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
