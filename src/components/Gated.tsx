import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useUsers } from '../lib/useUsers'
import { canSee, type SectionKey } from '../lib/users'
import { ErrorState, Loading } from './Ui'

/** Route wrapper: send an unpicked device to the picker, and a device without
 *  this section back to the menu.
 *
 *  This hides a section from a screen. It does not protect the data behind it
 *  -- the app has no passwords and the anon key reaches every table. */
export default function Gated({
  section,
  children,
}: {
  section: SectionKey
  children: ReactNode
}) {
  const { status, message, grants, current } = useUsers()

  if (status === 'loading') return <Loading what="your sections" />
  if (status === 'error') return <ErrorState message={message ?? 'Could not load users.'} />
  if (!current) return <Navigate to="/who" replace />
  if (!canSee(current, grants, section)) return <Navigate to="/" replace />

  return <>{children}</>
}
