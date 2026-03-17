import { useState } from 'react'
import {
  Sun, Moon, Monitor, Settings as SettingsIcon, Wifi, WifiOff,
  CheckCircle2, XCircle, RefreshCw, LogOut, Shield,
  Mail, Calendar, Users, FolderOpen, MessageSquare, Eye, Video,
} from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '../context/ThemeContext'
import { useMicrosoft } from '../context/MicrosoftContext'
import { PRIORITIES } from '../utils/helpers'
import CompanyTypeCombobox from '../components/CompanyTypeCombobox'

const STORAGE_PREFIX = 'vanadium-setting-'

function useSetting(key, fallback) {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(STORAGE_PREFIX + key) || fallback } catch { return fallback }
  })
  function set(v) {
    setValue(v)
    try { localStorage.setItem(STORAGE_PREFIX + key, v) } catch {}
  }
  return [value, set]
}

const CAPABILITY_META = [
  { key: 'mail',     label: 'Mail',       icon: Mail,           desc: 'Read emails and attachments' },
  { key: 'calendar', label: 'Calendar',   icon: Calendar,       desc: 'Read meetings and events' },
  { key: 'contacts', label: 'Contacts',   icon: Users,          desc: 'Read Outlook contacts' },
  { key: 'files',    label: 'Files',      icon: FolderOpen,     desc: 'OneDrive and SharePoint files' },
  { key: 'people',   label: 'People',     icon: Users,          desc: 'People graph and LinkedIn data' },
  { key: 'teams',    label: 'Teams',      icon: MessageSquare,  desc: 'Teams channels and chats' },
  { key: 'presence', label: 'Presence',   icon: Eye,            desc: 'User availability status' },
  { key: 'meetings', label: 'Meetings',   icon: Video,          desc: 'Online meeting metadata' },
]

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const {
    isConnected, account, profile, capabilities, connect, disconnect,
    sync, syncState, connectError, clearConnectError,
  } = useMicrosoft()

  const [defaultCompanyType, setDefaultCompanyType] = useSetting('default-company-type', 'other')
  const [defaultPriority, setDefaultPriority] = useSetting('default-priority', 'medium')

  const themeOptions = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ]

  return (
    <div className="p-6 max-w-[800px] mx-auto animate-fade-in space-y-4">
      {/* Microsoft 365 Integration */}
      <section className="v-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              isConnected ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-100 dark:bg-surface-100'
            )}>
              {isConnected ? <Wifi size={16} className="text-emerald-500" /> : <WifiOff size={16} className="text-slate-400" />}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Microsoft 365 Integration</h3>
              <p className="text-2xs text-slate-400 dark:text-slate-500">
                {isConnected ? `Connected as ${profile?.displayName || account?.username || 'user'}` : 'Not connected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <button
                  onClick={sync}
                  disabled={syncState.syncing}
                  className="v-btn-ghost text-2xs"
                >
                  <RefreshCw size={12} className={syncState.syncing ? 'animate-spin' : ''} />
                  {syncState.syncing ? 'Syncing...' : 'Sync now'}
                </button>
                <button onClick={disconnect} className="v-btn-ghost text-2xs text-red-500 hover:text-red-600">
                  <LogOut size={12} /> Disconnect
                </button>
              </>
            )}
            {!isConnected && (
              <button onClick={() => connect(false)} className="v-btn-primary text-2xs">
                <svg viewBox="0 0 21 21" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Connect Microsoft 365
              </button>
            )}
          </div>
        </div>

        {/* Sync status */}
        {isConnected && (
          <div className="px-5 py-2 bg-slate-50 dark:bg-surface-100 border-b border-[var(--border)] text-2xs text-slate-400 dark:text-slate-500 flex items-center justify-between gap-4">
            <span>
              {syncState.lastSync
                ? <>Last synced: {new Date(syncState.lastSync).toLocaleString()}</>
                : 'Not yet synced this session'}
              {syncState.error && <span className="text-red-500 ml-2">Error: {syncState.error}</span>}
            </span>
            <span className="text-slate-300 dark:text-slate-600 flex-shrink-0">Syncs every 5 min · subscriptions renewed every 6 h</span>
          </div>
        )}

        {/* Connect error banner */}
        {connectError && (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-2xs">
            <span className="text-amber-700 dark:text-amber-300">{connectError}</span>
            <button onClick={clearConnectError} className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 flex-shrink-0">✕</button>
          </div>
        )}

        {/* Capabilities */}
        {isConnected && capabilities && (
          <div className="px-5 py-4">
            <p className="text-2xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Capabilities</p>
            <div className="grid grid-cols-2 gap-2">
              {CAPABILITY_META.map(cap => {
                const enabled = capabilities[cap.key]
                return (
                  <div key={cap.key} className={clsx(
                    'flex items-center gap-2.5 p-2.5 rounded-md',
                    enabled ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-slate-50 dark:bg-surface-100'
                  )}>
                    {enabled
                      ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                      : <XCircle size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className={clsx('text-xs font-medium', enabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')}>
                        {cap.label}
                      </p>
                      <p className="text-2xs text-slate-400 dark:text-slate-500">{cap.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Upgrade to full permissions */}
            {!capabilities.teams && (
              <button onClick={() => connect(true)} className="v-btn-secondary text-2xs mt-3">
                <Shield size={12} /> Request additional permissions
              </button>
            )}
          </div>
        )}

        {/* Scope info for non-connected state */}
        {!isConnected && (
          <div className="px-5 py-4">
            <p className="text-2xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">What gets connected</p>
            <div className="grid grid-cols-2 gap-1.5">
              {CAPABILITY_META.slice(0, 6).map(cap => (
                <div key={cap.key} className="flex items-center gap-2 text-2xs text-slate-500 dark:text-slate-400 py-1">
                  <cap.icon size={12} className="text-slate-400" /> {cap.label}: {cap.desc}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Appearance */}
      <section className="v-card p-5">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Appearance</h3>
        <p className="text-2xs text-slate-400 dark:text-slate-500 mb-4">Choose your preferred theme.</p>
        <div className="flex gap-2">
          {themeOptions.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1.5 px-3 py-3 border-2 transition-all text-xs',
                theme === value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
                  : 'border-[var(--border)] hover:border-slate-300 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400'
              )}
            >
              <Icon size={16} />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Defaults */}
      <section className="v-card p-5">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Defaults</h3>
        <p className="text-2xs text-slate-400 dark:text-slate-500 mb-4">Set default values for new records.</p>
        <div className="space-y-4">
          <div className="max-w-xs">
            <label className="v-label">Default company type</label>
            <CompanyTypeCombobox value={defaultCompanyType} onChange={setDefaultCompanyType} />
          </div>
          <div>
            <label className="v-label">Default reminder priority</label>
            <select value={defaultPriority} onChange={e => setDefaultPriority(e.target.value)} className="v-select max-w-xs">
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </section>
    </div>
  )
}
