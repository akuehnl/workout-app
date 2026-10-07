import { NavLink, useLocation } from 'react-router-dom'

/** Each section carries its own bottom nav, so the bar never grows past what
 *  fits a phone however many sections get added to the menu. */
const SECTION_TABS: Record<string, { to: string; label: string }[]> = {
  workout: [
    { to: '/workout/today', label: 'Today' },
    { to: '/workout/program', label: 'Program' },
    { to: '/workout/streaks', label: 'Streaks' },
    { to: '/workout/body', label: 'Body' },
  ],
  study: [
    { to: '/study/today', label: 'Today' },
    { to: '/study/week', label: 'Week' },
    { to: '/study/arc', label: 'Arc' },
  ],
}

export function sectionFromPath(pathname: string): string | null {
  const first = pathname.split('/')[1] ?? ''
  return first in SECTION_TABS ? first : null
}

export default function TabBar() {
  const section = sectionFromPath(useLocation().pathname)
  if (!section) return null // the menu has no tabs of its own

  const tabs = SECTION_TABS[section]!

  return (
    <nav
      aria-label={`${section} sections`}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur
                 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-xl">
        {tabs.map((tab) => (
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
