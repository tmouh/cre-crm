import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowLeft, Edit2, Trash2, Users2, Building2, Target, Phone, Mail, Globe, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { CAPITAL_TYPES, formatAssetType, formatCapitalType, formatCurrency, fullName, companyInitials } from '../utils/helpers'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import ReminderList from '../components/ReminderList'
import ActivityFeed from '../components/ActivityFeed'
import { CompanyForm } from './Companies'

const INVESTOR_INITIAL = { type: 'investor' }

// ─── Detail view ────────────────────────────────────────────────────────────────
function InvestorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { companies, contacts, updateCompany, deleteCompany, properties, dealInvestors, getCompany } = useCRM()
  const [editing, setEditing] = useState(false)

  const company = getCompany(id)
  if (!company) return <div className="p-4 text-slate-400 dark:text-slate-500 font-mono text-[11px]">INVESTOR NOT FOUND</div>

  const relatedContacts = contacts.filter(c => c.companyId === id)
  const dealLinks = dealInvestors.filter(di => di.companyId === id)
  const linkedDeals = dealLinks.map(di => ({ ...di, deal: properties.find(p => p.id === di.propertyId) })).filter(d => d.deal)

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* ─ Command header bar ─ */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-surface-0 flex-shrink-0">
        <Link to="/investors" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft size={14} />
        </Link>
        <div className="w-8 h-8 bg-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-white font-mono">{companyInitials(company)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{company.name}</h2>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono uppercase">Investor</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="v-btn-ghost p-1.5"><Edit2 size={13} /></button>
          <button onClick={async () => { if (confirm(`Delete ${company.name}?`)) { await deleteCompany(id); navigate('/investors') } }} className="v-btn-ghost p-1.5 hover:text-red-500"><Trash2 size={13} /></button>
        </div>
      </div>

      {/* ─ Two-zone workspace ─ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — company info + investment profile */}
        <div className="w-[280px] flex-shrink-0 border-r border-[var(--border)] overflow-auto bg-surface-0">
          {/* Contact info */}
          <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)] space-y-1.5">
            {company.address && <p className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400"><Building2 size={12} className="text-slate-400 dark:text-slate-500" /> {company.address}</p>}
            {company.email && <a href={`mailto:${company.email}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"><Mail size={12} className="text-slate-400 dark:text-slate-500" /> {company.email}</a>}
            {company.phone && <a href={`tel:${company.phone}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"><Phone size={12} className="text-slate-400 dark:text-slate-500" /> {company.phone}</a>}
            {company.website && <a href={`https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"><Globe size={12} className="text-slate-400 dark:text-slate-500" /> {company.website} <ExternalLink size={10} className="text-slate-400 dark:text-slate-500" /></a>}
          </div>

          {/* Investment Profile */}
          {(company.capitalType || company.propertyTypes?.length || company.minDealSize || company.targetMarkets?.length || company.targetReturns || company.investmentCriteria) && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)] space-y-2">
              <p className="text-[10px] font-semibold font-mono uppercase text-purple-600 dark:text-purple-400 tracking-wider">Investment Profile</p>
              {company.capitalType && (
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Capital type</p>
                  <span className="v-badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{formatCapitalType(company.capitalType)}</span>
                </div>
              )}
              {company.propertyTypes?.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Target property types</p>
                  <div className="flex flex-wrap gap-1">{company.propertyTypes.map(t => <span key={t} className="v-badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{formatAssetType(t)}</span>)}</div>
                </div>
              )}
              {(company.minDealSize || company.maxDealSize) && (
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Deal size range</p>
                  <p className="text-[12px] font-medium font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(company.minDealSize)} – {formatCurrency(company.maxDealSize)}</p>
                </div>
              )}
              {company.targetMarkets?.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Target markets</p>
                  <div className="flex flex-wrap gap-1">{company.targetMarkets.map(m => <span key={m} className="v-badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{m}</span>)}</div>
                </div>
              )}
              {company.targetReturns && (
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Target returns</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">{company.targetReturns}</p>
                </div>
              )}
              {company.investmentCriteria && (
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Investment criteria</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{company.investmentCriteria}</p>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {company.tags?.length > 0 && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <div className="flex flex-wrap gap-1">
                {company.tags.map(t => <span key={t} className="v-badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>)}
              </div>
            </div>
          )}

          {/* Notes */}
          {company.notes && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold font-mono uppercase text-slate-500 dark:text-slate-400 mb-1">Notes</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{company.notes}</p>
            </div>
          )}

          {/* Contacts at this company */}
          {relatedContacts.length > 0 && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold font-mono uppercase text-slate-500 dark:text-slate-400 mb-1.5">Contacts ({relatedContacts.length})</p>
              <div className="space-y-1.5">
                {relatedContacts.map(c => (
                  <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-2 group">
                    <div className="w-6 h-6 bg-brand-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-white font-mono">{`${(c.firstName || '')[0] || ''}${(c.lastName || '')[0] || ''}`}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">{fullName(c)}</p>
                      {c.title && <p className="text-[10px] text-slate-400 dark:text-slate-500">{c.title}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Deal activity */}
          {linkedDeals.length > 0 && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold font-mono uppercase text-slate-500 dark:text-slate-400 mb-1">Deal Activity ({linkedDeals.length})</p>
              <div className="space-y-1.5">
                {linkedDeals.map(d => (
                  <div key={d.id} className="flex items-center justify-between">
                    <Link to={`/deals/${d.deal.id}`} className="text-[11px] text-brand-600 hover:underline dark:text-brand-400 truncate">{d.deal.name || d.deal.address}</Link>
                    <span className="v-badge text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 flex-shrink-0 ml-2">{d.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link to full profile */}
          <div className="px-3 py-2 text-[10px] text-slate-400 dark:text-slate-500">
            <Link to={`/companies/${company.id}`} className="text-brand-600 hover:underline dark:text-brand-400 font-mono">View full company profile →</Link>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-auto bg-surface-50 dark:bg-surface-100 p-4 space-y-4">
          <ReminderList companyId={id} />
          <ActivityFeed companyId={id} />
        </div>
      </div>

      {editing && (
        <Modal title="Edit LP Investor" onClose={() => setEditing(false)} size="lg" disableBackdropClose>
          <CompanyForm initial={company} onSubmit={async (form) => { await updateCompany(id, form); setEditing(false) }} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  )
}

// ─── Investor Matching Panel ─────────────────────────────────────────────────
function InvestorMatchPanel({ properties, investorCompanies }) {
  const [selectedDeal, setSelectedDeal] = useState('')
  const deal = properties.find(p => p.id === selectedDeal)

  const matches = useMemo(() => {
    if (!deal) return []
    return investorCompanies.filter(c => {
      const typeMatch = !c.propertyTypes?.length || (deal.propertyType && c.propertyTypes.includes(deal.propertyType))
      const sizeMatch = (!c.minDealSize || Number(deal.dealValue) >= Number(c.minDealSize)) &&
                         (!c.maxDealSize || Number(deal.dealValue) <= Number(c.maxDealSize))
      const marketMatch = !c.targetMarkets?.length || (deal.market && c.targetMarkets.some(m => m.toLowerCase() === deal.market.toLowerCase()))
      return typeMatch && sizeMatch && marketMatch
    }).map(c => ({
      ...c,
      score: (c.propertyTypes?.includes(deal.propertyType) ? 1 : 0) +
             (Number(deal.dealValue) >= Number(c.minDealSize) && Number(deal.dealValue) <= Number(c.maxDealSize) ? 1 : 0) +
             (c.targetMarkets?.some(m => m.toLowerCase() === deal.market?.toLowerCase()) ? 1 : 0)
    })).sort((a, b) => b.score - a.score)
  }, [deal, investorCompanies])

  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Target size={13} className="text-brand-500" />
        <h3 className="text-[10px] font-semibold font-mono uppercase text-slate-800 dark:text-slate-200">Investor Matching</h3>
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">Select a deal to find matching investors by criteria.</p>
      <select value={selectedDeal} onChange={e => setSelectedDeal(e.target.value)} className="v-input mb-2 text-[11px]">
        <option value="">Select a deal to match...</option>
        {properties.filter(p => p.status !== 'dead' && p.status !== 'closed').map(p => (
          <option key={p.id} value={p.id}>{p.name || p.address} ({formatCurrency(p.dealValue)})</option>
        ))}
      </select>
      {deal && matches.length === 0 && <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-3 font-mono">No matching investors found</p>}
      {matches.length > 0 && (
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {matches.map(c => (
            <Link key={c.id} to={`/investors/${c.id}`} className="flex items-center justify-between p-1.5 hover:bg-surface-50 dark:hover:bg-surface-100 transition-colors">
              <div>
                <p className="text-[11px] font-medium text-slate-900 dark:text-slate-100">{c.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {[c.capitalType && formatCapitalType(c.capitalType), c.targetReturns].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className={clsx('w-2 h-2', i <= c.score ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-600')} />
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── List view ──────────────────────────────────────────────────────────────────
export default function Investors() {
  const { id } = useParams()
  if (id) return <InvestorDetail />

  const { investorCompanies, addCompany, properties } = useCRM()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'minDealSize' ? 'desc' : 'asc') }
  }

  const filtered = investorCompanies.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.capitalType?.toLowerCase().includes(q) || c.targetMarkets?.some(m => m.toLowerCase().includes(q))
    const matchType = !filterType || c.capitalType === filterType
    return matchSearch && matchType
  }).sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break
      case 'capitalType': cmp = (a.capitalType || '').localeCompare(b.capitalType || ''); break
      case 'minDealSize': cmp = (Number(a.minDealSize) || 0) - (Number(b.minDealSize) || 0); break
      case 'markets': cmp = (a.targetMarkets?.[0] || '').localeCompare(b.targetMarkets?.[0] || ''); break
      default: cmp = 0
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* ─ Toolbar ─ */}
      <div className="os-toolbar flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search investors..." className="v-input pl-7 text-[11px]" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="v-input w-36 text-[11px]">
          <option value="">All types</option>
          {CAPITAL_TYPES.map(t => <option key={t} value={t}>{formatCapitalType(t)}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">{filtered.length} / {investorCompanies.length}</span>
        <button onClick={() => setShowAdd(true)} className="v-btn-primary text-[10px]"><Plus size={11} /> NEW</button>
      </div>

      {/* ─ Content ─ */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <EmptyState icon={Users2} title="No LP investors found" description="Add a company with the Investor type to get started." action={<button onClick={() => setShowAdd(true)} className="v-btn-primary text-[10px]"><Plus size={11} /> Add LP Investor</button>} />
            </div>
          ) : (
            <table className="v-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  {[
                    { field: 'name', label: 'Company' },
                    { field: 'capitalType', label: 'Capital Type' },
                    { field: null, label: 'Property Types' },
                    { field: 'minDealSize', label: 'Deal Size' },
                    { field: 'markets', label: 'Markets' },
                    { field: null, label: 'Contact' },
                  ].map(({ field, label }) => (
                    <th key={label}
                      onClick={field ? () => handleSort(field) : undefined}
                      className={clsx('text-left px-3 py-2 text-[10px] font-semibold font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider select-none', field && 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200')}>
                      {label} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-t border-[var(--border)] hover:bg-surface-50 dark:hover:bg-surface-100 transition-colors">
                    <td className="px-3 py-2">
                      <Link to={`/investors/${c.id}`} className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-white font-mono">{companyInitials(c)}</span>
                        </div>
                        <span className="text-[12px] font-medium text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400">{c.name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {c.capitalType ? (
                        <span className="v-badge text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{formatCapitalType(c.capitalType)}</span>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.propertyTypes?.slice(0, 3).map(t => <span key={t} className="v-badge text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{formatAssetType(t)}</span>)}
                        {(c.propertyTypes?.length || 0) > 3 && <span className="text-[10px] text-slate-400">+{c.propertyTypes.length - 3}</span>}
                        {!c.propertyTypes?.length && <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[12px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {(c.minDealSize || c.maxDealSize) ? (
                        <>{formatCurrency(c.minDealSize)} – {formatCurrency(c.maxDealSize)}</>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {c.targetMarkets?.slice(0, 2).map(m => <span key={m} className="v-badge text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{m}</span>)}
                        {(c.targetMarkets?.length || 0) > 2 && <span className="text-[10px] text-slate-400">+{c.targetMarkets.length - 2}</span>}
                        {!c.targetMarkets?.length && <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        {c.email && <a href={`mailto:${c.email}`} className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"><Mail size={12} /></a>}
                        {c.phone && <a href={`tel:${c.phone}`} className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"><Phone size={12} /></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Sidebar: match panel */}
        <div className="w-[260px] flex-shrink-0 border-l border-[var(--border)] overflow-auto bg-surface-0 p-2">
          <InvestorMatchPanel properties={properties} investorCompanies={investorCompanies} />
        </div>
      </div>

      {/* ─ Status bar ─ */}
      <div className="os-status-bar flex-shrink-0">
        <span>{filtered.length} investor{filtered.length !== 1 ? 's' : ''}</span>
        {filterType && <span>filtered by {formatCapitalType(filterType)}</span>}
        <span>Companies with type "Investor" — investment criteria used for deal matching</span>
      </div>

      {showAdd && (
        <Modal title="Add LP Investor" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <CompanyForm initial={INVESTOR_INITIAL} onSubmit={async (form) => { await addCompany({ ...form, type: 'investor' }); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}
