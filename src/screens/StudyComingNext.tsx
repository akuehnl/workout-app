import { Link } from 'react-router-dom'
import { ComingNext, Screen } from '../components/Ui'

/** Placeholder for the Week and Arc tabs until step 4 fills them in. Honest
 *  about what it is rather than a blank screen. */
export default function StudyComingNext({ title, body }: { title: string; body: string }) {
  return (
    <Screen title={title}>
      <div className="mb-4">
        <Link to="/" className="text-small font-medium text-muted underline underline-offset-2">
          ← Menu
        </Link>
      </div>
      <ComingNext title="Not built yet" body={body} />
      <Link
        to="/study/today"
        className="mt-3 flex min-h-14 items-center justify-center rounded-card bg-ink px-4
                   text-body font-semibold text-white active:opacity-90"
      >
        Today&rsquo;s session
      </Link>
    </Screen>
  )
}
