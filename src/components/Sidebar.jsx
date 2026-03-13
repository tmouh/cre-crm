import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, Briefcase, Bell, LogOut, Settings, Trash2, Map, Kanban, Database, Users2, Zap, BarChart3, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'
import { isOverdue, isDueToday } from '../utils/helpers'

const NAV = [
  { to: '/',                label: 'Dashboard',         Icon: LayoutDashboard },
  { to: '/reminders',       label: 'Reminders',        Icon: Bell },
  { to: '/contacts',        label: 'Contacts',          Icon: Users },
  { to: '/companies',       label: 'Companies',         Icon: Building2, children: [
    { to: '/investors', label: 'LP Investors', Icon: Users2 },
  ]},
  { to: '/properties',      label: 'Deals',             Icon: Briefcase },
  { to: '/pipeline',        label: 'Pipeline',          Icon: Kanban },
  { to: '/comps',           label: 'Comps',             Icon: Database },
  { to: '/map',             label: 'Map',               Icon: Map },
  { to: '/reports',         label: 'Reports',           Icon: BarChart3 },
  { to: '/automations',     label: 'Automations',       Icon: Zap },
  { to: '/recently-deleted', label: 'Recently Deleted', Icon: Trash2 },
]

function NavItem({ to, label, Icon, urgent, isActive }) {
  return (
    <>
      <Icon size={16} strokeWidth={isActive ? 2 : 1.5} className={clsx('flex-shrink-0', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300')} />
      <span className="flex-1">{label}</span>
      {label === 'Reminders' && urgent > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {urgent}
        </span>
      )}
    </>
  )
}

const navLinkClass = ({ isActive }) => clsx(
  'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group',
  isActive
    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
)

export default function Sidebar() {
  const { reminders } = useCRM()
  const { user, signOut } = useAuth()
  const location = useLocation()
  const urgent = reminders.filter(r => r.status !== 'done' && (isOverdue(r.dueDate) || isDueToday(r.dueDate))).length

  const childRouteActive = location.pathname.startsWith('/investors')
  const [companiesExpanded, setCompaniesExpanded] = useState(childRouteActive)

  return (
    <aside className="w-[220px] flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-700/80 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <img src="/Vtransparent.png" alt="Vanadium" className="w-8 h-8 object-contain" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight">Vanadium OS</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">by Vanadium Group</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, label, Icon, children }) => {
          if (children) {
            // Parent with collapsible children
            const parentActive = location.pathname === to || location.pathname.startsWith(to + '/')
            return (
              <div key={to}>
                <div className="flex items-center">
                  <NavLink
                    to={to}
                    end
                    className={({ isActive }) => clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group flex-1 min-w-0',
                      (isActive || childRouteActive)
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                    )}
                  >
                    {({ isActive }) => (
                      <NavItem to={to} label={label} Icon={Icon} urgent={urgent} isActive={isActive || childRouteActive} />
                    )}
                  </NavLink>
                  <button
                    onClick={() => setCompaniesExpanded(p => !p)}
                    className={clsx(
                      'p-1.5 rounded-md transition-colors flex-shrink-0 -ml-1',
                      'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800'
                    )}
                  >
                    <ChevronDown size={14} className={clsx('transition-transform duration-200', !companiesExpanded && '-rotate-90')} />
                  </button>
                </div>
                {companiesExpanded && (
                  <div className="ml-5 mt-0.5 space-y-0.5">
                    {children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) => clsx(
                          'flex items-center gap-2.5 pl-4 pr-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 group',
                          isActive
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300'
                        )}
                      >
                        {({ isActive }) => (
                          <>
                            <child.Icon size={14} strokeWidth={isActive ? 2 : 1.5} className={clsx('flex-shrink-0', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400')} />
                            <span>{child.label}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink key={to} to={to} end={to === '/'} className={navLinkClass}>
              {({ isActive }) => (
                <NavItem to={to} label={label} Icon={Icon} urgent={urgent} isActive={isActive} />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Settings + User + sign out */}
      <div className="px-3 pb-2">
        <NavLink
          to="/settings"
          className={navLinkClass}
        >
          {({ isActive }) => (
            <>
              <Settings size={16} strokeWidth={isActive ? 2 : 1.5} className={clsx('flex-shrink-0', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300')} />
              <span>Settings</span>
            </>
          )}
        </NavLink>
      </div>
      <div className="px-4 py-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {user && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate px-1" title={user.email}>{user.user_metadata?.full_name || user.email}</p>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-[11px] text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:text-slate-500 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  )
}
