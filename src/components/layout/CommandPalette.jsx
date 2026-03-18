import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Users, Building2, Briefcase, Database, X, Bell,
  Plus, Activity, FolderOpen, ArrowRight, Hash,
} from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../../context/CRMContext'
import { fullName, formatDealType, formatCurrency, formatDealStatus } from '../../utils/helpers'

const QUICK_ACTIONS = [
  { id: 'new-contact',  label: 'New Contact',  icon: Users,     action: 'create', entity: 'contact' },
  { id: 'new-company',  label: 'New Company',  icon: Building2, action: 'create', entity: 'company' },
  { id: 'new-deal',     label: 'New Deal',     icon: Briefcase, action: 'create', entity: 'deal' },
  { id: 'new-reminder', label: 'New Task',     icon: Bell,      action: 'create', entity: 'reminder' },
]

const NAVIGATE_ACTIONS = [
  { id: 'nav-dashboard',  label: 'Go to Dashboard',  path: '/',          icon: Activity },
  { id: 'nav-contacts',   label: 'Go to Contacts',   path: '/contacts',  icon: Users },
  { id: 'nav-companies',  label: 'Go to Companies',  path: '/companies', icon: Building2 },
  { id: 'nav-deals',      label: 'Go to Deals',      path: '/deals',     icon: Briefcase },
  { id: 'nav-pipeline',   label: 'Go to Pipeline',   path: '/pipeline',  icon: Hash },
  { id: 'nav-inbox',      label: 'Go to Inbox',      path: '/inbox',     icon: Activity },
  { id: 'nav-documents',  label: 'Go to Documents',  path: '/documents', icon: FolderOpen },
]

export default function CommandPalette({ open, onClose, onQuickCreate }) {
  const { contacts, companies, properties, comps, reminders } = useCRM()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Global Ctrl+K listener
  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onClose('toggle')
      }
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const results = useMemo(() => {
    const q = query.toLowerCase().trim()
    const items = []

    if (!q) {
      // Show quick actions when empty
      QUICK_ACTIONS.forEach(a => items.push({
        type: 'action', id: a.id, title: a.label, icon: a.icon,
        onSelect: () => { onClose(); onQuickCreate?.(a.entity) },
      }))
      NAVIGATE_ACTIONS.forEach(a => items.push({
        type: 'navigate', id: a.id, title: a.label, icon: a.icon,
        onSelect: () => { navigate(a.path); onClose() },
      }))
      return items
    }

    // Search entities
    contacts
      .filter(c => {
        const emails = [c.email, ...(c.personalEmails || []), ...(c.sharedEmails || [])].filter(Boolean)
        return fullName(c).toLowerCase().includes(q) || emails.some(e => e.toLowerCase().includes(q)) || c.title?.toLowerCase().includes(q)
      })
      .slice(0, 5)
      .forEach(c => items.push({
        type: 'contact', id: c.id, title: fullName(c),
        subtitle: [c.title, c.email || c.personalEmails?.[0] || c.sharedEmails?.[0]].filter(Boolean).join(' · '),
        icon: Users,
        onSelect: () => { navigate(`/contacts/${c.id}`); onClose() },
      }))

    companies
      .filter(c => c.name?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(c => items.push({
        type: 'company', id: c.id, title: c.name,
        subtitle: c.type,
        icon: Building2,
        onSelect: () => { navigate(`/companies/${c.id}`); onClose() },
      }))

    properties
      .filter(p => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(p => items.push({
        type: 'deal', id: p.id, title: p.name || p.address,
        subtitle: [formatDealType(p.dealType), formatDealStatus(p.status), formatCurrency(p.dealValue)].filter(Boolean).join(' · '),
        icon: Briefcase,
        onSelect: () => { navigate(`/deals/${p.id}`); onClose() },
      }))

    comps
      .filter(c => c.address?.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach(c => items.push({
        type: 'comp', id: c.id, title: c.address,
        subtitle: formatCurrency(c.salePrice),
        icon: Database,
        onSelect: () => { navigate(`/comps/${c.id}`); onClose() },
      }))

    // Also search actions
    QUICK_ACTIONS
      .filter(a => a.label.toLowerCase().includes(q))
      .forEach(a => items.push({
        type: 'action', id: a.id, title: a.label, icon: a.icon,
        onSelect: () => { onClose(); onQuickCreate?.(a.entity) },
      }))

    NAVIGATE_ACTIONS
      .filter(a => a.label.toLowerCase().includes(q))
      .forEach(a => items.push({
        type: 'navigate', id: a.id, title: a.label, icon: a.icon,
        onSelect: () => { navigate(a.path); onClose() },
      }))

    return items
  }, [query, contacts, companies, properties, comps, navigate, onClose, onQuickCreate])

  useEffect(() => { setSelectedIdx(0) }, [query])

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      results[selectedIdx].onSelect()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-white dark:bg-surface-50 shadow-elevated border border-[var(--border)] overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/50">
          <Search size={15} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or type a command..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {results.length === 0 && query && (
            <div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No results for "{query}"
            </div>
          )}

          {/* Group results by type */}
          {!query && results.length > 0 && (
            <>
              <div className="px-3 py-1.5">
                <p className="text-2xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Quick Actions</p>
              </div>
              {results.filter(r => r.type === 'action').map((r, i) => {
                const globalIdx = results.indexOf(r)
                return <ResultItem key={r.id} result={r} selected={globalIdx === selectedIdx} />
              })}
              <div className="px-3 py-1.5 mt-1">
                <p className="text-2xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Navigate</p>
              </div>
              {results.filter(r => r.type === 'navigate').map((r, i) => {
                const globalIdx = results.indexOf(r)
                return <ResultItem key={r.id} result={r} selected={globalIdx === selectedIdx} />
              })}
            </>
          )}

          {query && results.map((r, i) => (
            <ResultItem key={`${r.type}-${r.id}`} result={r} selected={i === selectedIdx} />
          ))}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-4 text-2xs text-slate-400 dark:text-slate-500">
          <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-200 rounded font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-200 rounded font-mono">↵</kbd> Select</span>
          <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-200 rounded font-mono">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}

function ResultItem({ result, selected }) {
  const Icon = result.icon
  return (
    <button
      onClick={result.onSelect}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
        selected
          ? 'bg-brand-50 dark:bg-brand-950/30'
          : 'hover:bg-slate-50 dark:hover:bg-surface-100'
      )}
    >
      <Icon size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{result.title}</p>
        {result.subtitle && (
          <p className="text-2xs text-slate-400 dark:text-slate-500 truncate">{result.subtitle}</p>
        )}
      </div>
      {result.type !== 'action' && result.type !== 'navigate' && (
        <span className="text-2xs text-slate-400 dark:text-slate-500 uppercase font-bold">{result.type}</span>
      )}
      {(result.type === 'action' || result.type === 'navigate') && (
        <ArrowRight size={12} className="text-slate-300 dark:text-slate-600" />
      )}
    </button>
  )
}
