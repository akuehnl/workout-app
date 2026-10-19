import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { configError } from './supabase'
import {
  clearPickedUserId,
  fetchUsers,
  loadPickedUserId,
  savePickedUserId,
  type AppUser,
  type SectionKey,
} from './users'

type State = {
  status: 'loading' | 'error' | 'ready'
  message: string | null
  users: AppUser[]
  grants: Map<string, Set<SectionKey>>
  /** Whoever this device picked, once the directory has loaded. */
  current: AppUser | null
  /** False until 012 has been run. The app then behaves as it did before
   *  users existed: one implicit admin, every section, no picker. */
  usersAvailable: boolean
}

/** Stand-in when the users tables aren't there. Sees everything, which is
 *  exactly how the app behaved before this feature -- and costs nothing,
 *  because section visibility was never a security boundary. */
const IMPLICIT_ADMIN: AppUser = {
  id: 'implicit-admin',
  name: 'You',
  is_admin: true,
  sort_order: 0,
}

type Ctx = State & {
  pick: (id: string) => void
  switchUser: () => void
  reload: () => void
}

const UsersContext = createContext<Ctx | null>(null)

/** Loaded once at the top of the app: every screen needs to know who is on
 *  this device and which sections to show. */
export function UsersProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    status: 'loading',
    message: null,
    users: [],
    grants: new Map(),
    current: null,
    usersAvailable: false,
  })
  const [pickedId, setPickedId] = useState<string | null>(() => loadPickedUserId())
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    if (configError) {
      setState((s) => ({ ...s, status: 'error', message: configError }))
      return
    }

    fetchUsers()
      .then(({ users, grants }) => {
        if (cancelled) return
        setState({
          status: 'ready',
          message: null,
          users,
          grants,
          // A stored id that no longer matches a row falls back to unpicked
          // rather than leaving the app in a broken half-state.
          current: users.find((u) => u.id === pickedId) ?? null,
          usersAvailable: true,
        })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        // The users tables may not exist yet, or the request may simply have
        // failed. Either way, fall back to the pre-users behaviour rather than
        // taking the whole app down -- the workout and study sections do not
        // depend on this and must keep working.
        setState({
          status: 'ready',
          message: e instanceof Error ? e.message : String(e),
          users: [],
          grants: new Map(),
          current: IMPLICIT_ADMIN,
          usersAvailable: false,
        })
      })

    return () => {
      cancelled = true
    }
  }, [nonce, pickedId])

  const pick = useCallback((id: string) => {
    savePickedUserId(id)
    setPickedId(id)
  }, [])

  const switchUser = useCallback(() => {
    clearPickedUserId()
    setPickedId(null)
  }, [])

  return (
    <UsersContext.Provider value={{ ...state, pick, switchUser, reload }}>
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers(): Ctx {
  const ctx = useContext(UsersContext)
  if (!ctx) throw new Error('useUsers must be used inside UsersProvider')
  return ctx
}
