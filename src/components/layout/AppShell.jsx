import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Loader2, AlertCircle, RotateCcw, X } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import CommandPalette from './CommandPalette'
import { useCRM } from '../../context/CRMContext'
import { useMicrosoft } from '../../context/MicrosoftContext'

const PAGE_TITLES = {
  '/':                 { title: 'Dashboard',        subtitle: 'Overview & priorities' },
  '/inbox':            { title: 'Inbox',            subtitle: 'Activity & communications' },
  '/reminders':        { title: 'Tasks',            subtitle: 'Reminders & follow-ups' },
  '/contacts':         { title: 'Contacts',         subtitle: 'Relationship management' },
  '/companies':        { title: 'Companies',        subtitle: 'Organizations & accounts' },
  '/investors':        { title: 'LP Investors',     subtitle: 'Investment partners' },
  '/deals':            { title: 'Deals',            subtitle: 'Active transactions' },
  '/pipeline':         { title: 'Pipeline',         subtitle: 'Deal flow visualization' },
  '/documents':        { title: 'Documents',        subtitle: 'Files & knowledge' },
  '/comps':            { title: 'Comps',            subtitle: 'Comparable transactions' },
  '/map':              { title: 'Map',              subtitle: 'Geographic view' },
  '/reports':          { title: 'Reports',          subtitle: 'Analytics & insights' },
  '/automations':      { title: 'Automations',      subtitle: 'Workflow rules' },
  '/settings':         { title: 'Settings',         subtitle: 'Configuration & integrations' },
  '/recently-deleted':    { title: 'Recently Deleted',  subtitle: '15-day recovery window' },
  '/personal/contacts':   { title: 'My Contacts',       subtitle: 'Your private & shared contacts' },
  '/personal/companies':  { title: 'My Companies',      subtitle: 'Your private & shared companies' },
  '/activities':          { title: 'Activities',         subtitle: 'Activity tracker & history' },
}

function getPageInfo(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/personal/contacts/')) return { title: 'Contact', subtitle: 'Detail view' }
  if (pathname.startsWith('/contacts/'))  return { title: 'Contact',  subtitle: 'Detail view' }
  if (pathname.startsWith('/companies/')) return { title: 'Company',  subtitle: 'Detail view' }
  if (pathname.startsWith('/deals/'))     return { title: 'Deal',     subtitle: 'Detail view' }
  if (pathname.startsWith('/investors/')) return { title: 'Investor', subtitle: 'Detail view' }
  if (pathname.startsWith('/comps/'))     return { title: 'Comp',     subtitle: 'Detail view' }
  return { title: 'Vanadium OS', subtitle: '' }
}

export default function AppShell() {
  const { loading, error, undoStack, undoLastDelete, dismissUndo } = useCRM()
  const { isConnected } = useMicrosoft()
  const location = useLocation()
  const toastTimerRef = useRef(null)
  const toast = undoStack[0] ?? null

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('v-sidebar-collapsed') === 'true' } catch { return false }
  })
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)

  const pageInfo = getPageInfo(location.pathname)

  function toggleSidebar() {
    setSidebarCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('v-sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  // Auto-dismiss toast
  useEffect(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    if (toast) {
      toastTimerRef.current = setTimeout(() => dismissUndo(), 5000)
    }
    return () => clearTimeout(toastTimerRef.current)
  }, [toast?.type, toast?.id, toast?.label]) // eslint-disable-line

  // Global Ctrl+Z
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const active = document.activeElement
        const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
        if (!isInput && undoStack.length > 0) {
          e.preventDefault()
          undoLastDelete()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undoStack, undoLastDelete])

  const handleCmdPaletteClose = useCallback((action) => {
    if (action === 'toggle') {
      setCmdPaletteOpen(prev => !prev)
    } else {
      setCmdPaletteOpen(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="flex flex-col items-center gap-2 animate-fade-in">
          <img src="/Vtransparent.png" alt="V" className="w-6 h-6 object-contain" />
          <Loader2 size={14} className="animate-spin text-brand-500" />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">Loading workspace</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-0">
        <div className="os-zone p-6 max-w-sm text-center animate-fade-in">
          <AlertCircle size={18} className="text-red-400 mx-auto mb-2" />
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Failed to load data</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">{error}</p>
          <button onClick={() => window.location.reload()} className="v-btn-secondary mt-3 text-[10px]">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          onSearchOpen={() => setCmdPaletteOpen(true)}
          microsoftConnected={isConnected}
        />

        <main className="flex-1 overflow-auto bg-surface-50">
          <Outlet />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={cmdPaletteOpen}
        onClose={handleCmdPaletteClose}
      />

      {/* Undo toast — structural, bottom-anchored */}
      {toast && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-mono animate-slide-up border border-slate-700">
          <span className="text-slate-400">
            <span className="font-semibold text-white uppercase">{toast.label}</span> deleted
          </span>
          <button
            onClick={() => { clearTimeout(toastTimerRef.current); undoLastDelete() }}
            className="flex items-center gap-1 px-1.5 py-0.5 bg-white/10 hover:bg-white/20 transition-colors font-semibold text-white text-[10px]"
          >
            <RotateCcw size={10} />
            UNDO
            <kbd className="text-[9px] text-slate-400 ml-0.5 font-mono">^Z</kbd>
          </button>
          <button
            onClick={() => { clearTimeout(toastTimerRef.current); dismissUndo() }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  )
}
