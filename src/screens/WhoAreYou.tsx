import { Navigate } from 'react-router-dom'
import { useUsers } from '../lib/useUsers'
import { Card, ErrorState, Loading, Screen } from '../components/Ui'

/** The name picker. Deliberately not called a login: it sets a display
 *  preference on this device and authorises nothing. */
export default function WhoAreYou() {
  const { status, message, users, pick, usersAvailable, current } = useUsers()

  if (status === 'loading') return <Loading what="users" />
  if (status === 'error') return <ErrorState message={message ?? 'Could not load users.'} />
  // Nothing to choose between until 012 has been run.
  if (!usersAvailable) return <Navigate to="/" replace />
  // Once a name is picked, get out of the way. Without this the picker stayed
  // on screen after a tap and looked like it had done nothing.
  if (current) return <Navigate to="/" replace />

  return (
    <Screen title="Who's using this?" subtitle="Picks which sections this device shows.">
      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              onClick={() => pick(user.id)}
              className="flex min-h-16 w-full items-center gap-3 rounded-card border border-line
                         bg-surface px-5 text-left active:bg-sunken"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-heading font-semibold">{user.name}</span>
                {user.is_admin && (
                  <span className="block text-small text-muted">Sees every section</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {users.length === 0 && (
        <Card className="p-5">
          <p className="text-small text-muted">
            No users set up yet. Run <code className="rounded bg-sunken px-1">012</code> in the
            Supabase SQL editor.
          </p>
        </Card>
      )}

      <p className="mt-6 text-small text-faint">
        This isn&rsquo;t a login and there&rsquo;s no password. It decides what this device shows,
        not what it can reach.
      </p>
    </Screen>
  )
}
