import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowLeft, Edit2, Trash2, Users2, Building2, Target, Phone, Mail } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'
import { ASSET_TYPES, CAPITAL_TYPES, CONTACT_FUNCTIONS, formatAssetType, formatCapitalType, formatCurrency, formatContactFunction, fullName, initials, formatDate } from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import NumericInput from '../components/NumericInput'
import SearchableSelect from '../components/SearchableSelect'
import CompanyCombobox from '../components/CompanyCombobox'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import ReminderList from '../components/ReminderList'
import ActivityFeed from '../components/ActivityFeed'

const BLANK = {
  firstName: '', lastName: '', title: '', contactFunction: 'lp-investor', companyId: '',
  email: '', phone: '', mobile: '', linkedIn: '', notes: '', tags: [], ownerIds: [],
  capitalType: '', propertyTypes: [], minDealSize: '', maxDealSize: '',
  targetMarkets: [], targetReturns: '', investmentCriteria: '',
}

function InvestorForm({ initial = BLANK, onSubmit, onCancel }) {
  const { addCompany, teamMembers } = useCRM()
  const { user } = useAuth()
  const defaultOwnerIds = !initial.id ? (user ? [user.id] : []) : (initial.ownerIds || [])
  const [form, setForm] = useState({ ...BLANK, ...initial, ownerIds: defaultOwnerIds })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  function toggleArrayItem(field, val) {
    setForm(p => ({
      ...p,
      [field]: (p[field] || []).includes(val) ? p[field].filter(v => v !== val) : [...(p[field] || []), val]
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.firstName.trim() && !form.lastName.trim()) { setError('Name is required.'); return }
    setSaving(true)
    try { await onSubmit({ ...form, contactFunction: 'lp-investor' }) } catch (err) { setError(err?.message || 'Failed to save.'); setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Info</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First name <span className="text-red-500">*</span></label>
          <input value={form.firstName} onChange={f('firstName')} className="input" required />
        </div>
        <div>
          <label className="label">Last name <span className="text-red-500">*</span></label>
          <input value={form.lastName} onChange={f('lastName')} className="input" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Title / Role</label>
          <input value={form.title} onChange={f('title')} className="input" placeholder="e.g. Managing Director" />
        </div>
        <div>
          <label className="label">Company</label>
          <CompanyCombobox
            value={form.companyId}
            onChange={(id) => setForm(p => ({ ...p, companyId: id }))}
            onCreateAndSelect={async (name) => {
              const c = await addCompany({ name, type: 'investor' })
              setForm(p => ({ ...p, companyId: c.id }))
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Email</label>
          <input type="email" value={form.email} onChange={f('email')} className="input" placeholder="name@company.com" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input value={form.phone} onChange={f('phone')} className="input" placeholder="212-555-0100" />
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2 space-y-4">
        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Investment Profile</p>
        <div>
          <label className="label">Capital type</label>
          <select value={form.capitalType || ''} onChange={f('capitalType')} className="input">
            <option value="">— Select —</option>
            {CAPITAL_TYPES.map(t => <option key={t} value={t}>{formatCapitalType(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Target property types</label>
          <div className="flex flex-wrap gap-1.5">
            {ASSET_TYPES.map(t => (
              <button key={t} type="button" onClick={() => toggleArrayItem('propertyTypes', t)}
                className={clsx('badge cursor-pointer transition-colors', (form.propertyTypes || []).includes(t) ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400')}>
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
          <input value={form.targetReturns || ''} onChange={f('targetReturns')} className="input" placeholder="e.g. 15-20% IRR, 8% cash-on-cash" />
        </div>
        <div>
          <label className="label">Investment criteria</label>
          <textarea value={form.investmentCriteria || ''} onChange={f('investmentCriteria')} rows={3} className="input resize-y" placeholder="Key investment parameters..." />
        </div>
      </div>

      <div>
        <label className="label">Tags</label>
        <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={2} className="input resize-y" />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving…' : 'Save LP Investor'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

// ─── Detail view ────────────────────────────────────────────────────────────────
function InvestorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contacts, updateContact, deleteContact, companies, properties, dealInvestors, getCompany } = useCRM()
  const [editing, setEditing] = useState(false)

  const contact = contacts.find(c => c.id === id)
  if (!contact) return <div className="p-8 text-gray-400">Investor not found.</div>

  const company = getCompany(contact.companyId)
  const dealLinks = dealInvestors.filter(di => di.contactId === id || (di.companyId && di.companyId === contact.companyId))
  const linkedDeals = dealLinks.map(di => ({ ...di, deal: properties.find(p => p.id === di.propertyId) })).filter(d => d.deal)

  return (
    <div className="px-8 py-8">
      <Link to="/investors" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <ArrowLeft size={15} /> LP Investors
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Left panel — contact info + investment profile */}
        <div className="col-span-1 space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <span className="text-xl font-bold text-purple-700 dark:text-purple-300">{initials(contact)}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="btn-ghost p-2"><Edit2 size={14} /></button>
                <button onClick={async () => { if (confirm('Delete this investor contact?')) { await deleteContact(id); navigate('/investors') } }} className="btn-ghost p-2 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{fullName(contact)}</h2>
            {contact.title && <p className="text-sm text-gray-500 dark:text-gray-400">{contact.title}</p>}
            <span className="badge mt-1 inline-block bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">LP Investor</span>

            {company && (
              <Link to={`/companies/${company.id}`} className="flex items-center gap-1.5 mt-2 text-sm text-brand-600 hover:underline dark:text-brand-400">
                <Building2 size={13} /> {company.name}
              </Link>
            )}

            <div className="mt-4 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
              {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"><Mail size={14} className="text-gray-400 dark:text-gray-500" /> {contact.email}</a>}
              {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"><Phone size={14} className="text-gray-400 dark:text-gray-500" /> {contact.phone}</a>}
            </div>

            {/* Investment Profile */}
            {(contact.capitalType || contact.propertyTypes?.length || contact.minDealSize || contact.targetMarkets?.length || contact.targetReturns || contact.investmentCriteria) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Investment Profile</p>
                {contact.capitalType && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Capital type</p>
                    <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{formatCapitalType(contact.capitalType)}</span>
                  </div>
                )}
                {contact.propertyTypes?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Target property types</p>
                    <div className="flex flex-wrap gap-1">{contact.propertyTypes.map(t => <span key={t} className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{formatAssetType(t)}</span>)}</div>
                  </div>
                )}
                {(contact.minDealSize || contact.maxDealSize) && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Deal size range</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(contact.minDealSize)} – {formatCurrency(contact.maxDealSize)}</p>
                  </div>
                )}
                {contact.targetMarkets?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Target markets</p>
                    <div className="flex flex-wrap gap-1">{contact.targetMarkets.map(m => <span key={m} className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{m}</span>)}</div>
                  </div>
                )}
                {contact.targetReturns && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Target returns</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{contact.targetReturns}</p>
                  </div>
                )}
                {contact.investmentCriteria && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Investment criteria</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{contact.investmentCriteria}</p>
                  </div>
                )}
              </div>
            )}

            {contact.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {contact.tags.map(t => <span key={t} className="badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>)}
              </div>
            )}

            {contact.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
              <Link to={`/contacts/${contact.id}`} className="text-brand-600 hover:underline dark:text-brand-400">View full contact →</Link>
            </div>
          </div>

          {/* Deal activity */}
          {linkedDeals.length > 0 && (
            <div className="card p-5">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Deal activity ({linkedDeals.length})</p>
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
          <ReminderList contactId={id} />
          <ActivityFeed contactId={id} />
        </div>
      </div>

      {editing && (
        <Modal title="Edit LP Investor" onClose={() => setEditing(false)} size="lg" disableBackdropClose>
          <InvestorForm initial={contact} onSubmit={async (form) => { await updateContact(id, form); setEditing(false) }} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  )
}

// ─── Investor Matching Panel ─────────────────────────────────────────────────
function InvestorMatchPanel({ properties, investorContacts, getCompany }) {
  const [selectedDeal, setSelectedDeal] = useState('')
  const deal = properties.find(p => p.id === selectedDeal)

  const matches = useMemo(() => {
    if (!deal) return []
    return investorContacts.filter(c => {
      const typeMatch = !c.propertyTypes?.length || (deal.propertyType && c.propertyTypes.includes(deal.propertyType))
      const sizeMatch = (!c.minDealSize || Number(deal.dealValue) >= Number(c.minDealSize)) &&
                         (!c.maxDealSize || Number(deal.dealValue) <= Number(c.maxDealSize))
      const marketMatch = !c.targetMarkets?.length || (deal.market && c.targetMarkets.some(m => m.toLowerCase() === deal.market.toLowerCase()))
      return typeMatch && sizeMatch && marketMatch
    }).map(c => ({
      ...c,
      company: getCompany(c.companyId),
      score: (c.propertyTypes?.includes(deal.propertyType) ? 1 : 0) +
             (Number(deal.dealValue) >= Number(c.minDealSize) && Number(deal.dealValue) <= Number(c.maxDealSize) ? 1 : 0) +
             (c.targetMarkets?.some(m => m.toLowerCase() === deal.market?.toLowerCase()) ? 1 : 0)
    })).sort((a, b) => b.score - a.score)
  }, [deal, investorContacts, getCompany])

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
          {matches.map(c => (
            <Link key={c.id} to={`/investors/${c.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{fullName(c)}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  {[c.company?.name, c.capitalType && formatCapitalType(c.capitalType), c.targetReturns].filter(Boolean).join(' · ')}
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

  const { investorContacts, addContact, getCompany, properties } = useCRM()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'minDealSize' ? 'desc' : 'asc') }
  }

  const filtered = investorContacts.filter(c => {
    const company = getCompany(c.companyId)
    const q = search.toLowerCase()
    const matchSearch = !q || fullName(c).toLowerCase().includes(q) || company?.name?.toLowerCase().includes(q) || c.capitalType?.toLowerCase().includes(q) || c.targetMarkets?.some(m => m.toLowerCase().includes(q))
    const matchType = !filterType || c.capitalType === filterType
    return matchSearch && matchType
  }).sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'name': cmp = fullName(a).localeCompare(fullName(b)); break
      case 'company': {
        const ca = getCompany(a.companyId)?.name || ''
        const cb = getCompany(b.companyId)?.name || ''
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
        title="LP Investors"
        subtitle={`${investorContacts.length} LP investor contact${investorContacts.length !== 1 ? 's' : ''}`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add LP Investor</button>}
      />

      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-3 mb-6 max-w-2xl">
        This page shows contacts whose function is set to "LP Investor." To add someone here, create a contact and set their function to LP Investor — or use the button above. Investment criteria like capital type, target markets, and deal size are stored on the contact and used to match investors to deals.
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
            <EmptyState icon={Users2} title="No LP investors found" description="Add a contact with the LP Investor function to get started." action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add LP Investor</button>} />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200/80 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    {[
                      { field: 'name', label: 'Name' },
                      { field: 'company', label: 'Company' },
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
                  {filtered.map(c => {
                    const company = getCompany(c.companyId)
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link to={`/investors/${c.id}`} className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">{initials(c)}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400">{fullName(c)}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {company ? (
                            <Link to={`/companies/${company.id}`} className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">{company.name}</Link>
                          ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
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
                            {(c.phone || c.mobile) && <a href={`tel:${c.phone || c.mobile}`} className="text-gray-400 hover:text-brand-600 dark:text-gray-500 dark:hover:text-brand-400"><Phone size={14} /></a>}
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
          <InvestorMatchPanel properties={properties} investorContacts={investorContacts} getCompany={getCompany} />
        </div>
      </div>

      {showAdd && (
        <Modal title="Add LP Investor" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <InvestorForm onSubmit={async (form) => { await addContact(form); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}
