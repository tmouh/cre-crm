import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, MapPin, Bell, LogOut } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'
import { isOverdue, isDueToday } from '../utils/helpers'

const NAV = [
  { to: '/',           label: 'Dashboard',  Icon: LayoutDashboard },
  { to: '/reminders',  label: 'Follow-ups', Icon: Bell },
  { to: '/contacts',   label: 'Contacts',   Icon: Users },
  { to: '/companies',  label: 'Companies',  Icon: Building2 },
  { to: '/properties', label: 'Properties', Icon: MapPin },
]

export default function Sidebar() {
  const { reminders } = useCRM()
  const { user, signOut } = useAuth()
  const urgent = reminders.filter(r => r.status !== 'done' && (isOverdue(r.dueDate) || isDueToday(r.dueDate))).length

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <img src="/V.png" alt="Vanadium" className="w-8 h-8 rounded-lg object-contain" />
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Vanadium CRM</p>
            <p className="text-xs text-gray-400">Follow-up CRM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="flex-1">{label}</span>
                {label === 'Follow-ups' && urgent > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {urgent}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + sign out */}
      <div className="px-4 py-4 border-t border-gray-100 space-y-2">
        {user?.email && (
          <p className="text-xs text-gray-400 truncate px-1" title={user.email}>{user.email}</p>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  )
}
