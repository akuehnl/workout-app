import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/today', label: 'Today' },
  { to: '/program', label: 'Program' },
  { to: '/streaks', label: 'Streaks' },
  { to: '/body', label: 'Body' },
]

export default function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur
                 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-xl">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                // min-h-14 keeps every tap target comfortably past 44px
                `flex min-h-14 items-center justify-center text-small font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <span className="relative inline-flex items-center py-2">
                  {tab.label}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute -bottom-1 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-pill bg-accent"
                    />
                  )}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
