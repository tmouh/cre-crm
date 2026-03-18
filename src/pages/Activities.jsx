import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Phone, Mail, Users, FileText, Map, MessageSquare, Building2, Clock } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { fullName, formatDate, ACTIVITY_TYPES } from '../utils/helpers'
import PageHeader from '../components/PageHeader'

const TYPE_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: FileText,
  tour: Map,
  proposal: Building2,
  other: MessageSquare,
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

export default function Activities() {
  const { activities, contacts, companies, properties } = useCRM()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 100

  const sorted = useMemo(() =>
    [...activities].sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || '')),
    [activities]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return sorted.filter(a => {
      if (filterType && a.type !== filterType) return false
      if (!q) return true
      const contact = a.contactId ? contacts.find(c => c.id === a.contactId) : null
      const company = a.companyId ? companies.find(c => c.id === a.companyId) : null
      const deal = a.propertyId ? properties.find(p => p.id === a.propertyId) : null
      return (
        (a.description || '').toLowerCase().includes(q) ||
        (contact && fullName(contact).toLowerCase().includes(q)) ||
        (company?.name || '').toLowerCase().includes(q) ||
        (deal?.name || deal?.address || '').toLowerCase().includes(q) ||
        (a.type || '').toLowerCase().includes(q)
      )
    })
  }, [sorted, search, filterType, contacts, companies, properties])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset page on filter change
  const handleSearch = (v) => { setSearch(v); setPage(0) }
  const handleType = (v) => { setFilterType(v); setPage(0) }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="os-toolbar flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search activities..."
            className="v-input pl-7 text-[11px]"
          />
        </div>
        <select value={filterType} onChange={e => handleType(e.target.value)} className="v-select w-32 text-[11px]">
          <option value="">All types</option>
          {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
          {filtered.length} activities
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="v-btn-secondary text-[10px] px-1.5 py-0.5 disabled:opacity-30">Prev</button>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">{page + 1}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="v-btn-secondary text-[10px] px-1.5 py-0.5 disabled:opacity-30">Next</button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Clock size={22} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No activities found</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="v-table">
            <thead className="sticky top-0 z-10">
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Contact</th>
                <th>Company</th>
                <th>Deal</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(a => {
                const contact = a.contactId ? contacts.find(c => c.id === a.contactId) : null
                const company = a.companyId ? companies.find(c => c.id === a.companyId) : null
                const deal = a.propertyId ? properties.find(p => p.id === a.propertyId) : null
                const Icon = TYPE_ICONS[a.type] || MessageSquare
                const dateStr = a.date || a.createdAt
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Icon size={12} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-[11px] capitalize">{a.type}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {dateStr ? formatDate(dateStr) : '—'}
                      </span>
                    </td>
                    <td>
                      {contact ? (
                        <Link to={`/contacts/${contact.id}`} className="text-[12px] text-slate-700 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400">
                          {fullName(contact)}
                        </Link>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td>
                      {company ? (
                        <Link to={`/companies/${company.id}`} className="text-[12px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                          {company.name}
                        </Link>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td>
                      {deal ? (
                        <Link to={`/deals/${deal.id}`} className="text-[12px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                          {deal.name || deal.address || 'Unnamed'}
                        </Link>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                        {a.description || '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="os-status-bar flex-shrink-0">
        <span>{filtered.length} activities</span>
        {filterType && <span>filtered by {filterType}</span>}
      </div>
    </div>
  )
}
