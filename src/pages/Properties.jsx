import { useState, useRef, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, Users, Trash2, Edit2, ArrowLeft, Upload, MapPin, Briefcase, Calendar } from 'lucide-react'
import SearchableSelect from '../components/SearchableSelect'
import AddressAutocomplete from '../components/AddressAutocomplete'
import NumericInput from '../components/NumericInput'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { DEAL_TYPES, DEAL_STATUSES, DEAL_STATUS_COLORS, DEAL_TYPE_COLORS, ASSET_TYPES, INVESTOR_STATUSES, INVESTOR_STATUS_COLORS, formatDealType, formatDealStatus, formatAssetType, formatInvestorStatus, formatCurrency, formatPercent, formatPSF, fullName, formatDate, isOverdue, isDueToday } from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import ActivityFeed from '../components/ActivityFeed'
import ReminderList from '../components/ReminderList'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import ImportModal from '../components/ImportModal'
import DuplicateCheckModal from '../components/DuplicateCheckModal'

const BLANK = { name: '', address: '', dealType: '', status: '', size: '', sizeUnit: 'SF', dealValue: '', ownerCompanyId: '', tenantCompanyId: '', lenderCompanyId: '', contactIds: [], notes: '', tags: [], capRate: '', noi: '', pricePerSf: '', ltv: '', dscr: '', askingPrice: '', propertyType: '', market: '', submarket: '', yearBuilt: '', seniorDebtAmount: '', seniorDebtRate: '', mezzAmount: '', mezzRate: '', prefEquityAmount: '', prefEquityRate: '', jvEquityAmount: '' }

