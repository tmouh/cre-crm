/**
 * Deals page — wraps the existing Properties component
 * but accessed via /deals routes instead of /properties.
 * This is the same data model (properties table) with a "Deals" label.
 */

import { useState, Component } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  Plus, Search, ArrowLeft, Edit2, Trash2, MapPin, Building2,
  Users, Upload, Clock, TrendingUp, ChevronRight, Briefcase,
} from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'
import { useIntelligence } from '../hooks/useIntelligence'
import {
  formatCurrency, formatDate, fullName, formatDealType, formatDealStatus,
  DEAL_TYPES, DEAL_STATUSES, DEAL_STATUS_COLORS, DEAL_TYPE_COLORS,
  PROPERTY_TYPES, formatAssetType,
} from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import ActivityFeed from '../components/ActivityFeed'
import ReminderList from '../components/ReminderList'
import CompanyCombobox from '../components/CompanyCombobox'

const BLANK = {
  name: '', address: '', dealType: '', propertyType: '', size: '', sizeUnit: 'SF',
  status: 'prospect', dealValue: '', ownerCompanyId: '', tenantCompanyId: '',
  contactIds: [], tags: [], notes: '', ownerIds: [],
}

function DealForm({ initial = BLANK, onSubmit, onCancel }) {
  const { addCompany, contacts, teamMembers } = useCRM()
  const { user } = useAuth()
  const defaultOwnerIds = initial === BLANK ? (user ? [user.id] : []) : (initial.ownerIds || [])
  const [form, setForm] = useState({ ...BLANK, ...initial, ownerIds: defaultOwnerIds })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [contactQuery, setContactQuery] = useState('')
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  function toggleOwner(id) {
    setForm(p => ({ ...p, ownerIds: p.ownerIds.includes(id) ? p.ownerIds.filter(o => o !== id) : [...p.ownerIds, id] }))
  }

  function toggleContact(id) {
    setForm(p => ({ ...p, contactIds: (p.contactIds || []).includes(id) ? p.contactIds.filter(c => c !== id) : [...(p.contactIds || []), id] }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaveError(null)
    setSaving(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setSaveError(err?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedContacts = (form.contactIds || []).map(id => contacts.find(c => c.id === id)).filter(Boolean)
  const filteredContacts = contacts.filter(c =>
    !(form.contactIds || []).includes(c.id) &&
    fullName(c).toLowerCase().includes(contactQuery.toLowerCase())
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {saveError && <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 border border-red-200 dark:border-red-800">{saveError}</p>}
      <div>
        <label className="v-label">Deal name <span className="text-red-500">*</span></label>
        <input value={form.name} onChange={f('name')} className="v-input" required placeholder="e.g. 1440 Broadway Acquisition" />
      </div>
      <div>
        <label className="v-label">Address</label>
        <input value={form.address} onChange={f('address')} className="v-input" placeholder="Full street address" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="v-label">Deal type</label>
          <select value={form.dealType} onChange={f('dealType')} className="v-select">
            <option value="">— Select —</option>
            {DEAL_TYPES.map(t => <option key={t} value={t}>{formatDealType(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="v-label">Property type</label>
          <select value={form.propertyType} onChange={f('propertyType')} className="v-select">
            <option value="">— Select —</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{formatAssetType(t)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="v-label">Size</label>
          <input type="number" value={form.size} onChange={f('size')} className="v-input" placeholder="0" />
        </div>
        <div>
          <label className="v-label">Unit</label>
          <select value={form.sizeUnit} onChange={f('sizeUnit')} className="v-select">
            <option value="SF">SF</option><option value="AC">Acres</option><option value="Units">Units</option>
          </select>
        </div>
        <div>
          <label className="v-label">Deal value ($)</label>
          <input type="number" value={form.dealValue} onChange={f('dealValue')} className="v-input" placeholder="0" />
        </div>
      </div>
      <div>
        <label className="v-label">Status</label>
        <select value={form.status} onChange={f('status')} className="v-select">
          {DEAL_STATUSES.map(s => <option key={s} value={s}>{formatDealStatus(s)}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="v-label">Owner / Buyer</label>
          <CompanyCombobox value={form.ownerCompanyId} onChange={(id) => setForm(p => ({ ...p, ownerCompanyId: id }))}
            onCreateAndSelect={async (name) => { const c = await addCompany({ name, type: 'other' }); setForm(p => ({ ...p, ownerCompanyId: c.id })) }} />
        </div>
        <div>
          <label className="v-label">Tenant / Seller</label>
          <CompanyCombobox value={form.tenantCompanyId} onChange={(id) => setForm(p => ({ ...p, tenantCompanyId: id }))}
            onCreateAndSelect={async (name) => { const c = await addCompany({ name, type: 'other' }); setForm(p => ({ ...p, tenantCompanyId: c.id })) }} />
        </div>
      </div>
      <div>
        <label className="v-label">Related contacts</label>
        {selectedContacts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {selectedContacts.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-[11px] font-medium">
                {fullName(c)}
                <button type="button" onClick={() => toggleContact(c.id)} className="hover:bg-brand-200 dark:hover:bg-brand-800 p-0.5">
                  <span className="text-[10px] leading-none">✕</span>
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          value={contactQuery}
          onChange={e => setContactQuery(e.target.value)}
          className="v-input"
          placeholder="Search contacts to add..."
        />
        {contactQuery && filteredContacts.length > 0 && (
          <div className="border border-[var(--border)] border-t-0 max-h-36 overflow-y-auto bg-white dark:bg-surface-100">
            {filteredContacts.slice(0, 8).map(c => (
              <button key={c.id} type="button" onClick={() => { toggleContact(c.id); setContactQuery('') }}
                className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                {fullName(c)}{c.title && <span className="text-slate-400 ml-1.5">· {c.title}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {teamMembers.length > 0 && (
        <div>
          <label className="v-label">Owners</label>
          <div className="border border-[var(--border)] p-2 space-y-1 max-h-28 overflow-y-auto">
            {teamMembers.map(m => (
              <label key={m.id} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-100 px-2 py-1">
                <input type="checkbox" checked={form.ownerIds.includes(m.id)} onChange={() => toggleOwner(m.id)} />
                <span className="text-slate-700 dark:text-slate-300">{m.displayName || m.email}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="v-label">Tags</label>
        <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
      </div>
      <div>
        <label className="v-label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="v-input resize-y" />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="v-btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving…' : 'Save Deal'}</button>
        <button type="button" onClick={onCancel} disabled={saving} className="v-btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

function DealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getProperty, getCompany, getContact, updatePropertyWithStage, deleteProperty, contacts, teamMembers } = useCRM()
  const { dealMomentum } = useIntelligence()
  const [editing, setEditing] = useState(false)

  const deal = getProperty(id)
  if (!deal) return <div className="p-8 text-slate-400 dark:text-slate-500">Deal not found.</div>

  const ownerCompany = getCompany(deal.ownerCompanyId)
  const tenantCompany = getCompany(deal.tenantCompanyId)
  const relatedContacts = (deal.contactIds || []).map(cid => getContact(cid)).filter(Boolean)
  const momentum = dealMomentum.find(d => d.id === id)
  const owners = (deal.ownerIds || []).map(oid => teamMembers.find(m => m.id === oid)).filter(Boolean)

  async function handleUpdate(form) {
    await updatePropertyWithStage(id, form)
    setEditing(false)
  }

  async function handleDelete() {
    if (confirm(`Delete this deal?`)) {
      await deleteProperty(id)
      navigate('/deals')
    }
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Command header bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-surface-0 flex-shrink-0">
        <Link to="/deals" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft size={14} />
        </Link>
        <div className="w-8 h-8 bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Briefcase size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{deal.name || 'Untitled Deal'}</h2>
          <div className="flex items-center gap-2">
            {deal.status && (
              <span className={clsx('v-badge text-[10px]', DEAL_STATUS_COLORS[deal.status])}>{formatDealStatus(deal.status)}</span>
            )}
            {deal.dealType && (
              <>
                <span className="text-slate-300 dark:text-slate-600 text-[10px]">·</span>
                <span className={clsx('v-badge text-[10px]', DEAL_TYPE_COLORS[deal.dealType])}>{formatDealType(deal.dealType)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="v-btn-ghost p-1.5"><Edit2 size={13} /></button>
          <button onClick={handleDelete} className="v-btn-ghost p-1.5 hover:text-red-500"><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Two-zone workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: deal info */}
        <div className="w-[280px] flex-shrink-0 border-r border-[var(--border)] overflow-auto bg-surface-0">
          {/* Address & key metrics */}
          <div className="px-3 py-3 border-b border-[var(--border-subtle)] dark:border-[var(--border)] space-y-1.5">
            {deal.address && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                <MapPin size={11} className="text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" /> {deal.address}
              </p>
            )}

            {/* Momentum score */}
            {momentum && (
              <div className="p-2 bg-surface-50 dark:bg-surface-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">Momentum</span>
                  <span className={clsx('text-[11px] font-bold font-mono tabular-nums',
                    momentum.momentumScore >= 75 ? 'text-emerald-500' :
                    momentum.momentumScore >= 50 ? 'text-blue-500' :
                    momentum.momentumScore >= 25 ? 'text-amber-500' : 'text-red-500'
                  )}>
                    {momentum.momentumScore}/100
                  </span>
                </div>
                <div className="h-1.5 bg-surface-200 dark:bg-surface-200 overflow-hidden">
                  <div className={clsx('h-full transition-all duration-500',
                    momentum.momentumScore >= 75 ? 'bg-emerald-500' :
                    momentum.momentumScore >= 50 ? 'bg-blue-500' :
                    momentum.momentumScore >= 25 ? 'bg-amber-500' : 'bg-red-500'
                  )} style={{ width: `${momentum.momentumScore}%` }} />
                </div>
              </div>
            )}

            {(deal.dealValue || deal.size || deal.propertyType) && (
              <div className="space-y-1">
                {deal.dealValue && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Value</span>
                    <span className="font-medium font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(deal.dealValue)}</span>
                  </div>
                )}
                {deal.size && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Size</span>
                    <span className="font-medium font-mono tabular-nums text-slate-900 dark:text-slate-100">{Number(deal.size).toLocaleString()} {deal.sizeUnit || 'SF'}</span>
                  </div>
                )}
                {deal.propertyType && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Property</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{formatAssetType(deal.propertyType)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Companies */}
          {(ownerCompany || tenantCompany) && (
            <div className="px-3 py-3 border-b border-[var(--border-subtle)] dark:border-[var(--border)] space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono mb-1">Companies</p>
              {ownerCompany && (
                <Link to={`/companies/${ownerCompany.id}`} className="flex items-center gap-2 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400">
                  <Building2 size={11} className="text-slate-400" /> {ownerCompany.name} <span className="text-[10px] text-slate-400">(Owner)</span>
                </Link>
              )}
              {tenantCompany && (
                <Link to={`/companies/${tenantCompany.id}`} className="flex items-center gap-2 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400">
                  <Building2 size={11} className="text-slate-400" /> {tenantCompany.name} <span className="text-[10px] text-slate-400">(Tenant)</span>
                </Link>
              )}
            </div>
          )}

          {/* Related contacts */}
          {relatedContacts.length > 0 && (
            <div className="px-3 py-3 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono mb-1.5">Contacts</p>
              <div className="space-y-1.5">
                {relatedContacts.map(c => (
                  <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-2 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400">
                    <Users size={11} className="text-slate-400" /> {fullName(c)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Owners / Team */}
          {owners.length > 0 && (
            <div className="px-3 py-3 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono mb-1.5">Team</p>
              <div className="flex gap-1.5">
                {owners.map(m => (
                  <div key={m.id} title={m.displayName || m.email} className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold font-mono text-brand-700 dark:text-brand-300">{(m.displayName || m.email)[0].toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {deal.tags?.length > 0 && (
            <div className="px-3 py-3 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <div className="flex flex-wrap gap-1">
                {deal.tags.map(t => <span key={t} className="v-badge bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">{t}</span>)}
              </div>
            </div>
          )}

          {/* Stage history */}
          {deal.stageHistory?.length > 0 && (
            <div className="px-3 py-3 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono mb-1.5">Stage History</p>
              <div className="space-y-1.5">
                {[...deal.stageHistory].reverse().slice(0, 5).map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-400 dark:text-slate-500 font-mono tabular-nums">{formatDate(h.at)}</span>
                    <span className="text-slate-300 dark:text-slate-600"><ChevronRight size={10} /></span>
                    <span className={clsx('v-badge', DEAL_STATUS_COLORS[h.to])}>{formatDealStatus(h.to)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {deal.notes && (
            <div className="px-3 py-3 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono mb-1">Notes</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{deal.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Activity & Reminders */}
        <div className="flex-1 overflow-auto bg-surface-50 dark:bg-surface-50 p-4 space-y-4">
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

export default function Deals() {
  const { id } = useParams()
  if (id) return <DealDetail />

  const { properties, addProperty, getCompany, teamMembers } = useCRM()
  const { dealMomentum } = useIntelligence()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'value' ? 'desc' : 'asc') }
  }

  const filtered = properties.filter(p => {
    const q = search.toLowerCase()
    const matches = !q || p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q))
    const status = !filterStatus || p.status === filterStatus
    const type = !filterType || p.dealType === filterType
    return matches && status && type
  }).sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'name': cmp = (a.name || a.address || '').localeCompare(b.name || b.address || ''); break
      case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break
      case 'type': cmp = (a.dealType || '').localeCompare(b.dealType || ''); break
      case 'value': cmp = (Number(a.dealValue) || 0) - (Number(b.dealValue) || 0); break
      default: cmp = 0
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  // Merge momentum scores
  const withMomentum = filtered.map(p => {
    const m = dealMomentum.find(d => d.id === p.id)
    return { ...p, momentumScore: m?.momentumScore, momentumLabel: m?.momentumLabel }
  })

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{properties.length} deal{properties.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="v-btn-primary"><Plus size={13} /> New Deal</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals..." className="v-input pl-8" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="v-select w-36">
          <option value="">All statuses</option>
          {DEAL_STATUSES.map(s => <option key={s} value={s}>{formatDealStatus(s)}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="v-select w-40">
          <option value="">All types</option>
          {DEAL_TYPES.map(t => <option key={t} value={t}>{formatDealType(t)}</option>)}
        </select>
      </div>

      {/* Table */}
      {withMomentum.length === 0 ? (
        <div className="os-zone p-8 text-center">
          <Briefcase size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-[11px] text-slate-400 dark:text-slate-500">No deals found</p>
          <button onClick={() => setShowAdd(true)} className="v-btn-primary mt-3 text-[10px]"><Plus size={12} /> Add Deal</button>
        </div>
      ) : (
        <div className="os-zone overflow-hidden">
          <table className="v-table">
            <thead>
              <tr>
                {[
                  { field: 'name', label: 'Deal' },
                  { field: 'status', label: 'Status' },
                  { field: 'type', label: 'Type' },
                  { field: 'value', label: 'Value' },
                  { field: null, label: 'Momentum' },
                  { field: null, label: 'Company' },
                ].map(({ field, label }) => (
                  <th key={label} onClick={field ? () => handleSort(field) : undefined}
                    className={clsx(field && 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200')}>
                    {label} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withMomentum.map(p => {
                const company = getCompany(p.ownerCompanyId) || getCompany(p.tenantCompanyId)
                return (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/deals/${p.id}`} className="font-medium text-[12px] text-slate-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400">
                        {p.name || p.address || 'Untitled'}
                      </Link>
                      {p.address && p.name && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{p.address}</p>}
                    </td>
                    <td><span className={clsx('v-badge', DEAL_STATUS_COLORS[p.status])}>{formatDealStatus(p.status)}</span></td>
                    <td>{p.dealType ? <span className={clsx('v-badge', DEAL_TYPE_COLORS[p.dealType])}>{formatDealType(p.dealType)}</span> : '—'}</td>
                    <td className="font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(p.dealValue)}</td>
                    <td>
                      {p.momentumScore != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-surface-100 dark:bg-surface-200 overflow-hidden">
                            <div className={clsx('h-full',
                              p.momentumScore >= 75 ? 'bg-emerald-500' :
                              p.momentumScore >= 50 ? 'bg-blue-500' :
                              p.momentumScore >= 25 ? 'bg-amber-500' : 'bg-red-500'
                            )} style={{ width: `${p.momentumScore}%` }} />
                          </div>
                          <span className="text-[10px] font-mono tabular-nums text-slate-400">{p.momentumScore}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      {company ? (
                        <Link to={`/companies/${company.id}`} className="text-[12px] text-slate-500 hover:text-brand-600 dark:text-slate-400">{company.name}</Link>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="New Deal" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <DealForm onSubmit={async (form) => { await addProperty(form); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}
