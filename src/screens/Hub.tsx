import { Link } from 'react-router-dom'
import { Screen } from '../components/Ui'

/* ---------------------------------------------------------------------------
   The main menu. Sections live behind their own tab bars, so adding another
   one is a row in this list plus its routes -- the bottom nav never has to
   grow past the four tabs that fit a phone.

   Deliberately static: this is the landing screen, and loading both sections'
   data to print a line of context would put a spinner in front of the app
   every time it opens.
   --------------------------------------------------------------------------- */
const SECTIONS = [
  {
    to: '/workout/today',
    name: 'Workout',
    blurb: 'Five kettlebell sessions on a countdown clock, with the log and your weight.',
  },
  {
    to: '/study/today',
    name: 'Bible study',
    blurb: 'A two-year plan. Three half-hour sessions a week, Monday, Thursday and Friday.',
  },
]

export default function Hub() {
  return (
    <Screen title="Menu">
      <ul className="space-y-3">
        {SECTIONS.map((section) => (
          <li key={section.to}>
            <Link
              to={section.to}
              className="block rounded-card border border-line bg-surface p-5 active:bg-sunken"
            >
              <span className="block text-title font-semibold tracking-tight">{section.name}</span>
              <span className="mt-1 block text-small text-muted">{section.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  )
}
