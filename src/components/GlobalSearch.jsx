import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Building2, Briefcase, Database, X } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { fullName, formatDealType, formatDealStatus, formatAssetType, formatCurrency } from '../utils/helpers'

export default function GlobalSearch() {
  const { contacts, companies, properties, comps } = useCRM()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const items = []

    contacts.filter(c => fullName(c).toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q))
      .slice(0, 5).forEach(c => items.push({ type: 'contact', id: c.id, title: fullName(c), subtitle: c.title || c.email, icon: Users, to: `/contacts/${c.id}` }))

    companies.filter(c => c.name?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q))
      .slice(0, 5).forEach(c => items.push({ type: 'company', id: c.id, title: c.name, subtitle: c.type, icon: Building2, to: `/companies/${c.id}` }))

    properties.filter(p => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q))
      .slice(0, 5).forEach(p => items.push({ type: 'deal', id: p.id, title: p.name || p.address, subtitle: [formatDealType(p.dealType), formatDealStatus(p.status), formatCurrency(p.dealValue)].filter(Boolean).join(' · '), icon: Briefcase, to: `/deals/${p.id}` }))

    comps.filter(c => c.address?.toLowerCase().includes(q) || c.buyer?.toLowerCase().includes(q) || c.seller?.toLowerCase().includes(q) || c.market?.toLowerCase().includes(q))
      .slice(0, 3).forEach(c => items.push({ type: 'comp', id: c.id, title: c.address, subtitle: [formatAssetType(c.propertyType), formatCurrency(c.salePrice)].filter(Boolean).join(' · '), icon: Database, to: `/comps/${c.id}` }))

    return items
  }, [query, contacts, companies, properties, comps])

  useEffect(() => { setSelectedIdx(0) }, [query])

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[selectedIdx]) {
      navigate(results[selectedIdx].to)
      setOpen(false)
      setQuery('')
    }
  }

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="flex items-center gap-2 px-2.5 py-1 text-[11px] text-slate-400 dark:text-slate-500 bg-surface-50 dark:bg-surface-100 hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors border border-[var(--border)]">
        <Search size={14} />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-400 dark:text-slate-500 font-mono">Ctrl+K</kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => { setOpen(false); setQuery('') }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white dark:bg-surface-100 shadow-elevated border border-[var(--border)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search contacts, companies, deals, comps..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            autoFocus
          />
          <button onClick={() => { setOpen(false); setQuery('') }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={16} />
          </button>
        </div>

        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No results found</div>
        )}

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-1">
            {results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => { navigate(r.to); setOpen(false); setQuery('') }}
                className={clsx('w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors', i === selectedIdx ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50')}
              >
                <r.icon size={15} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{r.title}</p>
                  {r.subtitle && <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{r.subtitle}</p>}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{r.type}</span>
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500">
          <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-mono">↵</kbd> Open</span>
          <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-mono">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
