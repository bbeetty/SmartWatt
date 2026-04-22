import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Bills from './pages/Bills'
import Appliances from './pages/Appliances'
import DailyUsage from './pages/DailyUsage'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="bills" element={<Bills />} />
        <Route path="appliances" element={<Appliances />} />
        <Route path="usage" element={<DailyUsage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
