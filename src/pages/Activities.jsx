import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, Mail, Users, FileText, Building2, Map, MessageSquare, Briefcase,
  Plus, Trash2, Edit3, ChevronDown, ChevronRight, X, ListChecks, Search,
  AlertCircle, Bell, Check, Zap, ArrowUpRight, ArrowDownLeft, Calendar,
} from 'lucide-react'
import clsx from 'clsx'
import { ACTIVITY_TYPES, TYPE_COLORS, fullName, formatDate, isOverdue, isDueToday } from '../utils/helpers'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_ICONS = {
  call:     Phone,
  email:    Mail,
  meeting:  Users,
  note:     FileText,
  tour:     Map,
  proposal: Building2,
  other:    MessageSquare,
}

const ACTIVITY_VERBS = {
  call:     'called',
  email:    'emailed',
  meeting:  'met with',
  note:     'left a note on',
  tour:     'toured with',
  proposal: 'sent a proposal to',
  other:    'logged',
}

const PAGE_SIZE = 200

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

// ─── Date grouping ──────────────────────────────────────────────────────────

function startOfDay(d) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function groupKey(iso) {
  if (!iso) return 'Earlier'
  const d = startOfDay(new Date(iso))
  const now = new Date()
  const today = startOfDay(now)
  const yesterday = startOfDay(new Date(now - 86400000))
  const weekAgo = startOfDay(new Date(now - 7 * 86400000))
  if (d >= today) return 'Today'
  if (d >= yesterday) return 'Yesterday'
  if (d >= weekAgo) return 'This Week'
  return 'Earlier'
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier']

function groupItems(items) {
  const groups = {}
  for (const item of items) {
    const key = groupKey(item._sortDate)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatActivityTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}

// ─── Contact Combobox ────────────────────────────────────────────────────────

function ContactCombobox({ allContacts, value, onChange, dealContacts }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref = useRef(null)

  const selected = value ? allContacts.find(c => c.id === value) : null

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const dealContactIds = new Set((dealContacts || []).map(c => c.id))

  const filtered = (query.trim()
    ? allContacts.filter(c => fullName(c).toLowerCase().includes(query.toLowerCase()))
    : allContacts
  ).slice(0, 12)

  const dealFiltered  = dealContacts ? filtered.filter(c =>  dealContactIds.has(c.id)) : []
  const otherFiltered = dealContacts ? filtered.filter(c => !dealContactIds.has(c.id)) : filtered

  function select(id) { onChange(id); setQuery(''); setOpen(false) }

  return (
    <div ref={ref} className="relative">
      <div
        className={clsx('v-input flex items-center gap-1.5 cursor-pointer min-h-[34px] py-1.5', open && 'ring-1 ring-brand-400')}
        onClick={() => setOpen(v => !v)}
      >
        {selected ? (
          <>
            <span className="flex-1 text-sm text-slate-800 dark:text-slate-200 truncate">{fullName(selected)}</span>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(null) }} className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400">
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-slate-400 dark:text-slate-500">Search contacts…</span>
            <ChevronDown size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
          </>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 border border-[var(--border)] bg-white dark:bg-surface-100 shadow-lg max-h-52 overflow-auto">
          <div className="px-2 py-1.5 border-b border-[var(--border)] sticky top-0 bg-white dark:bg-surface-100">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search contacts…"
              className="w-full text-sm outline-none bg-transparent text-slate-700 dark:text-slate-300 placeholder-slate-400"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No contacts found</p>}

          {dealFiltered.length > 0 && (
            <>
              <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono bg-surface-50 dark:bg-surface-0">
                Deal Contacts
              </p>
              {dealFiltered.map(c => (
                <button key={c.id} type="button" onClick={() => select(c.id)}
                  className={clsx('w-full text-left px-3 py-1.5 text-sm transition-colors',
                    value === c.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-200')}>
                  {fullName(c)}
                  {c.title && <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs">{c.title}</span>}
                </button>
              ))}
            </>
          )}

          {otherFiltered.length > 0 && (
            <>
              {dealFiltered.length > 0 && (
                <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono bg-surface-50 dark:bg-surface-0 border-t border-[var(--border)]">
                  All Contacts
                </p>
              )}
              {otherFiltered.map(c => (
                <button key={c.id} type="button" onClick={() => select(c.id)}
                  className={clsx('w-full text-left px-3 py-1.5 text-sm transition-colors',
                    value === c.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-200')}>
                  {fullName(c)}
                  {c.title && <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs">{c.title}</span>}
                  {dealContacts && !dealContactIds.has(c.id) && (
                    <span className="ml-1.5 text-[9px] text-brand-500 dark:text-brand-400">+ add to deal</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Deal Combobox ───────────────────────────────────────────────────────────

function DealCombobox({ allDeals, value, onChange, contactDeals }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref = useRef(null)

  const selected = value ? allDeals.find(d => d.id === value) : null

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const contactDealIds = new Set((contactDeals || []).map(d => d.id))

  const filtered = (query.trim()
    ? allDeals.filter(d => (d.name || d.address || '').toLowerCase().includes(query.toLowerCase()))
    : allDeals
  ).slice(0, 12)

  const linked = contactDeals ? filtered.filter(d =>  contactDealIds.has(d.id)) : []
  const other  = contactDeals ? filtered.filter(d => !contactDealIds.has(d.id)) : filtered

  function select(id) { onChange(id); setQuery(''); setOpen(false) }

  return (
    <div ref={ref} className="relative">
      <div
        className={clsx('v-input flex items-center gap-1.5 cursor-pointer min-h-[34px] py-1.5', open && 'ring-1 ring-brand-400')}
        onClick={() => setOpen(v => !v)}
      >
        {selected ? (
          <>
            <span className="flex-1 text-sm text-slate-800 dark:text-slate-200 truncate">{selected.name || selected.address || 'Unnamed deal'}</span>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(null) }} className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400">
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-slate-400 dark:text-slate-500">Select deal… (optional)</span>
            <ChevronDown size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
          </>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 border border-[var(--border)] bg-white dark:bg-surface-100 shadow-lg max-h-52 overflow-auto">
          <div className="px-2 py-1.5 border-b border-[var(--border)] sticky top-0 bg-white dark:bg-surface-100">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search deals…"
              className="w-full text-sm outline-none bg-transparent text-slate-700 dark:text-slate-300 placeholder-slate-400"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No deals found</p>}

          {linked.length > 0 && (
            <>
              <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono bg-surface-50 dark:bg-surface-0">
                Contact's Deals
              </p>
              {linked.map(d => (
                <button key={d.id} type="button" onClick={() => select(d.id)}
                  className={clsx('w-full text-left px-3 py-1.5 text-sm transition-colors',
                    value === d.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-200')}>
                  {d.name || d.address || 'Unnamed deal'}
                  {d.status && <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs capitalize">{d.status}</span>}
                </button>
              ))}
            </>
          )}

          {other.length > 0 && (
            <>
              {linked.length > 0 && (
                <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono bg-surface-50 dark:bg-surface-0 border-t border-[var(--border)]">
                  All Deals
                </p>
              )}
              {other.map(d => (
                <button key={d.id} type="button" onClick={() => select(d.id)}
                  className={clsx('w-full text-left px-3 py-1.5 text-sm transition-colors',
                    value === d.id ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-200')}>
                  {d.name || d.address || 'Unnamed deal'}
                  {d.status && <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-xs capitalize">{d.status}</span>}
                  {contactDeals && (
                    <span className="ml-1.5 text-[9px] text-brand-500 dark:text-brand-400">+ link to contact</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Deal Thread Card (from Inbox) ──────────────────────────────────────────

function DealThreadCard({ da, getContact, getCompany, getProperty, properties, updateDealActivity }) {
  const [expanded, setExpanded] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [candidatePick, setCandidatePick] = useState('')

  const contact  = da.contactId  ? getContact(da.contactId)   : null
  const company  = da.companyId  ? getCompany(da.companyId)   : null
  const property = da.propertyId ? getProperty(da.propertyId) : null
  const needsReview  = da.status === 'needs_review'
  const hasCandidates = (da.candidatePropertyIds || []).length > 1

  async function dismiss()  { await updateDealActivity(da.id, { status: 'dismissed' }).catch(() => {}) }
  async function confirm()  { await updateDealActivity(da.id, { status: 'confirmed' }).catch(() => {}) }
  async function resolveProperty() {
    if (!candidatePick) return
    await updateDealActivity(da.id, { propertyId: candidatePick, candidatePropertyIds: [], status: 'confirmed' }).catch(() => {})
    setResolving(false)
  }

  const DirectionIcon  = da.lastDirection === 'inbound' ? ArrowDownLeft : ArrowUpRight
  const directionColor = da.lastDirection === 'inbound' ? 'text-green-500 dark:text-green-400' : 'text-blue-500 dark:text-blue-400'

  return (
    <div className={clsx(
      'border transition-colors',
      needsReview
        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10'
        : 'border-slate-100 bg-slate-50/30 dark:border-slate-700/40 dark:bg-slate-800/20'
    )}>
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <div className={clsx('w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5',
          needsReview ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400')}>
          <Mail size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 w-full text-left group">
            {expanded ? <ChevronDown size={11} className="flex-shrink-0 text-slate-400" /> : <ChevronRight size={11} className="flex-shrink-0 text-slate-400" />}
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{da.subject || '(no subject)'}</span>
          </button>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {contact && <span className="text-2xs text-slate-500 dark:text-slate-400">{contact.firstName} {contact.lastName}</span>}
            {company && <><span className="text-slate-300 dark:text-slate-600 text-2xs">·</span><span className="text-2xs text-slate-500 dark:text-slate-400">{company.name}</span></>}
            {property && <><span className="text-slate-300 dark:text-slate-600 text-2xs">·</span><span className="text-2xs text-brand-600 dark:text-brand-400 font-medium truncate max-w-[140px]">{property.name || property.address}</span></>}
            {!property && hasCandidates && <><span className="text-slate-300 dark:text-slate-600 text-2xs">·</span><span className="text-2xs text-amber-600 dark:text-amber-400 italic">deal unclear</span></>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{da.messageCount || 1} msg{(da.messageCount || 1) !== 1 ? 's' : ''}</span>
            <DirectionIcon size={10} className={directionColor} />
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{timeAgo(da.lastMessageAt)}</span>
            {needsReview && <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium"><AlertCircle size={10} /> Review</span>}
            {da.status === 'confirmed' && <span className="flex items-center gap-0.5 text-[10px] text-green-600 dark:text-green-400"><Check size={10} /> Confirmed</span>}
            {da.confidence === 'high' && da.status === 'auto' && <span className="flex items-center gap-0.5 text-[10px] text-blue-400 dark:text-blue-500"><Zap size={9} /> Auto</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {needsReview && (
            <button onClick={confirm} className="p-1 text-slate-300 hover:text-green-500 dark:text-slate-600 dark:hover:text-green-400 transition-colors" title="Confirm">
              <Check size={12} />
            </button>
          )}
          <button onClick={dismiss} className="p-1 text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-colors" title="Dismiss">
            <X size={12} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700/40 pt-2 space-y-2">
          {(da.relevanceSignals || []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Matched on</p>
              <div className="flex flex-wrap gap-1">
                {da.relevanceSignals.map((sig, i) => (
                  <span key={i} className={clsx('text-[10px] px-1.5 py-0.5 font-medium',
                    (sig.type === 'deal_folder_attachment' || sig.type === 'om_uw_attachment')
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      : sig.type === 'active_deal_contact'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                    {sig.type === 'deal_folder_attachment' && '📁 OM/UW folder attachment'}
                    {sig.type === 'om_uw_attachment'       && '📎 OM/UW file attached'}
                    {sig.type === 'active_deal_contact'    && 'Active deal contact'}
                  </span>
                ))}
              </div>
            </div>
          )}
          {hasCandidates && !da.propertyId && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">Multiple deals matched — pick one</p>
              {resolving ? (
                <div className="flex items-center gap-2">
                  <select value={candidatePick} onChange={e => setCandidatePick(e.target.value)} className="v-input text-xs py-1 flex-1">
                    <option value="">Select deal...</option>
                    {(da.candidatePropertyIds || []).map(pid => { const p = properties.find(x => x.id === pid); return p ? <option key={pid} value={pid}>{p.name || p.address}</option> : null })}
                  </select>
                  <button onClick={resolveProperty} className="v-btn-primary text-xs py-1">Link</button>
                  <button onClick={() => setResolving(false)} className="v-btn-secondary text-xs py-1">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setResolving(true)} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">Pick the correct deal →</button>
              )}
            </div>
          )}
          {da.propertyId && !resolving && (
            <button onClick={() => { setCandidatePick(''); setResolving(true) }} className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors">
              Wrong deal? Change it →
            </button>
          )}
          {resolving && da.propertyId && (
            <div className="flex items-center gap-2">
              <select value={candidatePick} onChange={e => setCandidatePick(e.target.value)} className="v-input text-xs py-1 flex-1">
                <option value="">Select deal...</option>
                {properties.filter(p => !p.deletedAt).map(p => <option key={p.id} value={p.id}>{p.name || p.address}</option>)}
              </select>
              <button onClick={resolveProperty} className="v-btn-primary text-xs py-1">Save</button>
              <button onClick={() => setResolving(false)} className="v-btn-secondary text-xs py-1">Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Reminder Action Card ───────────────────────────────────────────────────

function ReminderActionCard({ r, getContact, getCompany, getProperty, completeReminder }) {
  const overdue = isOverdue(r.dueDate)
  const contact = r.contactId  ? getContact(r.contactId)   : null
  const company = r.companyId  ? getCompany(r.companyId)   : null
  const deal    = r.propertyId ? getProperty(r.propertyId) : null

  const linkTo = deal    ? `/deals/${deal.id}`
               : contact ? `/contacts/${contact.id}`
               : company ? `/companies/${company.id}`
               : '/reminders'

  return (
    <div className={clsx(
      'border px-3 py-2.5 flex items-start gap-2.5 group',
      overdue
        ? 'border-red-200 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/10'
        : 'border-amber-200 bg-amber-50/30 dark:border-amber-800/40 dark:bg-amber-900/10'
    )}>
      <Bell size={13} className={clsx('mt-0.5 flex-shrink-0', overdue ? 'text-red-500' : 'text-amber-500')} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{r.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={clsx('text-[10px] font-mono', overdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
            {overdue ? `Overdue · ` : 'Due today · '}{formatDate(r.dueDate)}
          </span>
          {(contact || company || deal) && (
            <Link to={linkTo} className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline truncate">
              {deal ? (deal.name || deal.address) : contact ? fullName(contact) : company?.name}
            </Link>
          )}
        </div>
      </div>
      <button
        onClick={() => completeReminder(r.id)}
        className="p-1 text-slate-300 hover:text-green-500 dark:text-slate-600 dark:hover:text-green-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 self-center"
        title="Mark done"
      >
        <Check size={13} />
      </button>
    </div>
  )
}

// ─── Date Group Header ──────────────────────────────────────────────────────

function DateGroupHeader({ label }) {
  return (
    <div className="flex items-center gap-2 pt-5 pb-1.5 first:pt-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 font-mono">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Activities() {
  const {
    activities, contacts, companies, properties, dealActivities, reminders,
    addActivity, updateActivity, deleteActivity, updateProperty,
    getContact, getCompany, getProperty, updateDealActivity, completeReminder,
  } = useCRM()
  const { user } = useAuth()

  // ─── Filter state ──────────────────────────────────────────────────────────
  const [search,              setSearch]              = useState('')
  const [filterType,          setFilterType]          = useState(null)
  const [filterContactSearch, setFilterContactSearch] = useState('')
  const [page,                setPage]                = useState(0)

  // ─── Log form state ────────────────────────────────────────────────────────
  const [showForm,      setShowForm]      = useState(false)
  const [formType,      setFormType]      = useState('call')
  const [formContactId, setFormContactId] = useState(null)
  const [formDealId,    setFormDealId]    = useState(null)
  const [formNotes,     setFormNotes]     = useState('')
  const [formDate,      setFormDate]      = useState('')
  const [formTime,      setFormTime]      = useState('')

  // ─── Edit state ────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState(null)
  const [editForm,  setEditForm]  = useState({ type: '', description: '', date: '', time: '' })

  const actorName    = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'You'
  const avatarLetter = (actorName[0] || 'U').toUpperCase()

  // ─── Entity maps for O(1) lookup ──────────────────────────────────────────
  const contactMap = useMemo(() => Object.fromEntries(contacts.map(c => [c.id, c])), [contacts])
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies])
  const dealMap    = useMemo(() => Object.fromEntries(properties.map(p => [p.id, p])), [properties])

  // ─── Form-derived relationships ───────────────────────────────────────────
  const selectedContact        = formContactId ? contactMap[formContactId] : null
  const selectedContactCompany = selectedContact?.companyId ? companyMap[selectedContact.companyId] : null
  const autoCompanyId          = selectedContact?.companyId || null

  const selectedDeal    = formDealId ? dealMap[formDealId] : null
  const dealContactObjs = selectedDeal ? contacts.filter(c => (selectedDeal.contactIds || []).includes(c.id)) : null

  const contactInDeal      = !formContactId || !selectedDeal || (selectedDeal.contactIds || []).includes(formContactId)
  const willAddToDeal      = formContactId && formDealId && !contactInDeal

  const contactLinkedDeals = formContactId
    ? properties.filter(p => !p.deletedAt && (p.contactIds || []).includes(formContactId))
    : null

  // ─── Action Needed items ──────────────────────────────────────────────────
  const needsReviewThreads = useMemo(() =>
    dealActivities.filter(d => d.status === 'needs_review')
      .sort((a, b) => (b.lastMessageAt || b.createdAt || '').localeCompare(a.lastMessageAt || a.createdAt || '')),
  [dealActivities])

  const urgentReminders = useMemo(() =>
    reminders.filter(r => r.status !== 'done' && (isOverdue(r.dueDate) || isDueToday(r.dueDate)))
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
  [reminders])

  const actionCount = needsReviewThreads.length + urgentReminders.length

  // ─── Filtered & date-grouped activities ───────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...activities].sort((a, b) =>
      (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || '')
    )
    if (filterType) list = list.filter(a => a.type === filterType)
    if (filterContactSearch.trim()) {
      const q = filterContactSearch.toLowerCase()
      list = list.filter(a => {
        if (!a.contactId) return false
        const c = contactMap[a.contactId]
        return c && fullName(c).toLowerCase().includes(q)
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a => {
        if (a.description?.toLowerCase().includes(q)) return true
        if (a.type?.toLowerCase().includes(q)) return true
        const c = a.contactId ? contactMap[a.contactId] : null
        if (c && fullName(c).toLowerCase().includes(q)) return true
        const co = a.companyId ? companyMap[a.companyId] : null
        if (co?.name?.toLowerCase().includes(q)) return true
        const d = a.propertyId ? dealMap[a.propertyId] : null
        if (d?.name?.toLowerCase().includes(q)) return true
        return false
      })
    }
    return list
  }, [activities, filterType, filterContactSearch, search, contactMap, companyMap, dealMap])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Build date groups from paginated items
  const paginatedWithSort = paginated.map(a => ({ ...a, _sortDate: a.date || a.createdAt }))
  const grouped = useMemo(() => groupItems(paginatedWithSort), [paginatedWithSort])

  useEffect(() => { setPage(0) }, [filterType, filterContactSearch, search])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  function openForm() {
    setFormType('call')
    setFormContactId(null)
    setFormDealId(null)
    setFormNotes('')
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormTime(new Date().toTimeString().slice(0, 5))
    setShowForm(true)
  }

  async function submitForm(e) {
    e.preventDefault()
    if (!formContactId && !formNotes.trim()) return

    if (willAddToDeal && selectedDeal) {
      const newIds = [...new Set([...(selectedDeal.contactIds || []), formContactId])]
      await updateProperty(formDealId, { contactIds: newIds }).catch(() => {})
    }

    await addActivity({
      type:        formType,
      description: formNotes.trim() || null,
      contactId:   formContactId || null,
      companyId:   autoCompanyId || null,
      propertyId:  formDealId || null,
      date: formDate
        ? new Date(formDate + 'T' + (formTime || '12:00') + ':00').toISOString()
        : new Date().toISOString(),
    })

    setShowForm(false)
  }

  function startEdit(a) {
    const dateStr = a.date || a.createdAt || ''
    setEditingId(a.id)
    setEditForm({
      type:        a.type,
      description: a.description || '',
      date:        dateStr.slice(0, 10),
      time:        dateStr ? new Date(dateStr).toTimeString().slice(0, 5) : '12:00',
    })
  }

  async function saveEdit(e) {
    e.preventDefault()
    await updateActivity(editingId, {
      type:        editForm.type,
      description: editForm.description || null,
      date:        editForm.date
        ? new Date(editForm.date + 'T' + (editForm.time || '12:00') + ':00').toISOString()
        : undefined,
    })
    setEditingId(null)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col animate-fade-in px-6 py-5">

      {/* Toolbar */}
      <div className="os-toolbar">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {filtered.length} total
        </span>
        <button onClick={openForm} className="v-btn-primary flex items-center gap-1.5 text-sm ml-auto">
          <Plus size={14} /> Log Activity
        </button>
      </div>

      {/* ── Log form ── */}
      {showForm && (
        <form onSubmit={submitForm} className="card px-4 py-4 mb-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Log Activity</h3>

          {/* Type pills */}
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_TYPES.map(t => {
              const Icon = TYPE_ICONS[t] || MessageSquare
              return (
                <button key={t} type="button" onClick={() => setFormType(t)}
                  className={clsx('flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors',
                    formType === t
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 ring-1 ring-brand-200 dark:ring-brand-700'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700')}>
                  <Icon size={11} /> {capitalize(t)}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Contact */}
            <div>
              <label className="v-label">Contact</label>
              <ContactCombobox
                allContacts={contacts}
                value={formContactId}
                onChange={setFormContactId}
                dealContacts={dealContactObjs}
              />
              {selectedContactCompany && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                  <Building2 size={9} /> {selectedContactCompany.name}
                </p>
              )}
            </div>

            {/* Deal */}
            <div>
              <label className="v-label">
                Deal <span className="font-normal normal-case text-slate-400 dark:text-slate-500">(optional)</span>
              </label>
              <DealCombobox
                allDeals={properties.filter(p => !p.deletedAt)}
                value={formDealId}
                onChange={setFormDealId}
                contactDeals={contactLinkedDeals}
              />
              {willAddToDeal && (
                <p className="text-[10px] text-brand-500 dark:text-brand-400 mt-1">
                  {fullName(selectedContact)} will be added to deal contacts.
                </p>
              )}
              {selectedDeal && dealContactObjs && dealContactObjs.length > 0 && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Deal contacts: {dealContactObjs.map(c => fullName(c)).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="v-label">
              Notes <span className="font-normal normal-case text-slate-400 dark:text-slate-500">(optional)</span>
            </label>
            <textarea
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="What happened?"
              rows={2}
              className="v-input text-sm resize-y"
            />
          </div>

          {/* Date / time + actions */}
          <div className="flex items-center gap-2">
            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="v-input text-sm py-1.5 w-36" />
            <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="v-input text-sm py-1.5 w-28" />
            <div className="flex-1" />
            <button type="submit" className="v-btn-primary text-xs py-1.5">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="v-btn-secondary text-xs py-1.5">Cancel</button>
          </div>
        </form>
      )}

      {/* ── Action Needed section ── */}
      {actionCount > 0 && (
        <div className="border border-red-200 dark:border-red-800/40 overflow-hidden mb-5">
          <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 flex items-center gap-2 border-b border-red-200 dark:border-red-800/40">
            <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-red-700 dark:text-red-400 font-mono uppercase tracking-wide">
              Action Needed
            </span>
            <span className="ml-auto text-[10px] text-red-500 dark:text-red-400 font-mono">{actionCount} item{actionCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900/30">
            {urgentReminders.map(r => (
              <ReminderActionCard
                key={r.id}
                r={r}
                getContact={getContact}
                getCompany={getCompany}
                getProperty={getProperty}
                completeReminder={completeReminder}
              />
            ))}
            {needsReviewThreads.map(da => (
              <DealThreadCard
                key={da.id}
                da={da}
                getContact={getContact}
                getCompany={getCompany}
                getProperty={getProperty}
                properties={properties}
                updateDealActivity={updateDealActivity}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterType(null)}
          className={clsx('px-2.5 py-1 text-xs font-medium transition-colors',
            !filterType
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800')}
        >
          All
        </button>
        {ACTIVITY_TYPES.map(t => {
          const Icon = TYPE_ICONS[t] || MessageSquare
          return (
            <button key={t}
              onClick={() => setFilterType(filterType === t ? null : t)}
              className={clsx('flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors',
                filterType === t
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800')}>
              <Icon size={10} /> {capitalize(t)}
            </button>
          )
        })}

        <div className="flex-1 max-w-52">
          <input
            value={filterContactSearch}
            onChange={e => setFilterContactSearch(e.target.value)}
            placeholder="Filter by contact…"
            className="v-input text-xs py-1.5 w-full"
          />
        </div>

        {(filterType || filterContactSearch) && (
          <button
            onClick={() => { setFilterType(null); setFilterContactSearch('') }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* ── Activity list (date-grouped) ── */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No activities found</p>
            <button onClick={openForm} className="text-xs text-brand-600 dark:text-brand-400 hover:underline mt-1">
              Log first activity
            </button>
          </div>
        ) : (
          <div>
            {GROUP_ORDER.filter(g => grouped[g]?.length).map(groupLabel => (
              <div key={groupLabel}>
                <DateGroupHeader label={groupLabel} />
                <div className="space-y-1">
                  {grouped[groupLabel].map(a => {
                    const Icon       = TYPE_ICONS[a.type] || MessageSquare
                    const contact    = a.contactId  ? contactMap[a.contactId]  : null
                    const deal       = a.propertyId ? dealMap[a.propertyId]    : null
                    const company    = a.companyId  ? companyMap[a.companyId]
                                     : contact?.companyId ? companyMap[contact.companyId]
                                     : null
                    const verb       = ACTIVITY_VERBS[a.type] || 'logged'

                    return (
                      <div key={a.id} className="v-card overflow-hidden group">
                        {editingId === a.id ? (
                          <form onSubmit={saveEdit} className="p-3 space-y-2">
                            <div className="flex gap-2 flex-wrap">
                              <select
                                value={editForm.type}
                                onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                                className="v-select text-xs py-1.5 flex-1 min-w-[100px]"
                              >
                                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
                              </select>
                              <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="v-input text-xs py-1.5 w-32" />
                              <input type="time" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} className="v-input text-xs py-1.5 w-24" />
                            </div>
                            <textarea
                              value={editForm.description}
                              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                              placeholder="Notes (optional)"
                              className="v-input text-xs resize-y w-full"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button type="submit" className="v-btn-primary text-xs py-1.5">Save</button>
                              <button type="button" onClick={() => setEditingId(null)} className="v-btn-secondary text-xs py-1.5">Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <div className="p-3 flex gap-3">
                            {/* Avatar */}
                            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[11px] font-bold font-mono text-brand-700 dark:text-brand-300 select-none">{avatarLetter}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Type · Date */}
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Icon size={10} className={clsx(TYPE_COLORS[a.type] || 'text-slate-400')} />
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono capitalize">
                                  {a.type} · {formatActivityTime(a.date || a.createdAt)}
                                </span>
                              </div>

                              {/* [Actor] [verb] [Contact] */}
                              <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                                <span className="font-semibold">{actorName}</span>{' '}
                                <span className="text-slate-500 dark:text-slate-400">{verb}</span>{' '}
                                {contact
                                  ? <Link to={`/contacts/${contact.id}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">{fullName(contact)}</Link>
                                  : <span className="text-slate-400 dark:text-slate-500">—</span>
                                }
                              </p>

                              {/* Company / Deal pills */}
                              {(company || deal) && (
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  {company && (
                                    <Link to={`/companies/${company.id}`}
                                      className="text-[10px] text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400 flex items-center gap-0.5 transition-colors">
                                      <Building2 size={9} /> {company.name}
                                    </Link>
                                  )}
                                  {deal && (
                                    <Link to={`/deals/${deal.id}`}
                                      className="text-[10px] text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400 flex items-center gap-0.5 transition-colors">
                                      <Briefcase size={9} /> {deal.name || deal.address || 'Unnamed deal'}
                                    </Link>
                                  )}
                                </div>
                              )}

                              {/* Notes */}
                              {a.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 italic line-clamp-2 leading-relaxed">
                                  {a.description}
                                </p>
                              )}
                            </div>

                            {/* Edit / Delete — hover reveal */}
                            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={() => startEdit(a)} className="p-1 text-slate-300 hover:text-brand-500 dark:text-slate-600 dark:hover:text-brand-400 transition-colors">
                                <Edit3 size={11} />
                              </button>
                              <button onClick={() => deleteActivity(a.id)} className="p-1 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-3 mt-2">
                <p className="text-[11px] text-slate-400 font-mono">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="px-2 py-1 text-xs text-slate-500 disabled:opacity-30 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                    ‹
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">{page + 1}/{totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="px-2 py-1 text-xs text-slate-500 disabled:opacity-30 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
