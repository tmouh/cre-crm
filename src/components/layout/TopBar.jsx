import { Search, Wifi, WifiOff, Plus } from 'lucide-react'
import clsx from 'clsx'

export default function TopBar({ title, subtitle, onSearchOpen, onQuickCreate, microsoftConnected }) {
  return (
    <header className="h-[40px] flex items-center justify-between px-4 border-b border-[var(--border)] bg-surface-0 sticky top-0 z-20 flex-shrink-0">
      {/* Left: breadcrumb-style title */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-[12px] font-bold text-slate-800 dark:text-white font-mono uppercase tracking-wide">{title}</h1>
        {subtitle && (
          <>
            <span className="text-slate-300 dark:text-slate-600 text-[10px]">/</span>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">{subtitle}</p>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Quick create */}
        {onQuickCreate && (
          <button
            onClick={onQuickCreate}
            className="v-btn-primary h-6 px-2 text-[10px]"
          >
            <Plus size={11} />
            <span className="hidden sm:inline font-mono">NEW</span>
          </button>
        )}

        {/* Search */}
        <button
          onClick={onSearchOpen}
          className={clsx(
            'flex items-center gap-1.5 h-6 px-2 text-[10px]',
            'bg-surface-100 border border-[var(--border)]',
            'text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600',
            'transition-colors font-mono'
          )}
        >
          <Search size={11} />
          <span className="hidden md:inline">SEARCH</span>
          <kbd className="hidden md:inline text-[9px] px-0.5 bg-surface-200 text-slate-400 dark:text-slate-500 font-mono ml-1">
            ^K
          </kbd>
        </button>

        {/* Microsoft status indicator */}
        <div
          title={microsoftConnected ? 'Microsoft 365 connected' : 'Microsoft 365 not connected'}
          className={clsx(
            'w-6 h-6 flex items-center justify-center transition-colors',
            microsoftConnected
              ? 'text-emerald-500'
              : 'text-slate-400 dark:text-slate-600'
          )}
        >
          {microsoftConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
        </div>
      </div>
    </header>
  )
}
