import { ComingNext, Screen } from '../components/Ui'

export default function Streaks() {
  return (
    <Screen title="Streaks">
      <ComingNext
        title="Nothing logged yet"
        body="Once sessions are being logged, this shows how many you've done this week out of 4,
              how many weeks in a row you've hit 4, and a week-by-week history. The streak is
              weekly, not daily - four sessions spread across seven days is a good week."
      />
    </Screen>
  )
}