function ContactSearch({ contacts, selected, onToggle }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedContacts = selected.map(id => contacts.find(c => c.id === id)).filter(Boolean)
  const matches = contacts.filter(c =>
    !selected.includes(c.id) &&
    (fullName(c).toLowerCase().includes(query.toLowerCase()) ||
     (c.title && c.title.toLowerCase().includes(query.toLowerCase())))
  )

  return (
    <div>
      <label className="label">Key contacts</label>
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedContacts.map(c => (
            <span key={c.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-xs font-medium">
              {fullName(c)}
              <button type="button" onClick={() => onToggle(c.id)} className="hover:bg-brand-200 dark:hover:bg-brand-800 rounded-full p-0.5 transition-colors">
                <span className="text-[10px] leading-none">✕</span>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative" ref={ref}>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search contacts..."
          className="input pl-9"
        />
        {open && query && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No contacts found</p>
            ) : (
              matches.slice(0, 8).map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onToggle(c.id); setQuery(''); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-brand-700 dark:text-brand-300">{(c.firstName || '')[0]}{(c.lastName || '')[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-gray-700 dark:text-gray-300">{fullName(c)}</span>
                    {c.title && <span className="text-gray-400 dark:text-gray-500 text-xs ml-1.5">· {c.title}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DealForm({ initial = BLANK, onSubmit, onCancel }) {
  const { companies, contacts, addCompany } = useCRM()
  const [form, setForm] = useState({ ...BLANK, ...initial })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const setField = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

  function toggleContact(id) {
    setForm(p => ({
      ...p,
      contactIds: p.contactIds.includes(id)
        ? p.contactIds.filter(c => c !== id)
        : [...p.contactIds, id]
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      await onSubmit({ ...form, name: form.name || form.address })
    } catch (err) {
      setSaveError(err?.message || 'Failed to save deal. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Address <span className="text-red-500">*</span></label>
        <AddressAutocomplete
          value={form.address}
          onChange={setField('address')}
          required
        />
      </div>
      <div>
        <label className="label">Deal name</label>
        <input value={form.name} onChange={f('name')} className="input" placeholder="e.g. 1440 Broadway Acquisition" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Deal type</label>
          <select value={form.dealType} onChange={f('dealType')} className="input">
            <option value="">— Select —</option>
            {[...DEAL_TYPES].sort((a, b) => formatDealType(a).localeCompare(formatDealType(b))).map(t => <option key={t} value={t}>{formatDealType(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status <span className="text-red-500">*</span></label>
          <select value={form.status} onChange={f('status')} required className="input">
            <option value="">— Select —</option>
            {DEAL_STATUSES.map(s => <option key={s} value={s}>{formatDealStatus(s)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Size</label>
          <NumericInput
            value={form.size}
            onChange={v => setForm(p => ({ ...p, size: v }))}
            placeholder="0"
          />
        </div>
        <div>
          <label className="label">Unit</label>
          <select value={form.sizeUnit} onChange={f('sizeUnit')} className="input">
            {['AC', 'keys', 'SF', 'units'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Deal value ($)</label>
          <NumericInput
            value={form.dealValue}
            onChange={v => setForm(p => ({ ...p, dealValue: v }))}
            decimals
            placeholder="0.00"
          />
        </div>
      </div>
      {/* Financial metrics */}
      <details className="group">
        <summary className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 py-1">Financial Details</summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Property type</label>
              <select value={form.propertyType} onChange={f('propertyType')} className="input">
                <option value="">— Select —</option>
                {ASSET_TYPES.map(t => <option key={t} value={t}>{formatAssetType(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Market</label>
              <input value={form.market || ''} onChange={f('market')} className="input" placeholder="e.g. NYC Metro" />
            </div>
            <div>
              <label className="label">Submarket</label>
              <input value={form.submarket || ''} onChange={f('submarket')} className="input" placeholder="e.g. Midtown" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="label">Cap rate (%)</label>
              <NumericInput value={form.capRate} onChange={v => setForm(p => ({ ...p, capRate: v }))} decimals placeholder="0.00" />
            </div>
            <div>
              <label className="label">NOI ($)</label>
              <NumericInput value={form.noi} onChange={v => setForm(p => ({ ...p, noi: v }))} decimals placeholder="0" />
            </div>
            <div>
              <label className="label">$/SF</label>
              <NumericInput value={form.pricePerSf} onChange={v => setForm(p => ({ ...p, pricePerSf: v }))} decimals placeholder="0" />
            </div>
            <div>
              <label className="label">Asking price ($)</label>
              <NumericInput value={form.askingPrice} onChange={v => setForm(p => ({ ...p, askingPrice: v }))} decimals placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">LTV (%)</label>
              <NumericInput value={form.ltv} onChange={v => setForm(p => ({ ...p, ltv: v }))} decimals placeholder="0.00" />
            </div>
            <div>
              <label className="label">DSCR</label>
              <NumericInput value={form.dscr} onChange={v => setForm(p => ({ ...p, dscr: v }))} decimals placeholder="0.00" />
            </div>
            <div>
              <label className="label">Year built</label>
              <input type="number" value={form.yearBuilt || ''} onChange={f('yearBuilt')} className="input" placeholder="2005" />
            </div>
          </div>
        </div>
      </details>

      {/* Capital stack */}
      <details className="group">
        <summary className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 py-1">Capital Stack</summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Senior debt ($)</label>
              <NumericInput value={form.seniorDebtAmount} onChange={v => setForm(p => ({ ...p, seniorDebtAmount: v }))} decimals placeholder="0" />
            </div>
            <div>
              <label className="label">Rate (%)</label>
              <NumericInput value={form.seniorDebtRate} onChange={v => setForm(p => ({ ...p, seniorDebtRate: v }))} decimals placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mezzanine ($)</label>
              <NumericInput value={form.mezzAmount} onChange={v => setForm(p => ({ ...p, mezzAmount: v }))} decimals placeholder="0" />
            </div>
            <div>
              <label className="label">Rate (%)</label>
              <NumericInput value={form.mezzRate} onChange={v => setForm(p => ({ ...p, mezzRate: v }))} decimals placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Pref equity ($)</label>
              <NumericInput value={form.prefEquityAmount} onChange={v => setForm(p => ({ ...p, prefEquityAmount: v }))} decimals placeholder="0" />
            </div>
            <div>
              <label className="label">Rate (%)</label>
              <NumericInput value={form.prefEquityRate} onChange={v => setForm(p => ({ ...p, prefEquityRate: v }))} decimals placeholder="0" />
            </div>
          </div>
          <div>
            <label className="label">JV equity ($)</label>
            <NumericInput value={form.jvEquityAmount} onChange={v => setForm(p => ({ ...p, jvEquityAmount: v }))} decimals placeholder="0" />
          </div>
        </div>
      </details>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Owner / Sponsor</label>
          <SearchableSelect
            value={form.ownerCompanyId}
            onChange={setField('ownerCompanyId')}
            options={[...companies].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name }))}
            placeholder="Search or create company..."
            createLabel="Create"
            onCreate={async (name) => {
              const created = await addCompany({ name })
              setField('ownerCompanyId')(created.id)
            }}
          />
        </div>
        <div>
          <label className="label">Seller</label>
          <SearchableSelect
            value={form.tenantCompanyId}
            onChange={setField('tenantCompanyId')}
            options={[...companies].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name }))}
            placeholder="Search or create company..."
            createLabel="Create"
            onCreate={async (name) => {
              const created = await addCompany({ name })
              setField('tenantCompanyId')(created.id)
            }}
          />
        </div>
      </div>
      <div>
        <label className="label">Lender</label>
        <SearchableSelect
          value={form.lenderCompanyId}
          onChange={setField('lenderCompanyId')}
          options={[...companies].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name }))}
          placeholder="Search or create company..."
          createLabel="Create"
          onCreate={async (name) => {
            const created = await addCompany({ name })
            setField('lenderCompanyId')(created.id)
          }}
        />
      </div>
      <ContactSearch
        contacts={contacts}
        selected={form.contactIds}
        onToggle={toggleContact}
      />
      <div>
        <label className="label">Tags</label>
        <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="input resize-y" placeholder="Key details, deal notes..." />
      </div>
      {saveError && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{saveError}</p>
      )}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60 disabled:cursor-not-allowed">
          {saving ? 'Saving…' : 'Save Deal'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-secondary disabled:opacity-60">Cancel</button>
      </div>
    </form>
  )
}

// ---- Deal Investors Panel ----
function DealInvestorsPanel({ dealId, dealInvestors, investorCompanies, contacts, companies, addDealInvestor, updateDealInvestor, deleteDealInvestor }) {
  const [adding, setAdding] = useState(false)
  const [newCompanyId, setNewCompanyId] = useState('')
  const [newContactId, setNewContactId] = useState('')
  const [newStatus, setNewStatus] = useState('contacted')
  const [newBid, setNewBid] = useState('')

  const linked = dealInvestors.filter(di => di.propertyId === dealId)
  const companyContacts = newCompanyId ? contacts.filter(c => c.companyId === newCompanyId) : []

  async function handleAdd(e) {
    e.preventDefault()
    if (!newCompanyId) return
    await addDealInvestor({ propertyId: dealId, companyId: newCompanyId, contactId: newContactId || null, status: newStatus, bidAmount: newBid || null })
    setNewCompanyId(''); setNewContactId(''); setNewStatus('contacted'); setNewBid(''); setAdding(false)
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Investor Tracking ({linked.length})</h3>
        <button onClick={() => setAdding(!adding)} className="btn-ghost text-xs px-2 py-1"><Plus size={13} /> Add</button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="space-y-2 mb-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Investor Company <span className="text-red-500">*</span></label>
              <SearchableSelect
                value={newCompanyId}
                onChange={(v) => { setNewCompanyId(v); setNewContactId('') }}
                options={investorCompanies.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => ({ id: c.id, label: c.name }))}
                placeholder="Select investor company..."
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input w-28">
                {INVESTOR_STATUSES.map(s => <option key={s} value={s}>{formatInvestorStatus(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Bid</label>
              <NumericInput value={newBid} onChange={setNewBid} decimals placeholder="$" className="w-28" />
            </div>
            <button type="submit" className="btn-primary py-2">Add</button>
          </div>
          {newCompanyId && companyContacts.length > 0 && (
            <div>
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Point of Contact (optional)</label>
              <select value={newContactId} onChange={e => setNewContactId(e.target.value)} className="input w-full">
                <option value="">— None —</option>
                {companyContacts.map(c => <option key={c.id} value={c.id}>{fullName(c)}{c.title ? ` — ${c.title}` : ''}</option>)}
              </select>
            </div>
          )}
        </form>
      )}

      {linked.length === 0 && !adding && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No investors tracked yet</p>
      )}

      {linked.length > 0 && (
        <div className="space-y-2">
          {linked.map(di => {
            const contact = contacts.find(c => c.id === di.contactId)
            const company = companies.find(c => c.id === di.companyId)
            return (
              <div key={di.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{company?.name || (contact ? fullName(contact) : 'Unknown')}</p>
                  {contact && <p className="text-[11px] text-gray-400 dark:text-gray-500">{fullName(contact)}{contact.title ? ` — ${contact.title}` : ''}</p>}
                  {di.bidAmount && <p className="text-[11px] text-gray-500 dark:text-gray-400">Bid: {formatCurrency(di.bidAmount)}</p>}
                </div>
                <select
                  value={di.status}
                  onChange={e => updateDealInvestor(di.id, { status: e.target.value })}
                  className={clsx('badge text-[11px] border-0 cursor-pointer pr-5 appearance-auto', INVESTOR_STATUS_COLORS[di.status] || 'bg-gray-100 text-gray-600')}
                >
                  {INVESTOR_STATUSES.map(s => <option key={s} value={s}>{formatInvestorStatus(s)}</option>)}
                </select>
                <button onClick={() => { if (confirm('Remove?')) deleteDealInvestor(di.id) }} className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Detail ----
function DealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getProperty, getCompany, getContact, updateProperty, deleteProperty, dealInvestors, addDealInvestor, updateDealInvestor, deleteDealInvestor, companies, investorCompanies, contacts } = useCRM()
  const [editing, setEditing] = useState(false)

  const deal = getProperty(id)
  if (!deal) return <div className="p-8 text-gray-400 dark:text-gray-500">Deal not found.</div>

  const owner   = getCompany(deal.ownerCompanyId)
  const tenant  = getCompany(deal.tenantCompanyId)
  const lender  = getCompany(deal.lenderCompanyId)
  const keyContacts = (deal.contactIds || []).map(getContact).filter(Boolean)

  async function handleUpdate(form) { await updateProperty(id, form); setEditing(false) }
  async function handleDelete() {
    if (confirm(`Delete ${deal.name || deal.address}?`)) { await deleteProperty(id); navigate('/properties') }
  }

  return (
    <div className="px-8 py-8">
      <Link to="/properties" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <ArrowLeft size={15} /> Deals
      </Link>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {deal.status && (
                  <span className={clsx('badge text-sm px-3 py-1', DEAL_STATUS_COLORS[deal.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                    {formatDealStatus(deal.status)}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="btn-ghost p-2"><Edit2 size={14} /></button>
                <button onClick={handleDelete} className="btn-ghost p-2 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{deal.name || deal.address}</h2>
            {deal.dealType && (
              <span className={clsx('badge mt-1', DEAL_TYPE_COLORS[deal.dealType] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                {formatDealType(deal.dealType)}
              </span>
            )}
            {deal.name && deal.address && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-start gap-1.5">
                <MapPin size={13} className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" /> {deal.address}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
              {deal.dealValue && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Deal value</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">${Number(deal.dealValue).toLocaleString()}</span>
                </div>
              )}
              {deal.size && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Size</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{Number(deal.size).toLocaleString()} {deal.sizeUnit}</span>
                </div>
              )}
            </div>

            {/* Financial metrics */}
            {(deal.capRate || deal.noi || deal.pricePerSf || deal.ltv || deal.dscr || deal.askingPrice) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2">
                {deal.capRate && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Cap rate</span><span className="font-medium text-gray-900 dark:text-gray-100">{formatPercent(deal.capRate)}</span></div>}
                {deal.noi && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">NOI</span><span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(deal.noi)}</span></div>}
                {deal.pricePerSf && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">$/SF</span><span className="font-medium text-gray-900 dark:text-gray-100">{formatPSF(deal.pricePerSf)}</span></div>}
                {deal.askingPrice && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Asking</span><span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(deal.askingPrice)}</span></div>}
                {deal.ltv && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">LTV</span><span className="font-medium text-gray-900 dark:text-gray-100">{formatPercent(deal.ltv)}</span></div>}
                {deal.dscr && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">DSCR</span><span className="font-medium text-gray-900 dark:text-gray-100">{Number(deal.dscr).toFixed(2)}x</span></div>}
              </div>
            )}

            {/* Capital stack */}
            {(deal.seniorDebtAmount || deal.mezzAmount || deal.prefEquityAmount || deal.jvEquityAmount) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-semibold uppercase tracking-wider">Capital Stack</p>
                <div className="space-y-1.5">
                  {deal.seniorDebtAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Senior debt</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(deal.seniorDebtAmount)} {deal.seniorDebtRate ? `@ ${Number(deal.seniorDebtRate).toFixed(2)}%` : ''}</span>
                    </div>
                  )}
                  {deal.mezzAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Mezzanine</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(deal.mezzAmount)} {deal.mezzRate ? `@ ${Number(deal.mezzRate).toFixed(2)}%` : ''}</span>
                    </div>
                  )}
                  {deal.prefEquityAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Pref equity</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(deal.prefEquityAmount)} {deal.prefEquityRate ? `@ ${Number(deal.prefEquityRate).toFixed(2)}%` : ''}</span>
                    </div>
                  )}
                  {deal.jvEquityAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">JV equity</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(deal.jvEquityAmount)}</span>
                    </div>
                  )}
                </div>
                {/* Visual bar */}
                {(() => {
                  const parts = [
                    { label: 'Debt', amount: Number(deal.seniorDebtAmount) || 0, color: '#6366f1' },
                    { label: 'Mezz', amount: Number(deal.mezzAmount) || 0, color: '#ec4899' },
                    { label: 'Pref', amount: Number(deal.prefEquityAmount) || 0, color: '#f59e0b' },
                    { label: 'JV', amount: Number(deal.jvEquityAmount) || 0, color: '#10b981' },
                  ].filter(p => p.amount > 0)
                  const total = parts.reduce((s, p) => s + p.amount, 0)
                  if (total <= 0) return null
                  return (
                    <div className="mt-2 h-4 rounded-full overflow-hidden flex" title={`Total: ${formatCurrency(total)}`}>
                      {parts.map((p, i) => (
                        <div key={i} style={{ width: `${(p.amount / total) * 100}%`, backgroundColor: p.color }} className="h-full first:rounded-l-full last:rounded-r-full" title={`${p.label}: ${formatCurrency(p.amount)}`} />
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {(owner || tenant || lender) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                {owner && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Owner / Sponsor</p>
                    <Link to={`/companies/${owner.id}`} className="text-sm text-brand-600 hover:underline dark:text-brand-400 flex items-center gap-1.5">
                      <Building2 size={13} /> {owner.name}
                    </Link>
                  </div>
                )}
                {tenant && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Seller</p>
                    <Link to={`/companies/${tenant.id}`} className="text-sm text-brand-600 hover:underline dark:text-brand-400 flex items-center gap-1.5">
                      <Building2 size={13} /> {tenant.name}
                    </Link>
                  </div>
                )}
                {lender && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Lender</p>
                    <Link to={`/companies/${lender.id}`} className="text-sm text-brand-600 hover:underline dark:text-brand-400 flex items-center gap-1.5">
                      <Building2 size={13} /> {lender.name}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {keyContacts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Key contacts</p>
                <div className="space-y-2">
                  {keyContacts.map(c => (
                    <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400">
                      <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">{(c.firstName || '')[0]}{(c.lastName || '')[0]}</span>
                      </div>
                      <span className="truncate">{fullName(c)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {deal.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {deal.tags.map(t => <span key={t} className="badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>)}
              </div>
            )}

            {deal.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{deal.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <DealInvestorsPanel dealId={id} dealInvestors={dealInvestors} investorCompanies={investorCompanies} contacts={contacts} companies={companies} addDealInvestor={addDealInvestor} updateDealInvestor={updateDealInvestor} deleteDealInvestor={deleteDealInvestor} />
          <ReminderList propertyId={id} />
          <ActivityFeed propertyId={id} />
        </div>
      </div>

      {editing && (
        <Modal title="Edit Deal" onClose={() => setEditing(false)} size="lg" disableBackdropClose>
          <DealForm initial={deal} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  )
}

// ---- Next Step helper ----
function NextStepCell({ dealId }) {
  const { remindersFor } = useCRM()
  const pending = remindersFor('propertyId', dealId).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  if (pending.length === 0) return <span className="text-gray-300 dark:text-gray-600">—</span>
  const next = pending[0]
  const overdue = isOverdue(next.dueDate)
  const today = isDueToday(next.dueDate)
  return (
    <div className="min-w-0">
      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{next.title}</p>
      <p className={clsx('text-[11px] flex items-center gap-1', overdue ? 'text-red-500' : today ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500')}>
        <Calendar size={10} /> {formatDate(next.dueDate)}
      </p>
    </div>
  )
}

// ---- List ----
export default function Properties() {
  const { id } = useParams()
  if (id) return <DealDetail />

  const { properties, addProperty, updateProperty, getCompany, getContact } = useCRM()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [dupCheck, setDupCheck] = useState(null)
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'dealValue' ? 'desc' : 'asc') }
  }

  const filtered = properties.filter(p => {
    const q = search.toLowerCase()
    const matches = !q || p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q)
    const type   = !filterType   || p.dealType === filterType
    const status = !filterStatus || p.status   === filterStatus
    return matches && type && status
  }).sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'name': cmp = (a.name || a.address || '').localeCompare(b.name || b.address || ''); break
      case 'dealType': cmp = (a.dealType || '').localeCompare(b.dealType || ''); break
      case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break
      case 'dealValue': {
        const va = Number(a.dealValue) || 0, vb = Number(b.dealValue) || 0
        cmp = va - vb; break
      }
      case 'company': {
        const ca = getCompany(a.ownerCompanyId)?.name || ''
        const cb = getCompany(b.ownerCompanyId)?.name || ''
        cmp = ca.localeCompare(cb); break
      }
      default: cmp = 0
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Deals"
        subtitle={`${properties.length} deal${properties.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="btn-secondary"><Upload size={15} /> Import CSV</button>
            <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Deal</button>
          </div>
        }
      />

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals..." className="input pl-9" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input w-44">
          <option value="">All types</option>
          {[...DEAL_TYPES].sort((a, b) => formatDealType(a).localeCompare(formatDealType(b))).map(t => <option key={t} value={t}>{formatDealType(t)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-44">
          <option value="">All statuses</option>
          {DEAL_STATUSES.map(s => <option key={s} value={s}>{formatDealStatus(s)}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="No deals found" action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add Deal</button>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/80 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                {[
                  { field: 'name', label: 'Deal' },
                  { field: 'dealType', label: 'Type' },
                  { field: 'status', label: 'Status' },
                  { field: 'dealValue', label: 'Value' },
                  { field: 'company', label: 'Company' },
                  { field: null, label: 'Key Contact' },
                  { field: null, label: 'Next Step' },
                  { field: null, label: 'Tags', className: 'pr-6' },
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
              {filtered.map(p => {
                const owner = getCompany(p.ownerCompanyId)
                const firstContact = (p.contactIds || []).length > 0 ? getContact(p.contactIds[0]) : null
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/properties/${p.id}`} className="block min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 truncate">{p.name || p.address}</p>
                        {p.name && p.address && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{p.address}</p>}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {p.dealType ? (
                        <span className={clsx('badge text-[11px]', DEAL_TYPE_COLORS[p.dealType] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>{formatDealType(p.dealType)}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge text-[11px]', DEAL_STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>{formatDealStatus(p.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {p.dealValue ? formatCurrency(p.dealValue) : <span className="text-gray-300 dark:text-gray-600 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {owner ? (
                        <Link to={`/companies/${owner.id}`} className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 truncate block">{owner.name}</Link>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {firstContact ? (
                        <Link to={`/contacts/${firstContact.id}`} className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 truncate block">{fullName(firstContact)}</Link>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <NextStepCell dealId={p.id} />
                    </td>
                    <td className="px-4 pr-6 py-3">
                      {p.tags?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.tags.slice(0, 3).map(t => <span key={t} className="badge text-[11px] bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>)}
                          {p.tags.length > 3 && <span className="text-[11px] text-gray-400 dark:text-gray-500">+{p.tags.length - 3}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Deal" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <DealForm onSubmit={async (form) => {
            const dup = properties.find(p =>
              (form.name && p.name && p.name.toLowerCase() === form.name.toLowerCase()) ||
              (form.address && p.address && p.address.toLowerCase() === form.address.toLowerCase())
            )
            if (dup) {
              setDupCheck({ newData: form, existing: dup })
            } else {
              await addProperty(form)
              setShowAdd(false)
            }
          }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {dupCheck && (
        <DuplicateCheckModal
          entityType="deal"
          matchFields={[
            { label: 'Name', existingVal: dupCheck.existing.name, newVal: dupCheck.newData.name },
            { label: 'Address', existingVal: dupCheck.existing.address, newVal: dupCheck.newData.address },
            { label: 'Deal Type', existingVal: formatDealType(dupCheck.existing.dealType), newVal: formatDealType(dupCheck.newData.dealType) },
            { label: 'Status', existingVal: formatDealStatus(dupCheck.existing.status), newVal: formatDealStatus(dupCheck.newData.status) },
            { label: 'Size', existingVal: dupCheck.existing.size ? `${dupCheck.existing.size} ${dupCheck.existing.sizeUnit}` : '', newVal: dupCheck.newData.size ? `${dupCheck.newData.size} ${dupCheck.newData.sizeUnit}` : '' },
            { label: 'Company', existingVal: getCompany(dupCheck.existing.ownerCompanyId)?.name, newVal: getCompany(dupCheck.newData.ownerCompanyId)?.name },
          ]}
          onAdd={async () => {
            await addProperty(dupCheck.newData)
            setDupCheck(null)
            setShowAdd(false)
          }}
          onMerge={async () => {
            const merged = {}
            for (const [k, v] of Object.entries(dupCheck.newData)) {
              if (k === 'tags' || k === 'contactIds') continue
              if (v && !dupCheck.existing[k]) merged[k] = v
            }
            if (dupCheck.newData.tags?.length) {
              merged.tags = [...new Set([...(dupCheck.existing.tags || []), ...dupCheck.newData.tags])]
            }
            if (dupCheck.newData.contactIds?.length) {
              merged.contactIds = [...new Set([...(dupCheck.existing.contactIds || []), ...dupCheck.newData.contactIds])]
            }
            await updateProperty(dupCheck.existing.id, merged)
            setDupCheck(null)
            setShowAdd(false)
          }}
          onCancel={() => setDupCheck(null)}
        />
      )}

      {showImport && (
        <ImportModal entity="properties" onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
