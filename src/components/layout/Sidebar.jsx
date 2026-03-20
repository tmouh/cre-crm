import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Briefcase, Bell, LogOut, Settings,
  Trash2, Map, Kanban, Database, Users2, Zap, BarChart3, ChevronDown,
  Activity, FolderOpen, PanelLeftClose, PanelLeft,
  Sun, Moon, Monitor, UserCircle, ListChecks, Video, RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../../context/CRMContext'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useMicrosoft } from '../../context/MicrosoftContext'
import { isOverdue, isDueToday } from '../../utils/helpers'

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { to: '/',           label: 'Dashboard',  Icon: LayoutDashboard },
      { to: '/inbox',      label: 'Inbox',      Icon: Activity },
      { to: '/reminders',  label: 'Tasks',      Icon: Bell, showBadge: true },
      { to: '/activities', label: 'Activities', Icon: ListChecks },
      { to: '/meetings',   label: 'Meetings',   Icon: Video },
    ],
  },
  {
    label: 'Personal',
    items: [
      { to: '/personal/contacts',  label: 'My Contacts',  Icon: UserCircle },
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
      { to: '/reports',    label: 'Reports',     Icon: BarChart3 },
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
  const { isConnected, connect, sync, syncState } = useMicrosoft()
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
        'flex-shrink-0 flex flex-col h-screen sticky top-0 transition-all duration-150 z-30',
        'bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]',
        collapsed ? 'w-[48px]' : 'w-[200px]'
      )}
    >
      {/* Logo bar */}
      <div className={clsx(
        'flex items-center border-b border-[var(--border)] h-[40px] flex-shrink-0',
        collapsed ? 'justify-center px-2' : 'px-3 gap-2'
      )}>
        <img src="/Vtransparent.png" alt="V" className="w-5 h-5 object-contain flex-shrink-0" />
        {!collapsed && (
          <span className="text-[11px] font-bold text-slate-800 dark:text-white tracking-tight font-mono uppercase">
            Vanadium
          </span>
        )}
        {isConnected && !collapsed && (
          <button
            onClick={() => sync()}
            title={syncState === 'syncing' ? 'Syncing with Microsoft 365...' : 'Sync with Microsoft 365'}
            className="flex-shrink-0 p-1 rounded transition-colors ml-auto text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-500 dark:hover:text-blue-400 dark:hover:bg-blue-900/30"
          >
            <RefreshCw size={13} className={syncState === 'syncing' ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 px-1.5 space-y-3">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-1.5 mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-600 font-mono">
                {section.label}
              </p>
            )}
            <div className="space-y-px">
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
      <div className="border-t border-[var(--border)] px-1.5 py-1.5 space-y-px">
        <SidebarLink item={BOTTOM_NAV[0]} collapsed={collapsed} />
        {!isConnected && (
          <button
            onClick={() => connect(false)}
            title="Connect Microsoft 365"
            className={clsx(
              'flex items-center gap-2 w-full transition-colors',
              'text-slate-500 hover:text-slate-700 hover:bg-surface-100',
              'dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-surface-200',
              collapsed ? 'justify-center p-1.5' : 'px-2 py-1 text-[11px] font-medium'
            )}
          >
            <svg viewBox="0 0 21 21" className="w-3.5 h-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            {!collapsed && <span className="truncate">Connect M365</span>}
          </button>
        )}
        {BOTTOM_NAV.slice(1).map(item => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} />
        ))}

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          className={clsx(
            'flex items-center gap-2 w-full transition-colors',
            'text-slate-400 hover:text-slate-600 hover:bg-surface-100',
            'dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-surface-200',
            collapsed ? 'justify-center p-1.5' : 'px-2 py-1 text-[11px]'
          )}
        >
          <ThemeIcon size={14} className="flex-shrink-0" />
          {!collapsed && <span className="font-mono text-[10px] uppercase">{theme}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={clsx(
            'flex items-center gap-2 w-full transition-colors',
            'text-slate-400 hover:text-slate-600 hover:bg-surface-100',
            'dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-surface-200',
            collapsed ? 'justify-center p-1.5' : 'px-2 py-1 text-[11px]'
          )}
        >
          {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
          {!collapsed && <span className="font-mono text-[10px] uppercase">Collapse</span>}
        </button>
      </div>

      {/* User */}
      <div className={clsx(
        'border-t border-[var(--border)] flex items-center',
        collapsed ? 'justify-center py-2 px-1.5' : 'px-2.5 py-2 gap-2'
      )}>
        <div className="w-6 h-6 bg-brand-600 flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-bold text-white font-mono">
            {(user?.user_metadata?.full_name || user?.email || '?')[0].toUpperCase()}
          </span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate">
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
            <LogOut size={12} />
          </button>
        )}
      </div>
    </aside>
  )
}

function SidebarItem({ item, collapsed, urgentCount, companiesOpen, setCompaniesOpen, childRouteActive }) {
  const location = useLocation()

  if (item.children) {
    return (
      <div>
        <div className="flex items-center">
          <NavLink
            to={item.to}
            end
            className={({ isActive }) => clsx(
              'flex items-center gap-2 flex-1 min-w-0 transition-colors',
              collapsed ? 'justify-center p-1.5' : 'px-2 py-1 text-[11px] font-medium',
              (isActive || childRouteActive)
                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30'
                : 'text-slate-500 hover:bg-surface-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-surface-200 dark:hover:text-slate-200'
            )}
          >
            <item.Icon size={14} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
          {!collapsed && (
            <button
              onClick={() => setCompaniesOpen(p => !p)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex-shrink-0"
            >
              <ChevronDown size={10} className={clsx('transition-transform', !companiesOpen && '-rotate-90')} />
            </button>
          )}
        </div>
        {companiesOpen && !collapsed && (
          <div className="ml-3.5 mt-px space-y-px border-l border-[var(--border)]">
            {item.children.map(child => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) => clsx(
                  'flex items-center gap-1.5 pl-2.5 pr-2 py-0.5 text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                )}
              >
                <child.Icon size={12} className="flex-shrink-0" />
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
        'flex items-center gap-2 transition-colors group relative',
        collapsed ? 'justify-center p-1.5' : 'px-2 py-1 text-[11px] font-medium',
        isActive
          ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30'
          : 'text-slate-500 hover:bg-surface-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-surface-200 dark:hover:text-slate-200'
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.Icon size={14} className="flex-shrink-0" />
      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
      {urgentCount > 0 && (
        <span className={clsx(
          'min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[9px] font-bold font-mono flex items-center justify-center',
          collapsed && 'absolute -top-0.5 -right-0.5 scale-75'
        )}>
          {urgentCount}
        </span>
      )}
      {/* Tooltip on collapse */}
      {collapsed && (
        <div className="absolute left-full ml-1 px-1.5 py-0.5 bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-mono whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
          {item.label}
        </div>
      )}
    </NavLink>
  )
}
