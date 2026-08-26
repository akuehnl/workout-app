import { Link } from 'react-router-dom'
import { useProgram } from '../lib/useProgram'
import { ComingNext, ErrorState, Loading, PhaseBadge, Screen } from '../components/Ui'

export default function Today() {
  const state = useProgram()

  if (state.status === 'loading') return <Loading what="your program" />
  if (state.status === 'error') return <ErrorState message={state.message} />

  const { phaseState } = state.data

  return (
    <Screen title="Today">
      <div className="mb-4">
        <PhaseBadge phase={phaseState.phase} />
      </div>
      <ComingNext
        title="Nothing to hand you yet"
        body="Next step wires up the queue: this screen will show whichever session you've gone
              longest without doing, with a Start button that opens the countdown runner. For now,
              read the sessions on the Program tab."
      />
      <Link
        to="/program"
        className="mt-3 flex min-h-14 items-center justify-center rounded-card bg-ink
                   px-4 text-body font-semibold text-white active:opacity-90"
      >
        Open the program
      </Link>
    </Screen>
  )
}
