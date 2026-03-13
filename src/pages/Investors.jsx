import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowLeft, Edit2, Trash2, Users2, Building2, Target, Filter } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { ASSET_TYPES, CAPITAL_TYPES, formatAssetType, formatCapitalType, formatCurrency, fullName } from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import NumericInput from '../components/NumericInput'
import SearchableSelect from '../components/SearchableSelect'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

const BLANK = { companyId: '', contactId: '', propertyTypes: [], minDealSize: '', maxDealSize: '', targetMarkets: [], targetReturns: '', investmentCriteria: '', capitalType: '', notes: '', tags: [] }

function InvestorForm({ initial = BLANK, onSubmit, onCancel, companies, contacts }) {
  const [form, setForm] = useState({ ...BLANK, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  function toggleArrayItem(field, val) {
    setForm(p => ({
      ...p,
      [field]: p[field].includes(val) ? p[field].filter(v => v !== val) : [...p[field], val]
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.companyId) { setError('Company is required.'); return }
    setSaving(true)
    try { await onSubmit(form) } catch(err) { setError(err?.message || 'Failed to save investor.'); setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
      <div>
        <label className="label">Company <span className="text-red-500">*</span></label>
        <SearchableSelect
          value={form.companyId}
          onChange={v => setForm(p => ({ ...p, companyId: v }))}
          options={[...companies].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name }))}
          placeholder="Select company..."
        />
      </div>
      <div>
        <label className="label">Primary contact</label>
        <SearchableSelect
          value={form.contactId}
          onChange={v => setForm(p => ({ ...p, contactId: v }))}
          options={contacts.filter(c => !form.companyId || c.companyId === form.companyId).map(c => ({ id: c.id, label: fullName(c) }))}
          placeholder="Select contact..."
        />
      </div>
      <div>
        <label className="label">Capital type</label>
        <select value={form.capitalType} onChange={f('capitalType')} className="input">
          <option value="">— Select —</option>
          {CAPITAL_TYPES.map(t => <option key={t} value={t}>{formatCapitalType(t)}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Target property types</label>
        <div className="flex flex-wrap gap-1.5">
          {ASSET_TYPES.map(t => (
            <button key={t} type="button" onClick={() => toggleArrayItem('propertyTypes', t)}
              className={clsx('badge cursor-pointer transition-colors', form.propertyTypes.includes(t) ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400')}>
              {formatAssetType(t)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Min deal size ($)</label>
          <NumericInput value={form.minDealSize} onChange={v => setForm(p => ({ ...p, minDealSize: v }))} decimals placeholder="0" />
        </div>
        <div>
          <label className="label">Max deal size ($)</label>
          <NumericInput value={form.maxDealSize} onChange={v => setForm(p => ({ ...p, maxDealSize: v }))} decimals placeholder="0" />
        </div>
      </div>
      <div>
        <label className="label">Target markets</label>
        <TagInput tags={form.targetMarkets || []} onChange={(v) => setForm(p => ({ ...p, targetMarkets: v }))} placeholder="Add market..." />
      </div>
      <div>
        <label className="label">Target returns</label>
        <input value={form.targetReturns} onChange={f('targetReturns')} className="input" placeholder="e.g. 15-20% IRR, 8% cash-on-cash" />
      </div>
      <div>
        <label className="label">Investment criteria</label>
        <textarea value={form.investmentCriteria} onChange={f('investmentCriteria')} rows={3} className="input resize-y" placeholder="Key investment parameters..." />
      </div>
      <div>
        <label className="label">Tags</label>
        <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="input resize-y" />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving…' : 'Save Investor'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

function InvestorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { investors, updateInvestor, deleteInvestor, companies, contacts, properties, dealInvestors } = useCRM()
  const [editing, setEditing] = useState(false)

  const investor = investors.find(i => i.id === id)
  if (!investor) return <div className="p-8 text-gray-400">Investor not found.</div>

  const company = companies.find(c => c.id === investor.companyId)
  const contact = contacts.find(c => c.id === investor.contactId)
  const dealLinks = dealInvestors.filter(di => di.companyId === investor.companyId)
  const linkedDeals = dealLinks.map(di => ({ ...di, deal: properties.find(p => p.id === di.propertyId) })).filter(d => d.deal)

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link to="/investors" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <ArrowLeft size={15} /> Investors
      </Link>
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{company?.name || 'Unknown'}</h2>
            {investor.capitalType && <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mt-1">{formatCapitalType(investor.capitalType)}</span>}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} className="btn-ghost p-2"><Edit2 size={14} /></button>
            <button onClick={async () => { if (confirm('Delete?')) { await deleteInvestor(id); navigate('/investors') } }} className="btn-ghost p-2 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
        </div>

        {contact && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Primary contact</p>
            <Link to={`/contacts/${contact.id}`} className="text-sm text-brand-600 hover:underline dark:text-brand-400">{fullName(contact)}</Link>
          </div>
        )}

        {investor.propertyTypes?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Target property types</p>
            <div className="flex flex-wrap gap-1">{investor.propertyTypes.map(t => <span key={t} className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{formatAssetType(t)}</span>)}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {(investor.minDealSize || investor.maxDealSize) && (
            <div><span className="text-gray-500 dark:text-gray-400">Deal size range</span><p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(investor.minDealSize)} – {formatCurrency(investor.maxDealSize)}</p></div>
          )}
          {investor.targetReturns && <div><span className="text-gray-500 dark:text-gray-400">Target returns</span><p className="font-medium text-gray-900 dark:text-gray-100">{investor.targetReturns}</p></div>}
        </div>

        {investor.targetMarkets?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Target markets</p>
            <div className="flex flex-wrap gap-1">{investor.targetMarkets.map(m => <span key={m} className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{m}</span>)}</div>
          </div>
        )}

        {investor.investmentCriteria && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Investment criteria</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{investor.investmentCriteria}</p>
          </div>
        )}

        {linkedDeals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Deal activity ({linkedDeals.length})</p>
            <div className="space-y-2">
              {linkedDeals.map(d => (
                <div key={d.id} className="flex items-center justify-between">
                  <Link to={`/properties/${d.deal.id}`} className="text-sm text-brand-600 hover:underline dark:text-brand-400">{d.deal.name || d.deal.address}</Link>
                  <span className="badge text-[11px] bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {investor.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{investor.notes}</p>
          </div>
        )}
      </div>

      {editing && (
        <Modal title="Edit Investor" onClose={() => setEditing(false)} size="lg" disableBackdropClose>
          <InvestorForm initial={investor} companies={companies} contacts={contacts} onSubmit={async (form) => { await updateInvestor(id, form); setEditing(false) }} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  )
}

function InvestorMatchPanel({ properties, investors, companies }) {
  const [selectedDeal, setSelectedDeal] = useState('')
  const deal = properties.find(p => p.id === selectedDeal)

  const matches = useMemo(() => {
    if (!deal) return []
    return investors.filter(inv => {
      // Match property type
      const typeMatch = !inv.propertyTypes?.length || (deal.propertyType && inv.propertyTypes.includes(deal.propertyType))
      // Match deal size
      const sizeMatch = (!inv.minDealSize || Number(deal.dealValue) >= Number(inv.minDealSize)) &&
                         (!inv.maxDealSize || Number(deal.dealValue) <= Number(inv.maxDealSize))
      // Match market
      const marketMatch = !inv.targetMarkets?.length || (deal.market && inv.targetMarkets.some(m => m.toLowerCase() === deal.market.toLowerCase()))
      return typeMatch && sizeMatch && marketMatch
    }).map(inv => ({
      ...inv,
      company: companies.find(c => c.id === inv.companyId),
      score: (inv.propertyTypes?.includes(deal.propertyType) ? 1 : 0) + (Number(deal.dealValue) >= Number(inv.minDealSize) && Number(deal.dealValue) <= Number(inv.maxDealSize) ? 1 : 0) + (inv.targetMarkets?.some(m => m.toLowerCase() === deal.market?.toLowerCase()) ? 1 : 0)
    })).sort((a, b) => b.score - a.score)
  }, [deal, investors, companies])

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Target size={15} className="text-brand-500" />
        <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Investor Matching</h3>
      </div>
      <select value={selectedDeal} onChange={e => setSelectedDeal(e.target.value)} className="input mb-3">
        <option value="">Select a deal to match...</option>
        {properties.filter(p => p.status !== 'dead' && p.status !== 'closed').map(p => (
          <option key={p.id} value={p.id}>{p.name || p.address} ({formatCurrency(p.dealValue)})</option>
        ))}
      </select>
      {deal && matches.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No matching investors found</p>}
      {matches.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {matches.map(inv => (
            <Link key={inv.id} to={`/investors/${inv.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.company?.name || 'Unknown'}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  {[inv.capitalType && formatCapitalType(inv.capitalType), inv.targetReturns].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className={clsx('w-2 h-2 rounded-full', i <= inv.score ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600')} />
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Investors() {
  const { id } = useParams()
  if (id) return <InvestorDetail />

  const { investors, addInvestor, companies, contacts, properties } = useCRM()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const [sortField, setSortField] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'minDealSize' ? 'desc' : 'asc') }
  }

  const filtered = investors.filter(inv => {
    const company = companies.find(c => c.id === inv.companyId)
    const q = search.toLowerCase()
    const matchSearch = !q || company?.name?.toLowerCase().includes(q) || inv.capitalType?.toLowerCase().includes(q) || inv.targetMarkets?.some(m => m.toLowerCase().includes(q))
    const matchType = !filterType || inv.capitalType === filterType
    return matchSearch && matchType
  }).sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'company': {
        const ca = companies.find(c => c.id === a.companyId)?.name || ''
        const cb = companies.find(c => c.id === b.companyId)?.name || ''
        cmp = ca.localeCompare(cb); break
      }
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
        title="Investors"
        subtitle={`${investors.length} investor profile${investors.length !== 1 ? 's' : ''}`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Investor</button>}
      />

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
            <EmptyState icon={Users2} title="No investors found" action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add Investor</button>} />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200/80 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    {[
                      { field: 'company', label: 'Company' },
                      { field: 'capitalType', label: 'Capital Type' },
                      { field: null, label: 'Property Types' },
                      { field: 'minDealSize', label: 'Deal Size' },
                      { field: 'markets', label: 'Markets' },
                    ].map(({ field, label, className = '' }) => (
                      <th key={label}
                        onClick={field ? () => handleSort(field) : undefined}
                        className={clsx('text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none', field && 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200', className)}>
                        {label} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map(inv => {
                    const company = companies.find(c => c.id === inv.companyId)
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link to={`/investors/${inv.id}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400">
                            {company?.name || 'Unknown'}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {inv.capitalType ? (
                            <span className="badge text-[11px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{formatCapitalType(inv.capitalType)}</span>
                          ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {inv.propertyTypes?.slice(0, 3).map(t => <span key={t} className="badge text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{formatAssetType(t)}</span>)}
                            {(inv.propertyTypes?.length || 0) > 3 && <span className="text-[10px] text-gray-400">+{inv.propertyTypes.length - 3}</span>}
                            {!inv.propertyTypes?.length && <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {(inv.minDealSize || inv.maxDealSize) ? (
                            <>{formatCurrency(inv.minDealSize)} – {formatCurrency(inv.maxDealSize)}</>
                          ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {inv.targetMarkets?.slice(0, 2).map(m => <span key={m} className="badge text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{m}</span>)}
                            {(inv.targetMarkets?.length || 0) > 2 && <span className="text-[10px] text-gray-400">+{inv.targetMarkets.length - 2}</span>}
                            {!inv.targetMarkets?.length && <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <InvestorMatchPanel properties={properties} investors={investors} companies={companies} />
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Investor Profile" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <InvestorForm companies={companies} contacts={contacts} onSubmit={async (form) => { await addInvestor(form); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}
