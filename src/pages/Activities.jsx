import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, Mail, Users, FileText, Building2, Map, MessageSquare, Briefcase,
  Plus, Trash2, Edit3, ChevronDown, X, ListChecks,
} from 'lucide-react'
import clsx from 'clsx'
import { ACTIVITY_TYPES, TYPE_COLORS, fullName } from '../utils/helpers'
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

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Activities() {
  const {
    activities, contacts, companies, properties,
    addActivity, updateActivity, deleteActivity, updateProperty,
  } = useCRM()
  const { user } = useAuth()

  // ─── Filter state ──────────────────────────────────────────────────────────
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

  // When deal is selected: get its contact list for the contact picker
  const selectedDeal    = formDealId ? dealMap[formDealId] : null
  const dealContactObjs = selectedDeal ? contacts.filter(c => (selectedDeal.contactIds || []).includes(c.id)) : null

  // Is the selected contact already in the selected deal's contacts?
  const contactInDeal      = !formContactId || !selectedDeal || (selectedDeal.contactIds || []).includes(formContactId)
  const willAddToDeal      = formContactId && formDealId && !contactInDeal

  // When contact is selected: prioritise their deals in the deal picker
  const contactLinkedDeals = formContactId
    ? properties.filter(p => !p.deletedAt && (p.contactIds || []).includes(formContactId))
    : null

  // ─── Filtered & paginated activities ─────────────────────────────────────
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
    return list
  }, [activities, filterType, filterContactSearch, contactMap])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [filterType, filterContactSearch])

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
    // Require at least a contact or some notes
    if (!formContactId && !formNotes.trim()) return

    // Optionally add contact to deal's contactIds
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
    <div className="p-6 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ListChecks size={20} className="text-slate-400 dark:text-slate-500" />
            Activities
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {activities.length} total · {filtered.length !== activities.length ? `${filtered.length} shown` : 'all shown'}
          </p>
        </div>
        <button onClick={openForm} className="v-btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={14} /> Log Activity
        </button>
      </div>

      {/* ── Log form ── */}
      {showForm && (
        <form onSubmit={submitForm} className="card px-4 py-4 mb-6 space-y-3">
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
              {/* Show auto-resolved company */}
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
              {/* Warn if contact will be added to deal contacts */}
              {willAddToDeal && (
                <p className="text-[10px] text-brand-500 dark:text-brand-400 mt-1">
                  {fullName(selectedContact)} will be added to deal contacts.
                </p>
              )}
              {/* Show deal contacts when deal is selected */}
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

      {/* ── Activity list ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No activities found</p>
          <button onClick={openForm} className="text-xs text-brand-600 dark:text-brand-400 hover:underline mt-1">
            Log first activity
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {paginated.map(a => {
              const Icon       = TYPE_ICONS[a.type] || MessageSquare
              const contact    = a.contactId  ? contactMap[a.contactId]  : null
              const deal       = a.propertyId ? dealMap[a.propertyId]    : null
              // Prefer activity's own companyId, fall back to contact's company
              const company    = a.companyId  ? companyMap[a.companyId]
                               : contact?.companyId ? companyMap[contact.companyId]
                               : null
              const verb       = ACTIVITY_VERBS[a.type] || 'logged'

              return (
                <div key={a.id} className="px-4 py-3 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  {editingId === a.id ? (
                    /* ── Inline edit form ── */
                    <form onSubmit={saveEdit} className="space-y-2">
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
                    /* ── Display row ── */
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[11px] font-bold font-mono text-brand-700 dark:text-brand-300 select-none">{avatarLetter}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Type · Date · Edit/Delete */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Icon size={11} className={TYPE_COLORS[a.type] || 'text-slate-400'} />
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 capitalize">{a.type}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {formatActivityTime(a.date || a.createdAt)}
                          </span>
                          {/* Edit / delete — hover reveal */}
                          <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(a)} className="p-1 text-slate-300 hover:text-brand-500 dark:text-slate-600 dark:hover:text-brand-400 transition-colors">
                              <Edit3 size={11} />
                            </button>
                            <button onClick={() => deleteActivity(a.id)} className="p-1 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* [Actor] [verb] [Contact] */}
                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug mt-0.5">
                          <span className="font-semibold">{actorName}</span>{' '}
                          <span className="text-slate-500 dark:text-slate-400">{verb}</span>{' '}
                          {contact
                            ? <Link to={`/contacts/${contact.id}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">{fullName(contact)}</Link>
                            : <span className="text-slate-400 dark:text-slate-500">—</span>
                          }
                        </p>

                        {/* Company / Deal pills */}
                        {(company || deal) && (
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
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
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic leading-relaxed line-clamp-2">
                            {a.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-surface-50 dark:bg-surface-100">
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
  )
}
