import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useUsers } from '../lib/useUsers'
import { SECTIONS, grantSection, sectionsFor, type SectionKey } from '../lib/users'
import { Card, ErrorState, Loading, Screen, SectionLabel } from '../components/Ui'

/** Admin only: which sections each non-admin user's device shows. */
export default function Users() {
  const { status, message, users, grants, current, reload, usersAvailable } = useUsers()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading') return <Loading what="users" />
  if (status === 'error') return <ErrorState message={message ?? 'Could not load users.'} />
  if (!current) return <Navigate to="/who" replace />
  if (!current.is_admin) return <Navigate to="/" replace />
  // Nothing to manage until 012 has created the tables.
  if (!usersAvailable) return <Navigate to="/" replace />

  async function toggle(userId: string, section: SectionKey, next: boolean) {
    setBusy(`${userId}:${section}`)
    setError(null)
    try {
      await grantSection(userId, section, next)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(null)
  }

  return (
    <Screen title="Users" subtitle="Which sections each device shows.">
      <div className="mb-4">
        <Link to="/" className="text-small font-medium text-muted underline underline-offset-2">
          ← Menu
        </Link>
      </div>

      {error && (
        <p className="mb-3 rounded-card bg-sunken p-3 text-small text-muted">
          Couldn&rsquo;t save: {error}
        </p>
      )}

      <div className="space-y-4">
        {users.map((user) => {
          const visible = sectionsFor(user, grants)
          return (
            <div key={user.id}>
              <SectionLabel>
                {user.name}
                {user.is_admin && ' · admin'}
              </SectionLabel>

              <Card className="mt-2 p-4">
                {user.is_admin ? (
                  <p className="text-small text-muted">
                    Admins see every section. Nothing to choose.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {SECTIONS.map((section) => {
                      const on = visible.includes(section.key)
                      const key = `${user.id}:${section.key}`
                      return (
                        <li key={section.key}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            disabled={busy !== null}
                            onClick={() => toggle(user.id, section.key, !on)}
                            className="flex w-full items-center gap-3 text-left disabled:opacity-50"
                          >
                            <span
                              aria-hidden
                              className={`flex h-7 w-12 shrink-0 items-center rounded-pill px-1 ${
                                on ? 'justify-end bg-accent' : 'justify-start bg-line-strong'
                              }`}
                            >
                              <span className="block size-5 rounded-pill bg-surface" />
                            </span>
                            <span className="min-w-0 flex-1 text-small font-medium">
                              {section.name}
                              {busy === key && (
                                <span className="ml-2 font-normal text-faint">saving…</span>
                              )}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-small text-faint">
        These switches change what a device displays. They are not a security boundary — the app
        has no passwords, and anyone with the link can reach any data through the API.
      </p>
    </Screen>
  )
}
