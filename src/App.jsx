import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CRMProvider } from './context/CRMContext'
import Layout from './components/Layout'
import Dashboard  from './pages/Dashboard'
import Contacts   from './pages/Contacts'
import Companies  from './pages/Companies'
import Properties from './pages/Properties'
import Reminders  from './pages/Reminders'

export default function App() {
  return (
    <CRMProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/"                    element={<Dashboard />} />
            <Route path="/reminders"           element={<Reminders />} />
            <Route path="/contacts"            element={<Contacts />} />
            <Route path="/contacts/:id"        element={<Contacts />} />
            <Route path="/companies"           element={<Companies />} />
            <Route path="/companies/:id"       element={<Companies />} />
            <Route path="/properties"          element={<Properties />} />
            <Route path="/properties/:id"      element={<Properties />} />
            <Route path="*"                    element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CRMProvider>
  )
}
