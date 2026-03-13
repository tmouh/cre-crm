import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowLeft, Edit2, Trash2, Users2, Building2, Target, Phone, Mail, Globe, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { CAPITAL_TYPES, formatAssetType, formatCapitalType, formatCurrency, fullName, companyInitials } from '../utils/helpers'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
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
  if (!company) return <div className="p-8 text-gray-400">Investor not found.</div>

  const relatedContacts = contacts.filter(c => c.companyId === id)
  const dealLinks = dealInvestors.filter(di => di.companyId === id)
  const linkedDeals = dealLinks.map(di => ({ ...di, deal: properties.find(p => p.id === di.propertyId) })).filter(d => d.deal)

  return (
    <div className="px-8 py-8">
      <Link to="/investors" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <ArrowLeft size={15} /> LP Investors
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Left panel — company info + investment profile */}
        <div className="col-span-1 space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <span className="text-xl font-bold text-purple-700 dark:text-purple-300">{companyInitials(company)}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="btn-ghost p-2"><Edit2 size={14} /></button>
                <button onClick={async () => { if (confirm(`Delete ${company.name}?`)) { await deleteCompany(id); navigate('/investors') } }} className="btn-ghost p-2 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{company.name}</h2>
            <span className="badge mt-1 inline-block bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Investor</span>

            <div className="mt-4 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
              {company.address && <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Building2 size={14} className="text-gray-400 dark:text-gray-500" /> {company.address}</p>}
              {company.email && <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"><Mail size={14} className="text-gray-400 dark:text-gray-500" /> {company.email}</a>}
              {company.phone && <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"><Phone size={14} className="text-gray-400 dark:text-gray-500" /> {company.phone}</a>}
              {company.website && <a href={`https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"><Globe size={14} className="text-gray-400 dark:text-gray-500" /> {company.website} <ExternalLink size={10} className="text-gray-400 dark:text-gray-500" /></a>}
            </div>

            {/* Investment Profile */}
            {(company.capitalType || company.propertyTypes?.length || company.minDealSize || company.targetMarkets?.length || company.targetReturns || company.investmentCriteria) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Investment Profile</p>
                {company.capitalType && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Capital type</p>
                    <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{formatCapitalType(company.capitalType)}</span>
                  </div>
                )}
                {company.propertyTypes?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Target property types</p>
                    <div className="flex flex-wrap gap-1">{company.propertyTypes.map(t => <span key={t} className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{formatAssetType(t)}</span>)}</div>
                  </div>
                )}
                {(company.minDealSize || company.maxDealSize) && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Deal size range</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(company.minDealSize)} – {formatCurrency(company.maxDealSize)}</p>
                  </div>
                )}
                {company.targetMarkets?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Target markets</p>
                    <div className="flex flex-wrap gap-1">{company.targetMarkets.map(m => <span key={m} className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{m}</span>)}</div>
                  </div>
                )}
                {company.targetReturns && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Target returns</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{company.targetReturns}</p>
                  </div>
                )}
                {company.investmentCriteria && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Investment criteria</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{company.investmentCriteria}</p>
                  </div>
                )}
              </div>
            )}

            {company.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {company.tags.map(t => <span key={t} className="badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>)}
              </div>
            )}

            {company.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
              <Link to={`/companies/${company.id}`} className="text-brand-600 hover:underline dark:text-brand-400">View full company profile →</Link>
            </div>
          </div>

          {/* Contacts at this company */}
          {relatedContacts.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Contacts ({relatedContacts.length})</p>
              <div className="space-y-2">
                {relatedContacts.map(c => (
                  <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">{`${(c.firstName || '')[0] || ''}${(c.lastName || '')[0] || ''}`}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">{fullName(c)}</p>
                      {c.title && <p className="text-xs text-gray-400 dark:text-gray-500">{c.title}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Deal activity */}
          {linkedDeals.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Deal Activity ({linkedDeals.length})</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">Deals this investor is linked to or participating in.</p>
              <div className="space-y-2">
                {linkedDeals.map(d => (
                  <div key={d.id} className="flex items-center justify-between">
                    <Link to={`/properties/${d.deal.id}`} className="text-sm text-brand-600 hover:underline dark:text-brand-400 truncate">{d.deal.name || d.deal.address}</Link>
                    <span className="badge text-[11px] bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 flex-shrink-0 ml-2">{d.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="col-span-2 space-y-4">
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
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Target size={15} className="text-brand-500" />
        <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Investor Matching</h3>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">Select a deal to find investor companies whose criteria (property type, deal size, target markets) align with it. Green dots show match strength.</p>
      <select value={selectedDeal} onChange={e => setSelectedDeal(e.target.value)} className="input mb-3">
        <option value="">Select a deal to match...</option>
        {properties.filter(p => p.status !== 'dead' && p.status !== 'closed').map(p => (
          <option key={p.id} value={p.id}>{p.name || p.address} ({formatCurrency(p.dealValue)})</option>
        ))}
      </select>
      {deal && matches.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No matching investors found</p>}
      {matches.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {matches.map(c => (
            <Link key={c.id} to={`/investors/${c.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  {[c.capitalType && formatCapitalType(c.capitalType), c.targetReturns].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className={clsx('w-2 h-2 rounded-full', i <= c.score ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600')} />
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
    <div className="px-8 py-8">
      <PageHeader
        title="LP Investors"
        subtitle={`${investorCompanies.length} investor compan${investorCompanies.length !== 1 ? 'ies' : 'y'}`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add LP Investor</button>}
      />

      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-3 mb-6">
        This page shows companies whose type is set to "Investor." To add one here, create a company with the Investor type — or use the button above. Investment criteria like capital type, target markets, and deal size are stored on the company and used to match investors to deals.
      </p>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search investors..." className="input pl-9" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input w-40">
          <option value="">All types</option>
          {CAPITAL_TYPES.map(t => <option key={t} value={t}>{formatCapitalType(t)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {filtered.length === 0 ? (
            <EmptyState icon={Users2} title="No LP investors found" description="Add a company with the Investor type to get started." action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add LP Investor</button>} />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200/80 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
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
                        className={clsx('text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none', field && 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200')}>
                        {label} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/investors/${c.id}`} className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">{companyInitials(c)}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400">{c.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {c.capitalType ? (
                          <span className="badge text-[11px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{formatCapitalType(c.capitalType)}</span>
                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.propertyTypes?.slice(0, 3).map(t => <span key={t} className="badge text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{formatAssetType(t)}</span>)}
                          {(c.propertyTypes?.length || 0) > 3 && <span className="text-[10px] text-gray-400">+{c.propertyTypes.length - 3}</span>}
                          {!c.propertyTypes?.length && <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {(c.minDealSize || c.maxDealSize) ? (
                          <>{formatCurrency(c.minDealSize)} – {formatCurrency(c.maxDealSize)}</>
                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.targetMarkets?.slice(0, 2).map(m => <span key={m} className="badge text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{m}</span>)}
                          {(c.targetMarkets?.length || 0) > 2 && <span className="text-[10px] text-gray-400">+{c.targetMarkets.length - 2}</span>}
                          {!c.targetMarkets?.length && <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {c.email && <a href={`mailto:${c.email}`} className="text-gray-400 hover:text-brand-600 dark:text-gray-500 dark:hover:text-brand-400"><Mail size={14} /></a>}
                          {c.phone && <a href={`tel:${c.phone}`} className="text-gray-400 hover:text-brand-600 dark:text-gray-500 dark:hover:text-brand-400"><Phone size={14} /></a>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <InvestorMatchPanel properties={properties} investorCompanies={investorCompanies} />
        </div>
      </div>

      {showAdd && (
        <Modal title="Add LP Investor" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <CompanyForm initial={INVESTOR_INITIAL} onSubmit={async (form) => { await addCompany({ ...form, type: 'investor' }); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}
