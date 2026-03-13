import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Briefcase, Bell, LogOut, Settings,
  Trash2, Map, Kanban, Database, Users2, Zap, BarChart3, ChevronDown,
  Activity, FolderOpen, Search, PanelLeftClose, PanelLeft,
  Sun, Moon, Monitor,
} from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../../context/CRMContext'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { isOverdue, isDueToday } from '../../utils/helpers'

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { to: '/',           label: 'Dashboard',  Icon: LayoutDashboard },
      { to: '/inbox',      label: 'Inbox',      Icon: Activity },
      { to: '/reminders',  label: 'Tasks',      Icon: Bell, showBadge: true },
    ],
  },
  {
    label: 'CRM',
    items: [
      { to: '/contacts',   label: 'Contacts',   Icon: Users },
      {
        to: '/companies',
        label: 'Companies',
        Icon: Building2,
        children: [
          { to: '/investors', label: 'LP Investors', Icon: Users2 },
        ],
      },
      { to: '/deals',      label: 'Deals',      Icon: Briefcase },
      { to: '/pipeline',   label: 'Pipeline',   Icon: Kanban },
    ],
  },
  {
    label: 'Intel',
    items: [
      { to: '/documents',  label: 'Documents',  Icon: FolderOpen },
      { to: '/comps',      label: 'Comps',      Icon: Database },
      { to: '/map',        label: 'Map',        Icon: Map },
      { to: '/reports',    label: 'Reports',    Icon: BarChart3 },
    ],
  },
]

const BOTTOM_NAV = [
  { to: '/automations',       label: 'Automations',       Icon: Zap },
  { to: '/settings',          label: 'Settings',          Icon: Settings },
  { to: '/recently-deleted',  label: 'Recently Deleted',  Icon: Trash2 },
]

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor }
const THEME_ORDER = ['light', 'dark', 'system']

export default function Sidebar({ collapsed, onToggle }) {
  const { reminders } = useCRM()
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const location = useLocation()

  const urgentCount = reminders.filter(
    r => r.status !== 'done' && (isOverdue(r.dueDate) || isDueToday(r.dueDate))
  ).length

  const childRouteActive = location.pathname.startsWith('/investors')
  const [companiesOpen, setCompaniesOpen] = useState(childRouteActive)

  const ThemeIcon = THEME_ICONS[theme] || Monitor

  function cycleTheme() {
    const idx = THEME_ORDER.indexOf(theme)
    setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length])
  }

  return (
    <aside
      className={clsx(
        'flex-shrink-0 flex flex-col h-screen sticky top-0 transition-all duration-200 z-30',
        'bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]',
        collapsed ? 'w-[56px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center border-b border-slate-100 dark:border-slate-800/50 h-[52px] flex-shrink-0',
        collapsed ? 'justify-center px-2' : 'px-4 gap-2.5'
      )}>
        <img src="/Vtransparent.png" alt="V" className="w-7 h-7 object-contain flex-shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight truncate">Vanadium OS</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-4">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-2 mb-1.5 text-2xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <SidebarItem
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  urgentCount={urgentCount}
                  companiesOpen={companiesOpen}
                  setCompaniesOpen={setCompaniesOpen}
                  childRouteActive={childRouteActive}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-100 dark:border-slate-800/50 px-2 py-2 space-y-0.5">
        {BOTTOM_NAV.map(item => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} />
        ))}

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          className={clsx(
            'flex items-center gap-2.5 w-full rounded-md transition-colors',
            'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
            'dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800',
            collapsed ? 'justify-center p-2' : 'px-2.5 py-1.5 text-[12px]'
          )}
        >
          <ThemeIcon size={15} className="flex-shrink-0" />
          {!collapsed && <span className="capitalize">{theme}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={clsx(
            'flex items-center gap-2.5 w-full rounded-md transition-colors',
            'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
            'dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800',
            collapsed ? 'justify-center p-2' : 'px-2.5 py-1.5 text-[12px]'
          )}
        >
          {collapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* User */}
      <div className={clsx(
        'border-t border-slate-100 dark:border-slate-800/50 flex items-center',
        collapsed ? 'justify-center py-3 px-2' : 'px-3 py-3 gap-2.5'
      )}>
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">
            {(user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase()}
          </span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
              {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={signOut}
            title="Sign out"
            className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
          >
            <LogOut size={13} />
          </button>
        )}
      </div>
    </aside>
  )
}

function SidebarItem({ item, collapsed, urgentCount, companiesOpen, setCompaniesOpen, childRouteActive }) {
  const location = useLocation()

  if (item.children) {
    const parentActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/') || childRouteActive
    return (
      <div>
        <div className="flex items-center">
          <NavLink
            to={item.to}
            end
            className={({ isActive }) => clsx(
              'flex items-center gap-2.5 flex-1 min-w-0 rounded-md transition-colors',
              collapsed ? 'justify-center p-2' : 'px-2.5 py-1.5 text-[12px] font-medium',
              (isActive || childRouteActive)
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            )}
          >
            <item.Icon size={15} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
          {!collapsed && (
            <button
              onClick={() => setCompaniesOpen(p => !p)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex-shrink-0"
            >
              <ChevronDown size={12} className={clsx('transition-transform', !companiesOpen && '-rotate-90')} />
            </button>
          )}
        </div>
        {companiesOpen && !collapsed && (
          <div className="ml-4 mt-0.5 space-y-0.5">
            {item.children.map(child => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) => clsx(
                  'flex items-center gap-2 pl-3 pr-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                )}
              >
                <child.Icon size={13} className="flex-shrink-0" />
                <span>{child.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return <SidebarLink item={item} collapsed={collapsed} urgentCount={item.showBadge ? urgentCount : 0} />
}

function SidebarLink({ item, collapsed, urgentCount = 0 }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) => clsx(
        'flex items-center gap-2.5 rounded-md transition-colors group relative',
        collapsed ? 'justify-center p-2' : 'px-2.5 py-1.5 text-[12px] font-medium',
        isActive
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.Icon size={15} className="flex-shrink-0" />
      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
      {urgentCount > 0 && (
        <span className={clsx(
          'min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-2xs font-bold flex items-center justify-center',
          collapsed && 'absolute -top-0.5 -right-0.5 scale-75'
        )}>
          {urgentCount}
        </span>
      )}
      {/* Tooltip on collapse */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 rounded bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
          {item.label}
        </div>
      )}
    </NavLink>
  )
}
