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

export default function App() {
  // The runner is full-screen: no tab bar competing for thumb room, and no way
  // to wander off mid-set by accident. It has its own way back to Today.
  const isRunner = useLocation().pathname.startsWith('/run/')

  return (
    <>
      {/* pb leaves room for the fixed tab bar plus the phone's home indicator */}
      <main className={isRunner ? 'min-h-dvh pb-8' : 'min-h-dvh pb-28'}>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/log" element={<Log />} />
          <Route path="/log/new" element={<LogNew />} />
          <Route path="/log/:logId" element={<LogEntry />} />
          <Route path="/run/:sortOrder" element={<Run />} />
          <Route path="/program" element={<Program />} />
          <Route path="/program/:sortOrder" element={<WorkoutDetail />} />
          <Route path="/streaks" element={<Streaks />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </main>
      {!isRunner && <TabBar />}
    </>
  )
}
