import { Link, Navigate } from 'react-router-dom'
import { useUsers } from '../lib/useUsers'
import { SECTIONS, sectionsFor } from '../lib/users'
import { Card, ErrorState, Loading, Screen } from '../components/Ui'

/* ---------------------------------------------------------------------------
   The main menu. Sections live behind their own tab bars, so adding another
   one is a row in SECTIONS plus its routes -- the bottom nav never has to grow
   past the four tabs that fit a phone.

   Deliberately static beyond the gating: this is the landing screen, and
   loading every section's data to print a line of context would put a spinner
   in front of the app every time it opens.
   --------------------------------------------------------------------------- */
export default function Hub() {
  const { status, message, grants, current, switchUser, usersAvailable } = useUsers()

  if (status === 'loading') return <Loading what="your sections" />
  if (status === 'error') return <ErrorState message={message ?? 'Could not load users.'} />
  if (!current) return <Navigate to="/who" replace />

  const visible = sectionsFor(current, grants)
  const sections = SECTIONS.filter((s) => visible.includes(s.key))

  return (
    <Screen title="Menu" subtitle={usersAvailable ? `Signed in as ${current.name}.` : undefined}>
      {sections.length === 0 ? (
        <Card className="p-5">
          <h2 className="text-heading font-semibold">Nothing shared with you yet</h2>
          <p className="mt-2 text-small text-muted">
            Ask Aden to turn a section on for this account.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {sections.map((section) => (
            <li key={section.key}>
              <Link
                to={section.home}
                className="block rounded-card border border-line bg-surface p-5 active:bg-sunken"
              >
                <span className="block text-title font-semibold tracking-tight">
                  {section.name}
                </span>
                <span className="mt-1 block text-small text-muted">{section.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {usersAvailable && (
      <div className="mt-6 flex flex-wrap gap-2">
        {current.is_admin && (
          <Link
            to="/users"
            className="flex min-h-12 flex-1 items-center justify-center rounded-card border
                       border-line px-4 text-small font-medium active:bg-sunken"
          >
            Users
          </Link>
        )}
        <button
          type="button"
          onClick={switchUser}
          className="min-h-12 flex-1 rounded-card border border-line px-4 text-small font-medium
                     active:bg-sunken"
        >
          Switch user
        </button>
      </div>
      )}
    </Screen>
  )
}
