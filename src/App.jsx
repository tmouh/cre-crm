import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }     from './context/AuthContext'
import { CRMProvider }      from './context/CRMContext'
import ProtectedRoute       from './components/ProtectedRoute'
import Layout               from './components/Layout'
import Login                from './pages/Login'
import Dashboard            from './pages/Dashboard'
import Contacts             from './pages/Contacts'
import Companies            from './pages/Companies'
import Properties           from './pages/Properties'
import Reminders            from './pages/Reminders'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — CRMProvider is inside so DB calls have an active session */}
          <Route
            element={
              <ProtectedRoute>
                <CRMProvider>
                  <Layout />
                </CRMProvider>
              </ProtectedRoute>
            }
          >
            <Route path="/"                element={<Dashboard />} />
            <Route path="/reminders"       element={<Reminders />} />
            <Route path="/contacts"        element={<Contacts />} />
            <Route path="/contacts/:id"    element={<Contacts />} />
            <Route path="/companies"       element={<Companies />} />
            <Route path="/companies/:id"   element={<Companies />} />
            <Route path="/properties"      element={<Properties />} />
            <Route path="/properties/:id"  element={<Properties />} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
