import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone, Mail, Users, FileText, Building2, Map, MessageSquare,
  Plus, Trash2, Edit3, Clock, ChevronDown, X,
} from 'lucide-react'
import clsx from 'clsx'
import { formatDateTime, ACTIVITY_TYPES, TYPE_COLORS, fullName } from '../utils/helpers'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'
import DealActivityItem from './DealActivityItem'

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
  other:    'logged activity on',
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

function formatActivityTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${dateStr} · ${timeStr}`
}

// ─── Contact Combobox ────────────────────────────────────────────────────────

function ContactCombobox({ dealContacts, allContacts, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref = useRef(null)

  const selected = value ? allContacts.find(c => c.id === value) : null

  // Close on outside click
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

  const dealFiltered  = filtered.filter(c => dealContactIds.has(c.id))
  const otherFiltered = filtered.filter(c => !dealContactIds.has(c.id))

  function select(contact) {
    onChange(contact.id)
    setQuery('')
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={clsx(
          'v-input flex items-center gap-1.5 cursor-pointer min-h-[30px] py-1',
          open && 'ring-1 ring-brand-400'
        )}
        onClick={() => setOpen(v => !v)}
      >
        {selected ? (
          <>
            <span className="flex-1 text-xs text-slate-800 dark:text-slate-200 truncate">{fullName(selected)}</span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); clear() }}
              className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
            >
              <X size={11} />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-xs text-slate-400 dark:text-slate-500">Select contact…</span>
            <ChevronDown size={11} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
          </>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 border border-[var(--border)] bg-white dark:bg-surface-100 shadow-lg max-h-52 overflow-auto">
          {/* Search */}
          <div className="px-2 py-1.5 border-b border-[var(--border)] sticky top-0 bg-white dark:bg-surface-100">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search contacts…"
              className="w-full text-xs outline-none bg-transparent text-slate-700 dark:text-slate-300 placeholder-slate-400"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">No contacts found</p>
          )}

          {/* Deal contacts section */}
          {dealFiltered.length > 0 && (
            <>
              <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono bg-surface-50 dark:bg-surface-0">
                Deal Contacts
              </p>
              {dealFiltered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c)}
                  className={clsx(
                    'w-full text-left px-3 py-1.5 text-xs transition-colors',
                    value === c.id
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-200'
                  )}
                >
                  {fullName(c)}
                  {c.title && <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-[10px]">{c.title}</span>}
                </button>
              ))}
            </>
          )}

          {/* Other contacts section */}
          {otherFiltered.length > 0 && (
            <>
              {dealFiltered.length > 0 && (
                <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono bg-surface-50 dark:bg-surface-0 border-t border-[var(--border)]">
                  All Contacts
                </p>
              )}
              {otherFiltered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c)}
                  className={clsx(
                    'w-full text-left px-3 py-1.5 text-xs transition-colors',
                    value === c.id
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-200'
                  )}
                >
                  {fullName(c)}
                  {c.title && <span className="text-slate-400 dark:text-slate-500 ml-1.5 text-[10px]">{c.title}</span>}
                  {!dealContactIds.has(c.id) && dealContacts && (
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

// ─── Main component ──────────────────────────────────────────────────────────

export default function ActivityFeed({
  contactId, companyId, propertyId,
  // Deal-specific: pass to enable contact picker + inline deal-contact adding
  dealContacts,       // Contact[] — current deal contacts
  onAddDealContact,   // (contactId: string) => void — adds contact to deal
}) {
  const { activitiesFor, dealActivitiesFor, addActivity, updateActivity, deleteActivity, contacts } = useCRM()
  const { user } = useAuth()

  const [showForm,      setShowForm]      = useState(false)
  const [type,          setType]          = useState('call')
  const [text,          setText]          = useState('')
  const [activityDate,  setActivityDate]  = useState('')
  const [activityTime,  setActivityTime]  = useState('')
  const [formContactId, setFormContactId] = useState(null)   // for deal context

  const [editingId,  setEditingId]  = useState(null)
  const [editForm,   setEditForm]   = useState({ type: '', description: '', date: '', time: '' })

  // Actor display
  const actorName    = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'You'
  const avatarLetter = (actorName[0] || 'U').toUpperCase()

  const isDealContext = !!propertyId && !!dealContacts

  const field       = contactId ? 'contactId' : companyId ? 'companyId' : 'propertyId'
  const id          = contactId || companyId || propertyId
  const manualItems = activitiesFor(field, id)
  const dealItems   = dealActivitiesFor(field, id)
  const reviewCount = dealItems.filter(d => d.status === 'needs_review').length

  const mergedItems = [
    ...manualItems.map(a => ({ ...a, _kind: 'manual', _sortKey: a.date || a.createdAt || '' })),
    ...dealItems.map(d => ({ ...d, _kind: 'deal',   _sortKey: d.lastMessageAt || d.createdAt || '' })),
  ].sort((a, b) => b._sortKey.localeCompare(a._sortKey))

  function openForm() {
    setActivityDate(new Date().toISOString().slice(0, 10))
    setActivityTime(new Date().toTimeString().slice(0, 5))
    setFormContactId(null)
    setShowForm(v => !v)
  }

  async function submit(e) {
    e.preventDefault()
    // In deal context: require at least a contact OR a description
    if (isDealContext && !formContactId && !text.trim()) return
    // Otherwise require description
    if (!isDealContext && !text.trim()) return

    // If a non-deal contact was picked, add them to deal contacts first
    const dealContactIds = new Set((dealContacts || []).map(c => c.id))
    if (formContactId && onAddDealContact && !dealContactIds.has(formContactId)) {
      await onAddDealContact(formContactId).catch(() => {})
    }

    await addActivity({
      type,
      description: text.trim() || null,
      contactId: formContactId || contactId,
      companyId,
      propertyId,
      date: activityDate
        ? new Date(activityDate + 'T' + (activityTime || '12:00') + ':00').toISOString()
        : new Date().toISOString(),
    })

    setText('')
    setType('call')
    setFormContactId(null)
    setActivityDate(new Date().toISOString().slice(0, 10))
    setActivityTime(new Date().toTimeString().slice(0, 5))
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

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="os-zone-header">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-slate-400 dark:text-slate-500" />
          <span className="os-zone-title">Activity Log</span>
          {(manualItems.length > 0 || dealItems.length > 0) && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              {manualItems.length} logged
              {dealItems.length > 0 ? ` · ${dealItems.length} thread${dealItems.length !== 1 ? 's' : ''}` : ''}
            </span>
          )}
          {reviewCount > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 font-medium">
              {reviewCount} to review
            </span>
          )}
        </div>
        <button
          onClick={openForm}
          className={clsx('p-1 transition-colors', showForm
            ? 'text-brand-600 dark:text-brand-400'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300')}
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <form onSubmit={submit} className="px-3 py-3 bg-surface-50 dark:bg-surface-100 border-b border-[var(--border)] space-y-2.5">
          {/* Type pills */}
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_TYPES.map(t => {
              const Icon = TYPE_ICONS[t] || MessageSquare
              return (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={clsx('flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors',
                    type === t
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 ring-1 ring-brand-200 dark:ring-brand-700'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  )}>
                  <Icon size={11} /> {capitalize(t)}
                </button>
              )
            })}
          </div>

          {/* Contact picker — only in deal context */}
          {isDealContext && (
            <div>
              <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                Contact
              </label>
              <ContactCombobox
                dealContacts={dealContacts}
                allContacts={contacts}
                value={formContactId}
                onChange={setFormContactId}
              />
              {formContactId && onAddDealContact && !new Set((dealContacts || []).map(c => c.id)).has(formContactId) && (
                <p className="text-[10px] text-brand-500 dark:text-brand-400 mt-1">
                  This contact will be added to Deal Contacts on save.
                </p>
              )}
            </div>
          )}

          {/* Notes (optional) */}
          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
              Notes <span className="normal-case text-slate-400">(optional)</span>
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What happened?"
              rows={2}
              className="v-input text-sm resize-y"
            />
          </div>

          {/* Date / time */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={activityDate}
              onChange={e => setActivityDate(e.target.value)}
              className="v-input text-xs py-1.5 w-36"
            />
            <input
              type="time"
              value={activityTime}
              onChange={e => setActivityTime(e.target.value)}
              className="v-input text-xs py-1.5 w-28"
            />
            <div className="flex-1" />
            <button type="submit" className="v-btn-primary text-xs py-1.5">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="v-btn-secondary text-xs py-1.5">Cancel</button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {manualItems.length === 0 && dealItems.length === 0 && !showForm && (
        <div className="px-5 py-8 text-center">
          <MessageSquare size={22} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No activity logged yet</p>
          <button onClick={openForm} className="text-xs text-brand-600 dark:text-brand-400 hover:underline mt-1">
            Log first activity
          </button>
        </div>
      )}

      {/* Timeline */}
      {mergedItems.length > 0 && (
        <div className="px-3 py-3 space-y-1.5">
          {mergedItems.map((item, i) => {
            // Deal activity thread (email threads from the smart layer)
            if (item._kind === 'deal') {
              return <DealActivityItem key={`da-${item.id}`} da={item} />
            }

            // Manual activity
            const a = item
            const Icon        = TYPE_ICONS[a.type] || MessageSquare
            const verb        = ACTIVITY_VERBS[a.type] || 'logged'
            const contactObj  = a.contactId ? contacts.find(c => c.id === a.contactId) : null

            return (
              <div key={a.id} className="flex gap-3 group relative">
                {/* Connector line to next manual item */}
                {i < mergedItems.length - 1 && mergedItems[i + 1]?._kind === 'manual' && (
                  <div className="absolute left-[13px] top-8 bottom-0 w-px bg-slate-100 dark:bg-slate-700/60" />
                )}

                {/* Avatar circle */}
                <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0 mt-0.5 relative z-10 flex-shrink-0">
                  <span className="text-[11px] font-bold font-mono text-brand-700 dark:text-brand-300 select-none">{avatarLetter}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-3">
                  {editingId === a.id ? (
                    /* ── Inline edit form ── */
                    <form onSubmit={saveEdit} className="bg-brand-50/30 dark:bg-brand-900/10 p-3 space-y-2 border border-brand-100 dark:border-brand-900/30">
                      <div className="flex gap-2 flex-wrap">
                        <select
                          value={editForm.type}
                          onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                          className="v-input text-xs py-1.5 flex-1 min-w-[100px]"
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
                    /* ── Display card ── */
                    <>
                      {/* Type · Date · Time */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon size={10} className={clsx(TYPE_COLORS[a.type] || 'text-slate-400')} />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono capitalize">
                          {a.type} · {formatActivityTime(a.date || a.createdAt)}
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
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                        <span className="font-semibold">{actorName}</span>{' '}
                        <span className="text-slate-500 dark:text-slate-400">{verb}</span>{' '}
                        {contactObj
                          ? <Link to={`/contacts/${contactObj.id}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">{fullName(contactObj)}</Link>
                          : <span className="text-slate-400 dark:text-slate-500">—</span>
                        }
                      </p>

                      {/* Notes (if any) */}
                      {a.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic leading-relaxed line-clamp-3">
                          {a.description}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
