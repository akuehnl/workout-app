import { Link } from 'react-router-dom'
import { ComingNext, Screen } from '../components/Ui'

/** Placeholder for the two home sections until their build lands. Honest
 *  about what it is rather than bouncing back to the menu. */
export default function HomeComingNext({ title, body }: { title: string; body: string }) {
  return (
    <Screen title={title}>
      <div className="mb-4">
        <Link to="/" className="text-small font-medium text-muted underline underline-offset-2">
          ← Menu
        </Link>
      </div>
      <ComingNext title="Not built yet" body={body} />
    </Screen>
  )
}
