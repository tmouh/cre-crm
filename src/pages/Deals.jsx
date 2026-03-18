/**
 * Deals page — wraps the existing Properties component
 * but accessed via /deals routes instead of /properties.
 * This is the same data model (properties table) with a "Deals" label.
 */

import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  Plus, Search, ArrowLeft, Edit2, Trash2, MapPin, Building2,
  Users, Clock, ChevronRight, Briefcase, Mail, FileText, ArrowUpRight, ChevronDown, X, Upload,
} from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'
import { useMicrosoft } from '../context/MicrosoftContext'
import { useIntelligence } from '../hooks/useIntelligence'
import {
  formatCurrency, formatDate, fullName, formatDealType, formatDealStatus,
  DEAL_TYPES, DEAL_STATUSES, DEAL_STATUS_COLORS, DEAL_TYPE_COLORS,
  DEAL_CATEGORIES, DEAL_CATEGORY_COLORS, formatDealCategory,
  PROPERTY_TYPES, PROPERTY_TYPE_COLORS, formatAssetType,
} from '../utils/helpers'
import Modal from '../components/Modal'
import ImportModal from '../components/ImportModal'
import TagInput from '../components/TagInput'
import ActivityFeed from '../components/ActivityFeed'
import ReminderList from '../components/ReminderList'
import CompanyCombobox from '../components/CompanyCombobox'
import { getEmailsForContact, searchEmailsByKeyword } from '../services/microsoft'
import { ContactForm } from './Contacts'

const BLANK = {
  name: '', address: '', dealCategory: '', dealType: '', propertyType: '', size: '', sizeUnit: 'SF',
  status: 'prospect', dealValue: '', ownerCompanyId: '', tenantCompanyId: '',
  contactIds: [], tags: [], notes: '', ownerIds: [],
}

function InlineSelect({ value, onChange, options, formatOption, placeholder = 'Select or type…' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const q = query.toLowerCase().trim()
  const filtered = q ? options.filter(o => o.toLowerCase().includes(q)) : options
  const sorted = [...filtered].sort((a, b) => {
    const la = formatOption ? formatOption(a) : a
    const lb = formatOption ? formatOption(b) : b
    return la.localeCompare(lb)
  })
  const hasExact = options.some(o => o.toLowerCase() === q)
  const canCreate = q.length > 1 && !hasExact
  function select(v) { onChange(v); setQuery(''); setOpen(false) }
  const displayValue = value ? (formatOption ? formatOption(value) : value) : ''
  return (
    <div ref={ref} className="relative">
      <div
        className={clsx('v-input flex items-center gap-1.5 cursor-text min-h-[30px] py-1', open && 'ring-1 ring-brand-400')}
        onClick={() => setOpen(true)}
      >
        <input
          value={open ? query : displayValue}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          placeholder={placeholder}
          className="flex-1 text-xs outline-none bg-transparent text-slate-700 dark:text-slate-300 placeholder-slate-400"
        />
        <ChevronDown size={11} className="text-slate-400 flex-shrink-0" />
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 border border-[var(--border)] bg-white dark:bg-surface-100 shadow-lg max-h-44 overflow-auto">
          {!q && (
            <button type="button" onClick={() => select('')}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-surface-200 border-b border-[var(--border)]">
              —
            </button>
          )}
          {sorted.map(o => (
            <button key={o} type="button" onClick={() => select(o)}
              className={clsx('w-full text-left px-3 py-1.5 text-xs transition-colors',
                value === o
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-200')}>
              {formatOption ? formatOption(o) : o}
            </button>
          ))}
          {canCreate && (
            <button type="button"
              onClick={() => select(query.trim().toLowerCase().replace(/\s+/g, '-'))}
              className="w-full text-left px-3 py-1.5 text-xs text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 border-t border-[var(--border)]">
              + Add "{query.trim()}"
            </button>
          )}
          {sorted.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">No matches</p>
          )}
        </div>
      )}
    </div>
  )
}

