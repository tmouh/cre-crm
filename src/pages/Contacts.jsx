import { useState, useEffect, Component } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Phone, Mail, Linkedin, Building2, MapPin, Trash2, Edit2, ArrowLeft, ExternalLink, Upload, UserCheck, AlertTriangle, Lock, Users, Save, X } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'
import { useIntelligence } from '../hooks/useIntelligence'
import { fullName, initials, formatDate, daysDiff, CONTACT_FUNCTIONS, formatContactFunction } from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import ActivityFeed from '../components/ActivityFeed'
import ReminderList from '../components/ReminderList'
import EmptyState from '../components/EmptyState'
import OutlookMessages from '../components/OutlookMessages'
import OutlookAttachments from '../components/OutlookAttachments'
import PageHeader from '../components/PageHeader'
import CompanyCombobox from '../components/CompanyCombobox'
import ImportModal from '../components/ImportModal'
import OutlookImport from '../components/OutlookImport'
import DuplicateCheckModal from '../components/DuplicateCheckModal'
import DuplicateScanModal from '../components/DuplicateScanModal'
import LinkedInProfile from '../components/LinkedInProfile'
import CommunicationHeatmap from '../components/CommunicationHeatmap'
import { useDuplicates } from '../hooks/useDuplicates'
import { db } from '../lib/supabase'

class LinkedInErrorBoundary extends Component {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) return null
    return this.props.children
  }
}

const BLANK = { firstName: '', lastName: '', title: '', contactFunction: '', companyId: '', email: '', phone: '', mobile: '', linkedIn: '', notes: '', tags: [], ownerIds: [], visibility: 'shared', sharedWith: [], sharedNotes: '', sharedCellPhones: [], sharedPersonalEmails: [] }

