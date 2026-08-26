import { Navigate, Route, Routes } from 'react-router-dom'
import TabBar from './components/TabBar'
import Today from './screens/Today'
import Program from './screens/Program'
import WorkoutDetail from './screens/WorkoutDetail'
import Streaks from './screens/Streaks'

export default function App() {
  return (
    <>
      {/* pb leaves room for the fixed tab bar plus the iOS home indicator */}
      <main className="min-h-dvh pb-28">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/program" element={<Program />} />
          <Route path="/program/:sortOrder" element={<WorkoutDetail />} />
          <Route path="/streaks" element={<Streaks />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </main>
      <TabBar />
    </>
  )
}
