import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import TabBar from './components/TabBar'
import Today from './screens/Today'
import Program from './screens/Program'
import WorkoutDetail from './screens/WorkoutDetail'
import Streaks from './screens/Streaks'
import Run from './screens/Run'
import Log from './screens/Log'
import LogEntry from './screens/LogEntry'
import LogNew from './screens/LogNew'
import Body from './screens/Body'
import Hub from './screens/Hub'
import StudyToday from './screens/StudyToday'
import StudyWeekView from './screens/StudyWeekView'
import StudyArc from './screens/StudyArc'
import { BUILD_ID, fetchDeployedBuildId } from './lib/version'

const CHECK_EVERY_MS = 5 * 60 * 1000
const RELOAD_GUARD_KEY = 'workout:reloaded-for'

/** Reload onto the new build.
 *
 *  Two things a plain location.reload() gets wrong here. First, it can be
 *  served the SAME cached index.html, land on the same old bundle, notice the
 *  mismatch again and reload forever -- so this changes the URL instead, which
 *  no cached entry matches. Second, belt and braces: the guard records which
 *  deployed id we already jumped for, so even if the reload somehow lands on
 *  the old bundle again we stop rather than loop. */
function reloadForNewBuild(deployedId: string) {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === deployedId) return
    sessionStorage.setItem(RELOAD_GUARD_KEY, deployedId)
  } catch {
    // Private mode. The URL change below still does the real work.
  }
  const url = new URL(window.location.href)
  url.searchParams.set('v', deployedId)
  window.location.replace(url.toString())
}

/** Pick up a new deploy without a manual cache-bust.
 *
 *  GitHub Pages caches index.html for 10 minutes and iOS Safari has no
 *  hard-refresh, so a phone can sit on a stale build long after a deploy.
 *  This compares the id baked into the running bundle against the deployed
 *  version.json and reloads when they differ.
 *
 *  `enabled` is false during a run: reloading mid-workout would be jarring,
 *  and the check picks the update up as soon as the runner is left. (The run
 *  itself is cached in localStorage, so nothing would be lost either way.) */
function useAutoUpdate(enabled: boolean) {
  useEffect(() => {
    if (!import.meta.env.PROD || !enabled) return

    let cancelled = false

    async function check() {
      const deployed = await fetchDeployedBuildId()
      if (!cancelled && deployed && deployed !== BUILD_ID) {
        reloadForNewBuild(deployed)
      }
    }

    function onVisible() {
      if (document.visibilityState === 'visible') void check()
    }

    void check()
    const id = window.setInterval(() => void check(), CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled])
}

export default function App() {
  // The runner is full-screen: no tab bar competing for thumb room, and no way
  // to wander off mid-set by accident. It has its own way back to Today.
  const isRunner = useLocation().pathname.startsWith('/workout/run/')
  useAutoUpdate(!isRunner)

  return (
    <>
      {/* pb leaves room for the fixed tab bar plus the phone's home indicator */}
      <main className={isRunner ? 'min-h-dvh pb-8' : 'min-h-dvh pb-28'}>
        <Routes>
          {/* The menu. Sections sit behind it so the bottom nav never has to
              grow past the four tabs that fit a phone. */}
          <Route path="/" element={<Hub />} />

          {/* Workout */}
          <Route path="/workout" element={<Navigate to="/workout/today" replace />} />
          <Route path="/workout/today" element={<Today />} />
          <Route path="/workout/log" element={<Log />} />
          <Route path="/workout/log/new" element={<LogNew />} />
          <Route path="/workout/log/:logId" element={<LogEntry />} />
          <Route path="/workout/run/:sortOrder" element={<Run />} />
          <Route path="/workout/program" element={<Program />} />
          <Route path="/workout/program/:sortOrder" element={<WorkoutDetail />} />
          <Route path="/workout/streaks" element={<Streaks />} />
          <Route path="/workout/body" element={<Body />} />

          {/* Scripture study */}
          <Route path="/study" element={<Navigate to="/study/today" replace />} />
          <Route path="/study/today" element={<StudyToday />} />
          <Route path="/study/week" element={<StudyWeekView />} />
          <Route path="/study/arc" element={<StudyArc />} />

          {/* Paths from before the menu existed, so nothing bookmarked breaks. */}
          <Route path="/today" element={<Navigate to="/workout/today" replace />} />
          <Route path="/log" element={<Navigate to="/workout/log" replace />} />
          <Route path="/log/new" element={<Navigate to="/workout/log/new" replace />} />
          <Route path="/program" element={<Navigate to="/workout/program" replace />} />
          <Route path="/streaks" element={<Navigate to="/workout/streaks" replace />} />
          <Route path="/body" element={<Navigate to="/workout/body" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isRunner && <TabBar />}
    </>
  )
}
