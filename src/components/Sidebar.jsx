import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, MapPin, Bell, LogOut, Settings } from 'lucide-react'
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
    <aside className="w-56 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <img src="/Vtransparent.png" alt="Vanadium" className="w-8 h-8 object-contain" />
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Vanadium CRM</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Follow-up CRM</p>
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
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'} />
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

      {/* Settings + User + sign out */}
      <div className="px-3 pb-2">
        <NavLink
          to="/settings"
          className={({ isActive }) => clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
            isActive
              ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
          )}
        >
          {({ isActive }) => (
            <>
              <Settings size={16} className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'} />
              <span>Settings</span>
            </>
          )}
        </NavLink>
      </div>
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
        {user?.email && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate px-1" title={user.email}>{user.email}</p>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  )
}
