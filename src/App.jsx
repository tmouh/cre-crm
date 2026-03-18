import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }      from './context/AuthContext'
import { CRMProvider }       from './context/CRMContext'
import { ThemeProvider }     from './context/ThemeContext'
import { MicrosoftProvider } from './context/MicrosoftContext'
import ProtectedRoute        from './components/ProtectedRoute'
import AppShell              from './components/layout/AppShell'
import Login                 from './pages/Login'
import Dashboard             from './pages/Dashboard'
import Contacts              from './pages/Contacts'
import Companies             from './pages/Companies'
import Deals                 from './pages/Deals'
import Pipeline              from './pages/Pipeline'
import Comps                 from './pages/Comps'
import Investors             from './pages/Investors'
import Reminders             from './pages/Reminders'
import Inbox                 from './pages/Inbox'
import Documents             from './pages/Documents'
import Reports               from './pages/Reports'
import Automations           from './pages/Automations'
import Settings              from './pages/Settings'
import RecentlyDeleted       from './pages/RecentlyDeleted'
import MapPage               from './pages/Map'
import PersonalContacts      from './pages/PersonalContacts'
import Activities            from './pages/Activities'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected — CRMProvider + MicrosoftProvider inside so DB/Graph calls have an active session */}
            <Route
              element={
                <ProtectedRoute>
                  <CRMProvider>
                    <MicrosoftProvider>
                      <AppShell />
                    </MicrosoftProvider>
                  </CRMProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/"                  element={<Dashboard />} />
              <Route path="/inbox"             element={<Inbox />} />
              <Route path="/reminders"         element={<Reminders />} />
              <Route path="/activities"        element={<Activities />} />
              <Route path="/personal/contacts"     element={<PersonalContacts />} />
              <Route path="/personal/contacts/:id" element={<PersonalContacts />} />
              <Route path="/activities"         element={<Activities />} />
              <Route path="/contacts"          element={<Contacts />} />
              <Route path="/contacts/:id"      element={<Contacts />} />
              <Route path="/companies"         element={<Companies />} />
              <Route path="/companies/:id"     element={<Companies />} />
              <Route path="/deals"             element={<Deals />} />
              <Route path="/deals/:id"         element={<Deals />} />
              {/* Legacy /properties routes redirect to /deals */}
              <Route path="/properties"        element={<Navigate to="/deals" replace />} />
              <Route path="/properties/:id"    element={<Navigate to="/deals" replace />} />
              <Route path="/pipeline"          element={<Pipeline />} />
              <Route path="/comps"             element={<Comps />} />
              <Route path="/comps/:id"         element={<Comps />} />
              <Route path="/investors"         element={<Investors />} />
              <Route path="/investors/:id"     element={<Investors />} />
              <Route path="/documents"         element={<Documents />} />
              <Route path="/reports"           element={<Reports />} />
              <Route path="/automations"       element={<Automations />} />
              <Route path="/settings"          element={<Settings />} />
              <Route path="/map"               element={<MapPage />} />
              <Route path="/recently-deleted"  element={<RecentlyDeleted />} />
              <Route path="*"                  element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
