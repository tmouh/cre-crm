import { Search, Wifi, WifiOff, Plus } from 'lucide-react'
import clsx from 'clsx'

export default function TopBar({ title, subtitle, onSearchOpen, onQuickCreate, microsoftConnected }) {
  return (
    <header className="h-[52px] flex items-center justify-between px-6 border-b border-slate-200/80 dark:border-slate-700/30 bg-white/80 dark:bg-surface-0 backdrop-blur-sm sticky top-0 z-20 flex-shrink-0">
      {/* Left: Page title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h1>
          {subtitle && (
            <p className="text-2xs text-slate-400 dark:text-slate-500 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Quick create */}
        {onQuickCreate && (
          <button
            onClick={onQuickCreate}
            className="v-btn-primary h-7 px-2.5 text-2xs"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New</span>
          </button>
        )}

        {/* Search */}
        <button
          onClick={onSearchOpen}
          className={clsx(
            'flex items-center gap-2 h-7 px-2.5 rounded-md text-[11px]',
            'bg-slate-100 dark:bg-surface-100 border border-slate-200 dark:border-slate-700/50',
            'text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600',
            'transition-colors'
          )}
        >
          <Search size={12} />
          <span className="hidden md:inline text-slate-400 dark:text-slate-500">Search</span>
          <kbd className="hidden md:inline text-2xs px-1 py-0.5 bg-slate-200 dark:bg-surface-200 rounded text-slate-400 dark:text-slate-500 font-mono ml-2">
            Ctrl+K
          </kbd>
        </button>

        {/* Microsoft status */}
        <div
          title={microsoftConnected ? 'Microsoft 365 connected' : 'Microsoft 365 not connected'}
          className={clsx(
            'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
            microsoftConnected
              ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
              : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-surface-100'
          )}
        >
          {microsoftConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
        </div>
      </div>
    </header>
  )
}