function DealForm({ initial = BLANK, onSubmit, onCancel }) {
  const { addCompany, addContact, contacts, teamMembers } = useCRM()
  const { user } = useAuth()
  const defaultOwnerIds = initial === BLANK ? (user ? [user.id] : []) : (initial.ownerIds || [])
  const [form, setForm] = useState({ ...BLANK, ...initial, ownerIds: defaultOwnerIds })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [showNewContact, setShowNewContact] = useState(false)
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
    <>
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
          <label className="v-label">Stage</label>
          <InlineSelect
            value={form.dealCategory}
            onChange={v => setForm(p => ({ ...p, dealCategory: v }))}
            options={DEAL_CATEGORIES}
            formatOption={formatDealCategory}
            placeholder="Acquisition, Development…"
          />
        </div>
        <div>
          <label className="v-label">Status</label>
          <select value={form.status} onChange={f('status')} className="v-select">
            <option value="">—</option>
            {DEAL_STATUSES.map(s => <option key={s} value={s}>{formatDealStatus(s)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="v-label">Deal type</label>
          <InlineSelect
            value={form.dealType}
            onChange={v => setForm(p => ({ ...p, dealType: v }))}
            options={DEAL_TYPES}
            formatOption={formatDealType}
            placeholder="Full, Equity, Debt/Equity…"
          />
        </div>
        <div>
          <label className="v-label">Property type</label>
          <InlineSelect
            value={form.propertyType}
            onChange={v => setForm(p => ({ ...p, propertyType: v }))}
            options={PROPERTY_TYPES}
            formatOption={formatAssetType}
            placeholder="Select or add type…"
          />
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="v-label">Owner / Buyer</label>
          <CompanyCombobox value={form.ownerCompanyId} onChange={(id) => setForm(p => ({ ...p, ownerCompanyId: id }))}
            onCreateAndSelect={async (name) => { const c = await addCompany({ name, type: 'other' }); setForm(p => ({ ...p, ownerCompanyId: c.id })) }} />
        </div>
        <div>
          <label className="v-label">Seller</label>
          <CompanyCombobox value={form.tenantCompanyId} onChange={(id) => setForm(p => ({ ...p, tenantCompanyId: id }))}
            onCreateAndSelect={async (name) => { const c = await addCompany({ name, type: 'other' }); setForm(p => ({ ...p, tenantCompanyId: c.id })) }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="v-label mb-0">Deal Contacts</label>
          <button
            type="button"
            onClick={() => setShowNewContact(true)}
            className="flex items-center gap-0.5 text-[10px] text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            <Plus size={10} /> New Contact
          </button>
        </div>
        {selectedContacts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {selectedContacts.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-[11px] font-medium">
                {fullName(c)}
                <button type="button" onClick={() => toggleContact(c.id)} className="hover:bg-brand-200 dark:hover:bg-brand-800 p-0.5">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <input
            value={contactQuery}
            onChange={e => setContactQuery(e.target.value)}
            className="v-input"
            placeholder="Search contacts to add…"
          />
          {contactQuery && filteredContacts.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 border border-[var(--border)] border-t-0 max-h-36 overflow-y-auto bg-white dark:bg-surface-100 shadow-lg">
              {filteredContacts.slice(0, 8).map(c => (
                <button key={c.id} type="button"
                  onClick={() => { toggleContact(c.id); setContactQuery('') }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                  {fullName(c)}{c.title && <span className="text-slate-400 ml-1.5">· {c.title}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
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
    {showNewContact && (
      <Modal title="New Contact" onClose={() => setShowNewContact(false)} size="2xl" disableBackdropClose>
        <ContactForm
          onSubmit={async (contactForm) => {
            const newContact = await addContact(contactForm)
            if (!newContact?.id) throw new Error('Contact could not be saved — please try again.')
            setForm(p => ({ ...p, contactIds: [...(p.contactIds || []), newContact.id] }))
            setShowNewContact(false)
          }}
          onCancel={() => setShowNewContact(false)}
        />
      </Modal>
    )}
    </>
  )
}

// ─── Deal email scanning ────────────────────────────────────────────────────

function DealEmailThread({ thread }) {
  const [expanded, setExpanded] = useState(false)
  // thread is sorted newest-first; latest = thread[0]
  const latest = thread[0]

  return (
    <div className="v-card overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left p-3 flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-surface-100 transition-colors"
      >
        <Mail size={13} className={clsx('mt-0.5 flex-shrink-0', latest.isRead ? 'text-slate-300 dark:text-slate-600' : 'text-brand-500')} />
        <div className="flex-1 min-w-0">
          <p className={clsx('text-xs truncate', latest.isRead ? 'text-slate-600 dark:text-slate-400' : 'font-semibold text-slate-800 dark:text-slate-200')}>
            {latest.subject || '(no subject)'}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {latest.from?.emailAddress?.name || latest.from?.emailAddress?.address}
            </span>
            <span className="text-slate-300 dark:text-slate-600 text-[10px]">·</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{formatDate(latest.receivedDateTime)}</span>
            {thread.length > 1 && (
              <>
                <span className="text-slate-300 dark:text-slate-600 text-[10px]">·</span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{thread.length} msgs</span>
              </>
            )}
          </div>
        </div>
        <a
          href={latest.webLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="p-1 text-slate-300 hover:text-brand-500 dark:text-slate-600 dark:hover:text-brand-400 transition-colors flex-shrink-0"
          title="Open in Outlook"
        >
          <ArrowUpRight size={12} />
        </a>
      </button>

      {expanded && thread.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700/40 divide-y divide-slate-50 dark:divide-slate-800/50">
          {thread.map(email => (
            <a
              key={email.id}
              href={email.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-surface-100 transition-colors"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                  {email.from?.emailAddress?.name || email.from?.emailAddress?.address}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex-shrink-0 ml-2">
                  {formatDate(email.receivedDateTime)}
                </span>
              </div>
              {email.bodyPreview && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">{email.bodyPreview}</p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function DealEmails({ deal, relatedContacts }) {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchEmails() {
      setLoading(true)
      const promises = []

      // Fetch by each linked contact's email
      for (const contact of relatedContacts) {
        if (contact.email)  promises.push(getEmailsForContact(contact.email,  180))
        if (contact.email2) promises.push(getEmailsForContact(contact.email2, 180))
      }

      // Search by property address and deal name as keywords
      if (deal.address) promises.push(searchEmailsByKeyword(deal.address, 180))
      if (deal.name)    promises.push(searchEmailsByKeyword(deal.name,    180))

      const results = await Promise.allSettled(promises)
      if (cancelled) return

      const allEmails = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])

      // Deduplicate by email id
      const seen = new Set()
      const unique = allEmails.filter(e => {
        if (seen.has(e.id)) return false
        seen.add(e.id)
        return true
      })

      // Sort newest first
      unique.sort((a, b) => (b.receivedDateTime || '').localeCompare(a.receivedDateTime || ''))

      // Group into threads by conversationId
      const threadMap = new Map()
      for (const email of unique) {
        const key = email.conversationId || email.id
        if (!threadMap.has(key)) threadMap.set(key, [])
        threadMap.get(key).push(email)
      }

      // Sort threads by most recent message
      const sortedThreads = Array.from(threadMap.values()).sort((a, b) =>
        (b[0].receivedDateTime || '').localeCompare(a[0].receivedDateTime || '')
      )

      setThreads(sortedThreads)
      setLoading(false)
    }

    fetchEmails()
    return () => { cancelled = true }
  }, [deal.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="v-card p-6 text-center">
        <Mail size={16} className="text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
        <p className="text-xs text-slate-400 dark:text-slate-500">Scanning Outlook…</p>
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="v-card p-6 text-center">
        <Mail size={16} className="text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
        <p className="text-xs text-slate-400 dark:text-slate-500">No related emails found</p>
        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">Searched by contact emails, address, and deal name</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
        {threads.length} thread{threads.length !== 1 ? 's' : ''} found
      </p>
      {threads.map(thread => (
        <DealEmailThread key={thread[0].conversationId || thread[0].id} thread={thread} />
      ))}
    </div>
  )
}

function DealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getProperty, getCompany, getContact, updatePropertyWithStage, deleteProperty, contacts, teamMembers } = useCRM()

  async function addContactToDeal(contactId) {
    if (!contactId) return
    const current = deal.contactIds || []
    if (current.includes(contactId)) return
    await updatePropertyWithStage(id, { ...deal, contactIds: [...current, contactId] })
  }
  const { dealMomentum } = useIntelligence()
  const { isConnected } = useMicrosoft()
  const [editing, setEditing] = useState(false)
  const [rightTab, setRightTab] = useState('activity')
  const [editingMomentum, setEditingMomentum] = useState(false)
  const [momentumInput, setMomentumInput] = useState('')

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
          <div className="flex items-center gap-2 flex-wrap">
            {deal.dealCategory && (
              <span className={clsx('v-badge text-[10px]', DEAL_CATEGORY_COLORS[deal.dealCategory])}>{formatDealCategory(deal.dealCategory)}</span>
            )}
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
                  <div className="flex items-center gap-1.5">
                    {deal.momentumOverride != null && (
                      <span className="text-[9px] font-mono text-amber-500 dark:text-amber-400">override</span>
                    )}
                    {editingMomentum ? (
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" max="100"
                          value={momentumInput}
                          onChange={e => setMomentumInput(e.target.value)}
                          className="w-14 text-[11px] text-center border border-[var(--border)] bg-white dark:bg-surface-200 text-slate-700 dark:text-slate-300 outline-none px-1 py-0"
                          autoFocus
                        />
                        <button type="button"
                          onClick={async () => {
                            const val = momentumInput === '' ? null : Math.max(0, Math.min(100, Number(momentumInput)))
                            await updatePropertyWithStage(id, { ...deal, momentumOverride: val })
                            setEditingMomentum(false)
                          }}
                          className="text-[10px] text-brand-600 dark:text-brand-400 font-medium hover:underline">Set</button>
                        <button type="button" onClick={() => setEditingMomentum(false)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Cancel</button>
                      </div>
                    ) : (
                      <button type="button"
                        onClick={() => { setMomentumInput(deal.momentumOverride?.toString() ?? momentum.momentumScore.toString()); setEditingMomentum(true) }}
                        className={clsx('text-[10px] font-bold font-mono tabular-nums',
                          momentum.momentumScore >= 75 ? 'text-emerald-500' :
                          momentum.momentumScore >= 50 ? 'text-blue-500' :
                          momentum.momentumScore >= 25 ? 'text-amber-500' : 'text-red-500')}>
                        {momentum.momentumScore}/100
                      </button>
                    )}
                  </div>
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

          {/* Deal Contacts */}
          {relatedContacts.length > 0 && (
            <div className="px-3 py-3 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono mb-1.5">Deal Contacts</p>
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

        {/* Right: tabbed Activity / Emails */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-50 dark:bg-surface-50">
          {/* Tab bar */}
          <div className="flex border-b border-[var(--border)] bg-surface-0 flex-shrink-0 px-1">
            {[
              { id: 'activity', label: 'Activity', icon: Briefcase },
              ...(isConnected ? [{ id: 'emails', label: 'Emails', icon: Mail }] : []),
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 -mb-px transition-colors',
                  rightTab === tab.id
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                )}
              >
                <tab.icon size={11} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {rightTab === 'activity' && (
              <>
                <ReminderList propertyId={id} />
                <ActivityFeed
                  propertyId={id}
                  dealContacts={relatedContacts}
                  onAddDealContact={addContactToDeal}
                />
              </>
            )}
            {rightTab === 'emails' && isConnected && (
              <DealEmails deal={deal} relatedContacts={relatedContacts} />
            )}
          </div>
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
  const [showImport, setShowImport] = useState(false)
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
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="v-btn-secondary text-xs"><Upload size={13} /> Import</button>
          <button onClick={() => setShowAdd(true)} className="v-btn-primary"><Plus size={13} /> New Deal</button>
        </div>
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
                  { field: 'dealCategory', label: 'Stage' },
                  { field: 'status', label: 'Status' },
                  { field: 'type', label: 'Deal Type' },
                  { field: 'propertyType', label: 'Property Type' },
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
                    <td>{p.dealCategory ? <span className={clsx('v-badge', DEAL_CATEGORY_COLORS[p.dealCategory])}>{formatDealCategory(p.dealCategory)}</span> : '—'}</td>
                    <td><span className={clsx('v-badge', DEAL_STATUS_COLORS[p.status])}>{formatDealStatus(p.status)}</span></td>
                    <td>{p.dealType ? <span className={clsx('v-badge', DEAL_TYPE_COLORS[p.dealType])}>{formatDealType(p.dealType)}</span> : '—'}</td>
                    <td>{p.propertyType ? <span className="v-badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{formatAssetType(p.propertyType)}</span> : '—'}</td>
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
      {showImport && <ImportModal entity="deals" onClose={() => setShowImport(false)} />}
    </div>
  )
}