export function ContactForm({ initial = BLANK, onSubmit, onCancel, defaultVisibility = 'shared' }) {
  const { addCompany, teamMembers } = useCRM()
  const { user, isAdmin } = useAuth()

  const isNewContact = initial === BLANK
  const isOwner = isNewContact || (initial.ownerIds || []).includes(user?.id)

  const defaultOwnerIds = isNewContact ? (user ? [user.id] : []) : (initial.ownerIds || [])
  const [form, setForm] = useState({
    ...BLANK,
    ...initial,
    ownerIds: defaultOwnerIds,
    visibility: initial.visibility || defaultVisibility,
    sharedWith: initial.sharedWith || [],
    sharedCellPhones: initial.sharedCellPhones || [],
    sharedPersonalEmails: initial.sharedPersonalEmails || [],
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  function toggleOwner(id) {
    setForm(p => ({
      ...p,
      ownerIds: p.ownerIds.includes(id)
        ? p.ownerIds.filter(o => o !== id)
        : [...p.ownerIds, id],
    }))
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

  // Determine whether the owners section is editable
  const ownersEditable = isNewContact || isAdmin

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {saveError && <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 border border-red-200 dark:border-red-800">{saveError}</p>}

      {/* ── Basic info header ── */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="v-label">First name <span className="text-red-500">*</span></label>
          <input value={form.firstName} onChange={f('firstName')} className="v-input" required />
        </div>
        <div>
          <label className="v-label">Last name <span className="text-red-500">*</span></label>
          <input value={form.lastName} onChange={f('lastName')} className="v-input" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="v-label">Title / Role</label>
          <input value={form.title} onChange={f('title')} className="v-input" placeholder="e.g. VP Real Estate" />
        </div>
        <div>
          <label className="v-label">Company</label>
          <CompanyCombobox
            value={form.companyId}
            onChange={(id) => setForm(p => ({ ...p, companyId: id }))}
            onCreateAndSelect={async (name) => {
              const c = await addCompany({ name, type: 'other' })
              setForm(p => ({ ...p, companyId: c.id }))
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="v-label">Email</label>
          <input type="email" value={form.email} onChange={f('email')} className="v-input" placeholder="name@company.com" />
        </div>
        <div>
          <label className="v-label">Phone</label>
          <input value={form.phone} onChange={f('phone')} className="v-input" placeholder="212-555-0100" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="v-label">Mobile</label>
          <input value={form.mobile} onChange={f('mobile')} className="v-input" placeholder="917-555-0100" />
        </div>
        <div>
          <label className="v-label">LinkedIn</label>
          <input value={form.linkedIn} onChange={f('linkedIn')} className="v-input" placeholder="linkedin.com/in/..." />
        </div>
      </div>

      {/* ── 3-column section ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Personal column */}
        <div className="border border-[var(--border)] p-2.5 space-y-2">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono flex items-center gap-1">
            <Lock size={9} /> Personal
          </p>
          <div>
            <label className="v-label">Notes <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500 ml-1">(private to you)</span></label>
            <textarea value={form.notes} onChange={f('notes')} rows={4} className="v-input resize-y" placeholder="Background, preferences, how you met..." />
          </div>
          <div>
            <label className="v-label">Tags</label>
            <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
          </div>
        </div>

        {/* Shared column */}
        <div className={clsx('border p-2.5 space-y-2', form.visibility === 'shared' ? 'border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-900/10' : 'border-[var(--border)] opacity-40')}>
          <p className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide font-mono flex items-center gap-1">
            <Users size={9} /> Shared
          </p>
          {form.visibility === 'shared' ? (
            <>
              <div>
                <label className="v-label">Shared Notes</label>
                <textarea value={form.sharedNotes} onChange={f('sharedNotes')} rows={4} className="v-input resize-y" placeholder="Team-facing notes..." />
              </div>
              <div>
                <label className="v-label">Shared Cell Phone(s)</label>
                <TagInput tags={form.sharedCellPhones || []} onChange={(t) => setForm(p => ({ ...p, sharedCellPhones: t }))} placeholder="Add phone number..." />
              </div>
              <div>
                <label className="v-label">Shared Personal Email(s)</label>
                <TagInput tags={form.sharedPersonalEmails || []} onChange={(t) => setForm(p => ({ ...p, sharedPersonalEmails: t }))} placeholder="Add email address..." />
              </div>
            </>
          ) : (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Set visibility to Shared to enable shared fields.</p>
          )}
        </div>

        {/* Investor column */}
        <div className="border border-[var(--border)] p-2.5 space-y-2">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">Investor</p>
          <div>
            <label className="v-label">Function</label>
            <select value={form.contactFunction || ''} onChange={f('contactFunction')} className="v-select">
              <option value="">— Select —</option>
              {CONTACT_FUNCTIONS.map(fn => <option key={fn} value={fn}>{formatContactFunction(fn)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Owners — directly above Visibility ── */}
      {teamMembers.length > 0 && (
        <div>
          <label className="v-label">Owners</label>
          {ownersEditable ? (
            <div className="border border-[var(--border)] p-1.5 space-y-0.5 max-h-24 overflow-y-auto">
              {teamMembers.map(m => (
                <label key={m.id} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-100 px-1.5 py-0.5">
                  <input
                    type="checkbox"
                    checked={form.ownerIds.includes(m.id)}
                    onChange={() => toggleOwner(m.id)}
                  />
                  <span className="text-slate-700 dark:text-slate-300">{m.displayName || m.email}</span>
                  {m.id === user?.id && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">(you)</span>}
                </label>
              ))}
            </div>
          ) : (
            <div className="border border-[var(--border)] p-1.5 flex flex-wrap gap-1.5">
              {(form.ownerIds || []).map(id => {
                const m = teamMembers.find(t => t.id === id)
                return m ? (
                  <span key={id} className="text-[11px] text-slate-600 dark:text-slate-300 bg-surface-100 dark:bg-surface-200 px-2 py-0.5 border border-[var(--border)]">
                    {m.displayName || m.email}{m.id === user?.id ? ' (you)' : ''}
                  </span>
                ) : null
              })}
              {form.ownerIds.length === 0 && <span className="text-[10px] text-slate-400 dark:text-slate-500">No owners assigned</span>}
            </div>
          )}
          {!ownersEditable && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Only admins can change owners after a contact is created.</p>}
        </div>
      )}

      {/* ── Visibility — only for owners ── */}
      {isOwner && (
        <div>
          <label className="v-label">Visibility</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, visibility: 'private' }))}
              className={clsx('flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium border transition-colors',
                form.visibility === 'private'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-600'
                  : 'border-[var(--border)] text-slate-500 hover:border-slate-400 dark:text-slate-400'
              )}
            >
              <Lock size={11} /> Personal (private)
            </button>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, visibility: 'shared' }))}
              className={clsx('flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium border transition-colors',
                form.visibility === 'shared'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-600'
                  : 'border-[var(--border)] text-slate-500 hover:border-slate-400 dark:text-slate-400'
              )}
            >
              <Users size={11} /> Shared (CRM)
            </button>
          </div>
          {form.visibility === 'private' && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Only visible to you (and other owners listed above).</p>}
          {form.visibility === 'shared' && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Visible in the shared CRM. Appears in your Personal list too.</p>}
        </div>
      )}

      {/* ── Share with — only for owners when visibility=shared ── */}
      {isOwner && form.visibility === 'shared' && teamMembers.length > 0 && (
        <div>
          <label className="v-label">Share with (leave blank for all team members)</label>
          <div className="border border-[var(--border)] p-1.5 space-y-0.5 max-h-24 overflow-y-auto">
            {teamMembers.map(m => (
              <label key={m.id} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-100 px-1.5 py-0.5">
                <input
                  type="checkbox"
                  checked={form.sharedWith.length === 0 || form.sharedWith.includes(m.id)}
                  onChange={() => {
                    setForm(p => {
                      if (p.sharedWith.length === 0) {
                        return { ...p, sharedWith: teamMembers.filter(tm => tm.id !== m.id).map(tm => tm.id) }
                      }
                      const next = p.sharedWith.includes(m.id)
                        ? p.sharedWith.filter(id => id !== m.id)
                        : [...p.sharedWith, m.id]
                      return { ...p, sharedWith: next.length === teamMembers.length ? [] : next }
                    })
                  }}
                />
                <span className="text-slate-700 dark:text-slate-300">{m.displayName || m.email}</span>
                {m.id === user?.id && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">(you)</span>}
              </label>
            ))}
          </div>
          {form.sharedWith.length === 0 && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">All team members can see this contact.</p>}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="v-btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving…' : 'Save Contact'}</button>
        <button type="button" onClick={onCancel} disabled={saving} className="v-btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

// ── Detail ──
export function ContactDetail({ backTo }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { getContact, getCompany, updateContact, deleteContact, properties, reminders, activities, teamMembers } = useCRM()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [privateData, setPrivateData] = useState(null)
  const [editingPrivate, setEditingPrivate] = useState(false)
  const [privateForm, setPrivateForm] = useState({ privateNotes: '', privateCellPhones: [], privatePersonalEmails: [] })
  const [savingPrivate, setSavingPrivate] = useState(false)

  // Determine back link: use explicit backTo prop, else detect from current path
  const resolvedBackTo = backTo || (location.pathname.startsWith('/personal/') ? '/personal/contacts' : '/contacts')

  const contact = getContact(id)

  // Fetch per-user private data when viewing a shared contact
  useEffect(() => {
    if (contact?.visibility === 'shared' && user) {
      db.contactPrivateData.forUser(contact.id, user.id).then(d => {
        setPrivateData(d)
        if (d) setPrivateForm({ privateNotes: d.privateNotes || '', privateCellPhones: d.privateCellPhones || [], privatePersonalEmails: d.privatePersonalEmails || [] })
      }).catch(() => {})
    }
  }, [contact?.id, contact?.visibility, user])

  if (!contact) return <div className="p-4 text-slate-400 dark:text-slate-500 font-mono text-[11px]">CONTACT NOT FOUND</div>

  const company = getCompany(contact.companyId)
  const relatedProps = properties.filter(p => p.contactIds?.includes(id))

  const lastTouchItems = [
    ...activities.filter(a => a.contactId === id).map(a => ({ date: a.date || a.createdAt, type: a.type })),
    ...reminders.filter(r => r.contactId === id && r.status === 'done').map(r => ({ date: r.completedAt || r.dueDate, type: r.type })),
  ].filter(i => i.date).sort((a, b) => b.date.localeCompare(a.date))
  const lastTouchType = lastTouchItems[0]?.type || null
  const owners = (contact.ownerIds || [])
    .map(oid => teamMembers.find(m => m.id === oid))
    .filter(Boolean)

  async function handleUpdate(form) {
    await updateContact(id, form)
    setEditing(false)
  }

  async function handlePrivateSave() {
    if (!user) return
    setSavingPrivate(true)
    try {
      const saved = await db.contactPrivateData.upsert(contact.id, user.id, privateForm)
      setPrivateData(saved)
      setEditingPrivate(false)
    } catch (err) {
      console.error('Failed to save private data:', err)
    } finally {
      setSavingPrivate(false)
    }
  }

  async function handleDelete() {
    if (confirm(`Delete ${fullName(contact)}? This cannot be undone.`)) {
      await deleteContact(id)
      navigate(resolvedBackTo)
    }
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* ─ Contact command header ─ */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-surface-0 flex-shrink-0">
        <Link to={resolvedBackTo} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <ArrowLeft size={14} />
        </Link>
        <div className="w-8 h-8 bg-brand-600 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-white font-mono">{initials(contact)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{fullName(contact)}</h2>
          <div className="flex items-center gap-2">
            {contact.title && <span className="text-[10px] text-slate-500 dark:text-slate-400">{contact.title}</span>}
            {company && (
              <>
                <span className="text-slate-300 dark:text-slate-600 text-[10px]">·</span>
                <Link to={`/companies/${company.id}`} className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline">{company.name}</Link>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="v-btn-ghost p-1.5"><Edit2 size={13} /></button>
          <button onClick={handleDelete} className="v-btn-ghost p-1.5 hover:text-red-500"><Trash2 size={13} /></button>
        </div>
      </div>

      {/* ─ Two-zone workspace ─ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: profile + intel */}
        <div className="w-[280px] flex-shrink-0 border-r border-[var(--border)] overflow-auto bg-surface-0">
          {/* Contact info */}
          <div className="px-3 py-3 border-b border-[var(--border-subtle)] dark:border-[var(--border)] space-y-1.5">
            {contact.contactFunction && (
              <span className={clsx('v-badge', contact.contactFunction === 'lp-investor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                {formatContactFunction(contact.contactFunction)}
              </span>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                <Mail size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> <span className="truncate">{contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                <Phone size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> {contact.phone}
              </a>
            )}
            {contact.mobile && (
              <a href={`tel:${contact.mobile}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                <Phone size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> {contact.mobile} <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">MOB</span>
              </a>
            )}
            {contact.linkedIn && (
              <a href={`https://${contact.linkedIn}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                <Linkedin size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> LinkedIn <ExternalLink size={9} className="text-slate-400" />
              </a>
            )}
          </div>

          {/* Metadata */}
          <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)] space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500 font-mono">LAST CONTACTED</span>
              <span className="text-slate-600 dark:text-slate-300 font-mono">{formatDate(contact.lastContacted)}{lastTouchType && ` · ${lastTouchType}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 dark:text-slate-500 font-mono">ADDED</span>
              <span className="text-slate-600 dark:text-slate-300 font-mono">{formatDate(contact.createdAt)}</span>
            </div>
          </div>

          {/* Owners */}
          {owners.length > 0 && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase">Owners</p>
              <div className="space-y-0.5">
                {owners.map(m => (
                  <div key={m.id} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-brand-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-white font-mono">{m.email[0].toUpperCase()}</span>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">{m.displayName || m.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {contact.tags?.length > 0 && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <div className="flex flex-wrap gap-1">
                {contact.tags.map(t => (
                  <span key={t} className="v-badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes (private to you for shared contacts, just notes for private contacts) */}
          {contact.notes && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase">
                Notes {contact.visibility === 'shared' && <span className="text-[9px] font-normal text-slate-400 ml-1">(private)</span>}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
            </div>
          )}

          {/* Shared fields — only for shared contacts */}
          {contact.visibility === 'shared' && (contact.sharedNotes || contact.sharedCellPhones?.length > 0 || contact.sharedPersonalEmails?.length > 0) && (
            <div className="px-3 py-2 border-b border-brand-200/60 dark:border-brand-800/60 bg-brand-50/30 dark:bg-brand-900/10 space-y-1.5">
              <p className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 mb-1 font-mono uppercase flex items-center gap-1"><Users size={9} /> Shared Fields</p>
              {contact.sharedNotes && (
                <div>
                  <p className="text-[9px] text-brand-500 dark:text-brand-500 font-mono uppercase mb-0.5">Notes</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{contact.sharedNotes}</p>
                </div>
              )}
              {contact.sharedCellPhones?.length > 0 && (
                <div>
                  <p className="text-[9px] text-brand-500 dark:text-brand-500 font-mono uppercase mb-0.5">Cell Phones</p>
                  <div className="space-y-0.5">
                    {contact.sharedCellPhones.map((ph, i) => (
                      <a key={i} href={`tel:${ph}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400">
                        <Phone size={11} className="text-brand-400 flex-shrink-0" /> {ph}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {contact.sharedPersonalEmails?.length > 0 && (
                <div>
                  <p className="text-[9px] text-brand-500 dark:text-brand-500 font-mono uppercase mb-0.5">Personal Emails</p>
                  <div className="space-y-0.5">
                    {contact.sharedPersonalEmails.map((em, i) => (
                      <a key={i} href={`mailto:${em}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 truncate">
                        <Mail size={11} className="text-brand-400 flex-shrink-0" /> <span className="truncate">{em}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Your private fields — only for shared contacts */}
          {contact.visibility === 'shared' && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 font-mono uppercase flex items-center gap-1"><Lock size={9} /> Your Private Notes</p>
                {!editingPrivate && (
                  <button onClick={() => { setEditingPrivate(true); setPrivateForm({ privateNotes: privateData?.privateNotes || '', privateCellPhones: privateData?.privateCellPhones || [], privatePersonalEmails: privateData?.privatePersonalEmails || [] }) }}
                    className="text-[9px] text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400">Edit</button>
                )}
              </div>
              {editingPrivate ? (
                <div className="space-y-2">
                  <textarea
                    value={privateForm.privateNotes}
                    onChange={e => setPrivateForm(p => ({ ...p, privateNotes: e.target.value }))}
                    rows={2} className="v-input resize-y text-[11px]" placeholder="Private notes (only you see this)..."
                  />
                  <div>
                    <label className="v-label">Private Cell Phones</label>
                    <TagInput tags={privateForm.privateCellPhones} onChange={t => setPrivateForm(p => ({ ...p, privateCellPhones: t }))} placeholder="Add phone..." />
                  </div>
                  <div>
                    <label className="v-label">Private Personal Emails</label>
                    <TagInput tags={privateForm.privatePersonalEmails} onChange={t => setPrivateForm(p => ({ ...p, privatePersonalEmails: t }))} placeholder="Add email..." />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={handlePrivateSave} disabled={savingPrivate} className="v-btn-primary text-[10px] flex-1 disabled:opacity-60">
                      <Save size={10} /> {savingPrivate ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingPrivate(false)} className="v-btn-secondary text-[10px]"><X size={10} /></button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {(privateData?.privateNotes || privateData?.privateCellPhones?.length > 0 || privateData?.privatePersonalEmails?.length > 0) ? (
                    <>
                      {privateData.privateNotes && <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{privateData.privateNotes}</p>}
                      {privateData.privateCellPhones?.map((ph, i) => (
                        <a key={i} href={`tel:${ph}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400">
                          <Phone size={11} className="text-slate-400 flex-shrink-0" /> {ph} <span className="text-[9px] text-slate-400 font-mono">CELL</span>
                        </a>
                      ))}
                      {privateData.privatePersonalEmails?.map((em, i) => (
                        <a key={i} href={`mailto:${em}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 truncate">
                          <Mail size={11} className="text-slate-400 flex-shrink-0" /> <span className="truncate">{em}</span>
                        </a>
                      ))}
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">No private notes yet. Click Edit to add.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Visibility badge */}
          {contact.visibility === 'private' && (
            <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <span className="v-badge bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 flex items-center gap-1 w-fit"><Lock size={9} /> Private</span>
            </div>
          )}

          {/* Related deals */}
          {relatedProps.length > 0 && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase">Deals</p>
              <div className="space-y-1">
                {relatedProps.map(p => (
                  <Link key={p.id} to={`/deals/${p.id}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                    <MapPin size={11} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* LinkedIn enrichment */}
          <LinkedInErrorBoundary key={contact.id}>
            <LinkedInProfile contact={contact} />
          </LinkedInErrorBoundary>
        </div>

        {/* Right: activity + comms workspace */}
        <div className="flex-1 overflow-auto bg-surface-50">
          <div className="p-4 space-y-3">
            <CommunicationHeatmap contactId={id} />
            <ReminderList contactId={id} />
            <ActivityFeed contactId={id} />
            <OutlookMessages email={contact.email} contactId={id} />
            <OutlookAttachments email={contact.email} />
          </div>
        </div>
      </div>

      {editing && (
        <Modal title={`Edit ${fullName(contact)}`} onClose={() => setEditing(false)} size="lg" disableBackdropClose>
          <ContactForm initial={contact} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  )
}

// ── List ──
export default function Contacts() {
  const { id } = useParams()
  if (id) return <ContactDetail />

  const { sharedContacts: contacts, companies, addContact, updateContact, getCompany, teamMembers } = useCRM()
  const { isAdmin } = useAuth()
  const { contactHealth } = useIntelligence()
  const { contactDuplicates } = useDuplicates()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showOutlookImport, setShowOutlookImport] = useState(false)
  const [showDupScan, setShowDupScan] = useState(false)
  const [filterCompany, setFilterCompany] = useState('')
  const [filterOwner, setFilterOwner] = useState('')
  const [filterFunction, setFilterFunction] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [dupCheck, setDupCheck] = useState(null)

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'lastTouch' || field === 'dateAdded' ? 'desc' : 'asc') }
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matches = !q || fullName(c).toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q) || (c.tags || []).some(t => t.toLowerCase().includes(q))
    const comp = !filterCompany || c.companyId === filterCompany
    const owner = !filterOwner || (c.ownerIds || []).includes(filterOwner)
    const fn = !filterFunction || c.contactFunction === filterFunction
    return matches && comp && owner && fn
  }).sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'name': cmp = fullName(a).localeCompare(fullName(b)); break
      case 'company': {
        const ca = getCompany(a.companyId)?.name || ''
        const cb = getCompany(b.companyId)?.name || ''
        cmp = ca.localeCompare(cb) || fullName(a).localeCompare(fullName(b)); break
      }
      case 'title': cmp = (a.title || '').localeCompare(b.title || ''); break
      case 'function': cmp = (a.contactFunction || '').localeCompare(b.contactFunction || ''); break
      case 'lastTouch': {
        const da = a.lastContacted || '', db = b.lastContacted || ''
        if (!da && !db) cmp = 0; else if (!da) cmp = 1; else if (!db) cmp = -1; else cmp = da.localeCompare(db); break
      }
      case 'dateAdded': cmp = (a.createdAt || '').localeCompare(b.createdAt || ''); break
      default: cmp = 0
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  async function handleAdd(form) {
    const dup = contacts.find(c =>
      ((c.firstName || '').toLowerCase() === form.firstName.toLowerCase() && (c.lastName || '').toLowerCase() === form.lastName.toLowerCase()) ||
      (form.email && c.email && c.email.toLowerCase() === form.email.toLowerCase())
    )
    if (dup) {
      setDupCheck({ newData: form, existing: dup })
    } else {
      await addContact(form)
      setShowAdd(false)
    }
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* ─ Toolbar ─ */}
      <div className="os-toolbar flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="v-input pl-7 text-[11px]" />
        </div>
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="v-select w-36 text-[11px]">
          <option value="">All companies</option>
          {[...companies].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className="v-select w-32 text-[11px]">
          <option value="">All owners</option>
          {[...teamMembers].sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email)).map(m => (
            <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
          ))}
        </select>
        <select value={filterFunction} onChange={e => setFilterFunction(e.target.value)} className="v-select w-32 text-[11px]">
          <option value="">All functions</option>
          {CONTACT_FUNCTIONS.map(fn => <option key={fn} value={fn}>{formatContactFunction(fn)}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">{filtered.length} / {contacts.length} shared</span>
        <div className="flex gap-1">
          <button onClick={() => setShowImport(true)} className="v-btn-secondary text-[10px]"><Upload size={11} /> CSV</button>
          {contactDuplicates.length > 0 && (
            <button onClick={() => setShowDupScan(true)} className="v-btn-secondary text-[10px] relative">
              <AlertTriangle size={11} className="text-amber-500" />
              Dups
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold font-mono flex items-center justify-center">
                {contactDuplicates.length}
              </span>
            </button>
          )}
          <button onClick={() => setShowOutlookImport(true)} className="v-btn-secondary text-[10px]">
            <svg viewBox="0 0 21 21" className="w-3 h-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Outlook
          </button>
          <button onClick={() => setShowAdd(true)} className="v-btn-primary text-[10px]"><Plus size={11} /> NEW</button>
        </div>
      </div>

      {/* ─ Table ─ */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState icon={Search} title="No contacts found" description="Add your first contact to get started." action={<button onClick={() => setShowAdd(true)} className="v-btn-primary"><Plus size={12} /> Add Contact</button>} />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="v-table">
            <thead className="sticky top-0 z-10">
              <tr>
                {[
                  { field: 'name', label: 'Name' },
                  { field: 'company', label: 'Company' },
                  { field: 'title', label: 'Title' },
                  { field: 'function', label: 'Function' },
                  { field: null, label: 'Contact' },
                  { field: null, label: 'Health' },
                  { field: 'lastTouch', label: 'Last Touch' },
                  { field: null, label: 'Owners' },
                  { field: null, label: 'Tags' },
                ].map(({ field, label }) => (
                  <th key={label}
                    onClick={field ? () => handleSort(field) : undefined}
                    className={clsx(field && 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200')}>
                    {label} {sortField === field && <span className="text-brand-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const company = getCompany(c.companyId)
                const stale = c.lastContacted && daysDiff(c.lastContacted) >= 90
                const ch = contactHealth.find(h => h.id === c.id)
                const healthScore = ch?.healthScore ?? 0
                const healthLbl = ch?.healthLabel || 'cold'
                const owners = (c.ownerIds || [])
                  .map(oid => teamMembers.find(m => m.id === oid))
                  .filter(Boolean)
                return (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/contacts/${c.id}`} className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-brand-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-white font-mono">{initials(c)}</span>
                        </div>
                        <span className="text-[12px] font-medium text-slate-800 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400">{fullName(c)}</span>
                      </Link>
                    </td>
                    <td>
                      {company ? (
                        <Link to={`/companies/${company.id}`} className="text-[12px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">{company.name}</Link>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td>
                      <span className="text-[12px] text-slate-600 dark:text-slate-400">{c.title || '—'}</span>
                    </td>
                    <td>
                      {c.contactFunction ? (
                        <span className={clsx('v-badge', c.contactFunction === 'lp-investor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                          {formatContactFunction(c.contactFunction)}
                        </span>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        {c.email && <a href={`mailto:${c.email}`} className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"><Mail size={12} /></a>}
                        {(c.phone || c.mobile) && <a href={`tel:${c.phone || c.mobile}`} className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"><Phone size={12} /></a>}
                        {c.linkedIn && <a href={`https://${c.linkedIn}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"><Linkedin size={12} /></a>}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <div className="w-7 h-1 bg-surface-200 overflow-hidden">
                          <div
                            className={clsx('h-full', healthLbl === 'strong' ? 'bg-emerald-500' : healthLbl === 'healthy' ? 'bg-blue-500' : healthLbl === 'cooling' ? 'bg-amber-500' : 'bg-red-500')}
                            style={{ width: `${healthScore}%` }}
                          />
                        </div>
                        <span className={clsx('text-[10px] font-mono tabular-nums', healthLbl === 'strong' ? 'text-emerald-600 dark:text-emerald-400' : healthLbl === 'healthy' ? 'text-blue-600 dark:text-blue-400' : healthLbl === 'cooling' ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400')}>
                          {healthScore}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={clsx('text-[11px] font-mono tabular-nums', stale ? 'text-red-500 font-medium' : 'text-slate-400 dark:text-slate-500')}>
                        {c.lastContacted ? formatDate(c.lastContacted) : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-0.5">
                        {owners.slice(0, 3).map(m => (
                          <div key={m.id} title={m.displayName || m.email} className="w-5 h-5 bg-brand-600 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white font-mono">{m.email[0].toUpperCase()}</span>
                          </div>
                        ))}
                        {owners.length === 0 && <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-0.5">
                        {(c.tags || []).slice(0, 3).map(t => <span key={t} className="v-badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{t}</span>)}
                        {(c.tags || []).length > 3 && <span className="v-badge bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">+{c.tags.length - 3}</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─ Status bar ─ */}
      <div className="os-status-bar flex-shrink-0">
        <span>{filtered.length} contacts</span>
        {filterCompany && <span>filtered by company</span>}
        {filterOwner && <span>filtered by owner</span>}
        {filterFunction && <span>filtered by function</span>}
      </div>

      {showAdd && (
        <Modal title="Add Contact" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <ContactForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {dupCheck && (
        <DuplicateCheckModal
          entityType="contact"
          matchFields={[
            { label: 'First Name', existingVal: dupCheck.existing.firstName, newVal: dupCheck.newData.firstName },
            { label: 'Last Name', existingVal: dupCheck.existing.lastName, newVal: dupCheck.newData.lastName },
            { label: 'Title', existingVal: dupCheck.existing.title, newVal: dupCheck.newData.title },
            { label: 'Email', existingVal: dupCheck.existing.email, newVal: dupCheck.newData.email },
            { label: 'Phone', existingVal: dupCheck.existing.phone, newVal: dupCheck.newData.phone },
            { label: 'Mobile', existingVal: dupCheck.existing.mobile, newVal: dupCheck.newData.mobile },
            { label: 'Company', existingVal: getCompany(dupCheck.existing.companyId)?.name, newVal: getCompany(dupCheck.newData.companyId)?.name },
          ]}
          onAdd={async () => {
            await addContact(dupCheck.newData)
            setDupCheck(null)
            setShowAdd(false)
          }}
          onMerge={async () => {
            const merged = {}
            for (const [k, v] of Object.entries(dupCheck.newData)) {
              if (k === 'tags' || k === 'ownerIds') continue
              if (v && !dupCheck.existing[k]) merged[k] = v
            }
            if (dupCheck.newData.tags?.length) {
              merged.tags = [...new Set([...(dupCheck.existing.tags || []), ...dupCheck.newData.tags])]
            }
            // Only admins can add new owners via merge; non-admins preserve existing owners
            if (isAdmin && dupCheck.newData.ownerIds?.length) {
              merged.ownerIds = [...new Set([...(dupCheck.existing.ownerIds || []), ...dupCheck.newData.ownerIds])]
            }
            await updateContact(dupCheck.existing.id, merged)
            setDupCheck(null)
            setShowAdd(false)
          }}
          onCancel={() => setDupCheck(null)}
        />
      )}

      {showImport && (
        <ImportModal entity="contacts" onClose={() => setShowImport(false)} />
      )}

      {showOutlookImport && (
        <OutlookImport onClose={() => setShowOutlookImport(false)} />
      )}

      {showDupScan && (
        <DuplicateScanModal
          entityType="contact"
          pairs={contactDuplicates}
          onClose={() => setShowDupScan(false)}
        />
      )}
    </div>
  )
}
