import { useState, useEffect, useCallback, useRef, Component } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Phone, Mail, Linkedin, Building2, MapPin, Trash2, Edit2, ArrowLeft, ExternalLink, Upload, UserCheck, AlertTriangle, Lock, Users, Save, X, CheckSquare, Share2, ArrowLeftRight, ArrowUp, ArrowDown, Globe, Cake, Calendar } from 'lucide-react'
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
import ShareModal from '../components/ShareModal'
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

const BLANK = { firstName: '', lastName: '', middleName: '', suffix: '', nickname: '', title: '', contactFunction: '', companyId: '', linkedIn: '', webPage: '', birthday: '', anniversary: '', notes: '', tags: [], ownerIds: [], visibility: 'shared', sharedWith: [], sharedNotes: '', sharedCellPhones: [], sharedEmails: [], personalPhones: [], personalEmails: [], email: '', email2: '', email3: '', phone: '', mobile: '', homePhone: '', homePhone2: '', businessPhone2: '', carPhone: '', otherPhone: '', primaryPhone: '', pager: '', businessFax: '', homeFax: '', otherFax: '', companyMainPhone: '', businessStreet: '', businessCity: '', businessState: '', businessPostalCode: '', businessCountry: '', homeStreet: '', homeCity: '', homeState: '', homePostalCode: '', homeCountry: '', otherStreet: '', otherCity: '', otherState: '', otherPostalCode: '', otherCountry: '', phoneAssignments: {} }

// All named field labels — emails, phones, fax
const ALL_EMAIL_FIELDS = [
  { key: 'email',  label: 'Email' },
  { key: 'email2', label: 'Email 2' },
  { key: 'email3', label: 'Email 3' },
]
const ALL_PHONE_FIELDS = [
  { key: 'phone',            label: 'Business Phone' },
  { key: 'mobile',           label: 'Mobile Phone' },
  { key: 'homePhone',        label: 'Home Phone' },
  { key: 'homePhone2',       label: 'Home Phone 2' },
  { key: 'businessPhone2',   label: 'Business Phone 2' },
  { key: 'carPhone',         label: 'Car Phone' },
  { key: 'otherPhone',       label: 'Other Phone' },
  { key: 'primaryPhone',     label: 'Primary Phone' },
  { key: 'pager',            label: 'Pager' },
  { key: 'companyMainPhone', label: 'Company Main' },
]
const ALL_FAX_FIELDS = [
  { key: 'businessFax', label: 'Business Fax' },
  { key: 'homeFax',     label: 'Home Fax' },
  { key: 'otherFax',    label: 'Other Fax' },
]
const DEFAULT_FIELD_ASSIGNMENTS = {
  email: 'personal', email2: 'personal', email3: 'personal',
  phone: 'personal', mobile: 'personal',
  homePhone: 'personal', homePhone2: 'personal', carPhone: 'personal',
  pager: 'personal', otherPhone: 'personal', primaryPhone: 'personal', homeFax: 'personal',
  businessPhone2: 'shared', companyMainPhone: 'shared', businessFax: 'shared', otherFax: 'shared',
}

export function ContactForm({ initial = BLANK, onSubmit, onCancel, defaultVisibility = 'shared' }) {
  const { addCompany, teamMembers } = useCRM()
  const { user, isAdmin } = useAuth()

  const isNewContact = initial === BLANK
  const isOwner = isNewContact || (initial.ownerIds || []).includes(user?.id)
  const ownersEditable = isNewContact || isAdmin

  // Migrate legacy unnamed arrays into named fields for existing contacts
  const initEmail = initial.email || (initial.personalEmails || [])[0] || (initial.sharedEmails || [])[0] || ''
  const initEmail2 = initial.email2 || (initial.personalEmails || [])[1] || (initial.sharedEmails || [])[1] || ''
  const initEmail3 = initial.email3 || (initial.personalEmails || [])[2] || (initial.sharedEmails || [])[2] || ''
  const initPhone = initial.phone || (initial.personalPhones || [])[0] || (initial.sharedCellPhones || [])[0] || ''
  const initMobile = initial.mobile || (initial.personalPhones || [])[1] || (initial.sharedCellPhones || [])[1] || ''

  const defaultOwnerIds = isNewContact ? (user ? [user.id] : []) : (initial.ownerIds || [])
  const [form, setForm] = useState({
    ...BLANK,
    ...initial,
    email: initEmail,
    email2: initEmail2,
    email3: initEmail3,
    phone: initPhone,
    mobile: initMobile,
    ownerIds: defaultOwnerIds,
    visibility: initial.visibility || defaultVisibility,
    sharedWith: initial.sharedWith || [],
    sharedCellPhones: initial.sharedCellPhones || [],
    sharedEmails: initial.sharedEmails || initial.sharedPersonalEmails || [],
    personalPhones: initial.personalPhones || [],
    personalEmails: initial.personalEmails || [],
    phoneAssignments: { ...DEFAULT_FIELD_ASSIGNMENTS, ...(initial.phoneAssignments || {}) },
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [activeTab, setActiveTab] = useState('general')
  // Progressive disclosure: extra revealed slots per field group
  const [extraSlots, setExtraSlots] = useState({ pEmails: 0, pPhones: 0, pFax: 0, sEmails: 0, sPhones: 0, sFax: 0 })
  const addSlot = (key) => setExtraSlots(s => ({ ...s, [key]: s[key] + 1 }))
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
    e.stopPropagation()
    if (!form.firstName || !form.lastName) { setActiveTab('general'); return }
    setSaveError(null)
    setSaving(true)
    try {
      // Derive backward-compat arrays from named fields based on assignments
      const fa = { ...DEFAULT_FIELD_ASSIGNMENTS, ...form.phoneAssignments }
      const isShared = form.visibility === 'shared'
      const emailKeys = ['email', 'email2', 'email3']
      const phoneKeys = ['phone', 'mobile']
      const personalEmailArr = emailKeys.filter(k => form[k] && (!isShared || fa[k] === 'personal')).map(k => form[k])
      const sharedEmailArr = isShared ? emailKeys.filter(k => form[k] && fa[k] === 'shared').map(k => form[k]) : []
      const personalPhoneArr = phoneKeys.filter(k => form[k] && (!isShared || fa[k] === 'personal')).map(k => form[k])
      const sharedPhoneArr = isShared ? phoneKeys.filter(k => form[k] && fa[k] === 'shared').map(k => form[k]) : []
      const payload = {
        ...form,
        personalEmails: personalEmailArr,
        sharedEmails: sharedEmailArr,
        personalPhones: personalPhoneArr,
        sharedCellPhones: sharedPhoneArr,
        // Non-owners must not overwrite owner's private fields
        ...(!isOwner ? {
          personalPhones: undefined,
          personalEmails: undefined,
          notes: undefined,
          phone: undefined,
          mobile: undefined,
          email: undefined,
          email2: undefined,
          email3: undefined,
        } : {}),
      }
      await onSubmit(payload)
    } catch (err) {
      setSaveError(err?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const hasAnyContactInfo = !!(form.email || form.email2 || form.email3 || form.phone || form.mobile || form.homePhone || form.homePhone2 || form.businessPhone2 || form.carPhone || form.otherPhone || form.primaryPhone || form.pager || form.businessFax || form.homeFax || form.otherFax || form.companyMainPhone || form.notes || form.sharedNotes)
  const hasAddresses = !!(form.businessStreet || form.homeStreet || form.otherStreet)

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {saveError && <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 border border-red-200 dark:border-red-800">{saveError}</p>}

      {/* ══════ Section 1: Sharing bar ══════ */}
      <div className="border border-[var(--border)] px-3 py-2 space-y-2">
        {/* Row 1: Visibility (left) + Owners (center) */}
        <div className="relative flex items-center">
          {isOwner && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">Visibility</span>
              <button type="button" onClick={() => setForm(p => ({ ...p, visibility: 'private' }))}
                className={clsx('flex items-center gap-1 px-2 py-1 text-[10px] font-medium border transition-colors',
                  form.visibility === 'private'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-600'
                    : 'border-[var(--border)] text-slate-500 hover:border-slate-400 dark:text-slate-400'
                )}>
                <Lock size={10} /> Private
              </button>
              <button type="button" onClick={() => setForm(p => ({ ...p, visibility: 'shared' }))}
                className={clsx('flex items-center gap-1 px-2 py-1 text-[10px] font-medium border transition-colors',
                  form.visibility === 'shared'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-600'
                    : 'border-[var(--border)] text-slate-500 hover:border-slate-400 dark:text-slate-400'
                )}>
                <Users size={10} /> Shared
              </button>
            </div>
          )}

          {teamMembers.length > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">Owners</span>
              {ownersEditable ? (
                <div className="flex flex-wrap gap-1">
                  {teamMembers.map(m => (
                    <button key={m.id} type="button" onClick={() => toggleOwner(m.id)}
                      className={clsx('text-[10px] px-2 py-0.5 border transition-colors',
                        form.ownerIds.includes(m.id)
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-600'
                          : 'border-[var(--border)] text-slate-400 hover:border-slate-400 dark:text-slate-500'
                      )}>
                      {m.displayName || m.email}{m.id === user?.id ? ' (you)' : ''}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {(form.ownerIds || []).map(id => {
                    const m = teamMembers.find(t => t.id === id)
                    return m ? (
                      <span key={id} className="text-[10px] text-slate-600 dark:text-slate-300 bg-surface-100 dark:bg-surface-200 px-2 py-0.5 border border-[var(--border)]">
                        {m.displayName || m.email}{m.id === user?.id ? ' (you)' : ''}
                      </span>
                    ) : null
                  })}
                  {form.ownerIds.length === 0 && <span className="text-[10px] text-slate-400 dark:text-slate-500">None</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Share with (centered) */}
        {isOwner && form.visibility === 'shared' && teamMembers.length > 0 && (
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">Share with</span>
            <div className="flex flex-wrap gap-1">
              {teamMembers.map(m => (
                <button key={m.id} type="button"
                  onClick={() => {
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
                  className={clsx('text-[10px] px-2 py-0.5 border transition-colors',
                    form.sharedWith.length === 0 || form.sharedWith.includes(m.id)
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-600'
                      : 'border-[var(--border)] text-slate-400 hover:border-slate-400 dark:text-slate-500'
                  )}>
                  {m.displayName || m.email}
                </button>
              ))}
            </div>
            {form.sharedWith.length === 0 && <span className="text-[9px] text-slate-400 dark:text-slate-500">(all)</span>}
          </div>
        )}
      </div>

      {/* ══════ Tab Bar ══════ */}
      <div className="flex gap-0 border-b border-[var(--border)]">
        {[
          { id: 'general', label: 'General' },
          { id: 'contact', label: 'Contact Info', dot: hasAnyContactInfo },
          { id: 'extended', label: 'Addresses', dot: hasAddresses },
        ].map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={clsx('px-4 py-2 text-[11px] font-semibold tracking-wide font-mono transition-colors relative flex items-center gap-1.5',
              activeTab === tab.id
                ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-500 -mb-px'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            )}>
            {tab.label}
            {tab.dot && activeTab !== tab.id && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />}
          </button>
        ))}
      </div>

      {/* ══════ Tab: General ══════ */}
      {activeTab === 'general' && (
        <div className="space-y-3">
          {/* Name */}
          <div className="border border-[var(--border)] p-3 space-y-2">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">Name</p>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="v-label">First name <span className="text-red-500">*</span></label>
                <input value={form.firstName} onChange={f('firstName')} className="v-input" required />
              </div>
              <div>
                <label className="v-label">Last name <span className="text-red-500">*</span></label>
                <input value={form.lastName} onChange={f('lastName')} className="v-input" required />
              </div>
              <div>
                <label className="v-label">Middle</label>
                <input value={form.middleName} onChange={f('middleName')} className="v-input" />
              </div>
              <div>
                <label className="v-label">Suffix</label>
                <input value={form.suffix} onChange={f('suffix')} className="v-input" placeholder="Jr." />
              </div>
            </div>
          </div>

          {/* Professional */}
          <div className="border border-[var(--border)] p-3 space-y-2">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">Professional</p>
            <div className="grid grid-cols-4 gap-2">
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
              <div>
                <label className="v-label">Function</label>
                <select value={form.contactFunction || ''} onChange={f('contactFunction')} className="v-select">
                  <option value="">— Select —</option>
                  {CONTACT_FUNCTIONS.map(fn => <option key={fn} value={fn}>{formatContactFunction(fn)}</option>)}
                </select>
              </div>
              <div>
                <label className="v-label">Nickname</label>
                <input value={form.nickname} onChange={f('nickname')} className="v-input" />
              </div>
            </div>
          </div>

          {/* Online & Dates */}
          <div className="border border-[var(--border)] p-3 space-y-2">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">Online & Dates</p>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="v-label">LinkedIn</label>
                <input value={form.linkedIn} onChange={f('linkedIn')} className="v-input" placeholder="linkedin.com/in/..." />
              </div>
              <div>
                <label className="v-label">Web Page</label>
                <input value={form.webPage} onChange={f('webPage')} className="v-input" placeholder="https://..." />
              </div>
              <div>
                <label className="v-label">Birthday</label>
                <input type="date" value={form.birthday} onChange={f('birthday')} className="v-input" />
              </div>
              <div>
                <label className="v-label">Anniversary</label>
                <input type="date" value={form.anniversary} onChange={f('anniversary')} className="v-input" />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="border border-[var(--border)] p-3 space-y-2">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">Tags</p>
            <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
          </div>
        </div>
      )}

      {/* ══════ Tab: Contact Info ══════ */}
      {activeTab === 'contact' && (() => {
        const canSwap = form.visibility === 'shared'
        const fieldAssign = (field) => canSwap ? (form.phoneAssignments[field] || DEFAULT_FIELD_ASSIGNMENTS[field] || 'personal') : 'personal'
        const flipField = (field) => setForm(p => ({
          ...p,
          phoneAssignments: { ...p.phoneAssignments, [field]: fieldAssign(field) === 'personal' ? 'shared' : 'personal' },
        }))

        // Determine which fields go in each section
        const personalEmails = ALL_EMAIL_FIELDS.filter(f => fieldAssign(f.key) === 'personal')
        const sharedEmails = ALL_EMAIL_FIELDS.filter(f => fieldAssign(f.key) === 'shared')
        const personalPhones = ALL_PHONE_FIELDS.filter(f => fieldAssign(f.key) === 'personal')
        const sharedPhones = ALL_PHONE_FIELDS.filter(f => fieldAssign(f.key) === 'shared')
        const personalFax = ALL_FAX_FIELDS.filter(f => fieldAssign(f.key) === 'personal')
        const sharedFax = ALL_FAX_FIELDS.filter(f => fieldAssign(f.key) === 'shared')

        // Render a group of named fields with progressive disclosure
        const renderFieldGroup = (fields, label, addLabel, minVisible, section, slotKey) => {
          const populated = fields.filter(f => form[f.key]).length
          const visible = Math.max(minVisible, populated, Math.min(minVisible + extraSlots[slotKey], fields.length))
          const canAdd = visible < fields.length

          return (
            <div>
              <p className="v-label mb-1">{label}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {fields.slice(0, visible).map(({ key, label: fieldLabel }) => (
                  <div key={key} className="flex items-center gap-1">
                    <div className="flex-1">
                      <label className="v-label">{fieldLabel}</label>
                      <input value={form[key] || ''} onChange={f(key)} className="v-input"
                        type={label === 'Emails' ? 'email' : 'text'}
                        placeholder={label === 'Emails' ? 'name@company.com' : ''}
                      />
                    </div>
                    {canSwap && (
                      <button type="button" onClick={() => flipField(key)}
                        className="mt-3.5 flex-shrink-0 text-[9px] text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors underline whitespace-nowrap">
                        {section === 'personal' ? <><ArrowDown size={9} className="inline" /> Shared</> : <><ArrowUp size={9} className="inline" /> Personal</>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {canAdd && (
                <button type="button" onClick={() => addSlot(slotKey)}
                  className="flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors mt-1.5">
                  <Plus size={10} /> {addLabel}
                </button>
              )}
            </div>
          )
        }

        return (
        <div className="space-y-3">
          {/* Personal */}
          {isOwner && (
          <div className="border border-[var(--border)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono flex items-center gap-1">
                <Lock size={9} /> Personal <span className="font-normal normal-case text-[9px] text-slate-400 dark:text-slate-500">(private to you)</span>
              </p>
              {canSwap && (
                <button type="button"
                  onClick={() => {
                    // Swap all field assignments between personal and shared
                    setForm(p => {
                      const newAssignments = { ...p.phoneAssignments }
                      for (const f of [...ALL_EMAIL_FIELDS, ...ALL_PHONE_FIELDS, ...ALL_FAX_FIELDS]) {
                        const cur = newAssignments[f.key] || DEFAULT_FIELD_ASSIGNMENTS[f.key] || 'personal'
                        newAssignments[f.key] = cur === 'personal' ? 'shared' : 'personal'
                      }
                      return { ...p, phoneAssignments: newAssignments, notes: p.sharedNotes, sharedNotes: p.notes }
                    })
                  }}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  <ArrowLeftRight size={11} /> Swap All
                </button>
              )}
            </div>

            {personalEmails.length > 0 && renderFieldGroup(personalEmails, 'Emails', 'Add email', 1, 'personal', 'pEmails')}

            {personalPhones.length > 0 && renderFieldGroup(personalPhones, 'Phones', 'Add phone', 2, 'personal', 'pPhones')}

            {personalFax.length > 0 && renderFieldGroup(personalFax, 'Fax', 'Add fax', 0, 'personal', 'pFax')}

            {/* Show add buttons when all fields of a type have been moved to shared */}
            {personalEmails.length === 0 && canSwap && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">All emails moved to Shared</p>
            )}
            {personalPhones.length === 0 && personalFax.length === 0 && canSwap && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">All phones moved to Shared</p>
            )}

            <div>
              <label className="v-label">Notes</label>
              <textarea value={form.notes} onChange={f('notes')} rows={3} className="v-input resize-y w-full" placeholder="Background, preferences, how you met..." />
              {canSwap && (
                <button type="button" onClick={() => setForm(p => ({ ...p, notes: p.sharedNotes, sharedNotes: p.notes }))}
                  className="mt-1 text-[10px] text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors underline flex items-center gap-0.5">
                  <ArrowLeftRight size={9} /> Swap
                </button>
              )}
            </div>
          </div>
          )}

          {/* Shared */}
          <div className={clsx('border p-3 space-y-3', canSwap ? 'border-brand-200 dark:border-brand-800 bg-brand-50/30 dark:bg-brand-900/10' : 'border-[var(--border)]')}>
            <p className={clsx('text-[10px] font-semibold uppercase tracking-wide font-mono flex items-center gap-1', canSwap ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500')}>
              <Users size={9} /> Shared <span className="font-normal normal-case text-[9px] ml-1">(visible to team)</span>
            </p>

            {canSwap ? (
              <>
                {sharedEmails.length > 0 && renderFieldGroup(sharedEmails, 'Emails', 'Add email', 1, 'shared', 'sEmails')}

                {sharedPhones.length > 0 && renderFieldGroup(sharedPhones, 'Phones', 'Add phone', 1, 'shared', 'sPhones')}

                {sharedFax.length > 0 && renderFieldGroup(sharedFax, 'Fax', 'Add fax', 0, 'shared', 'sFax')}

                {sharedEmails.length === 0 && sharedPhones.length === 0 && sharedFax.length === 0 && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">All fields are in Personal. Use swap buttons to move fields here.</p>
                )}

                <div>
                  <label className="v-label">Notes</label>
                  <textarea value={form.sharedNotes} onChange={f('sharedNotes')} rows={3} className="v-input resize-y w-full" placeholder="Team-facing notes..." />
                  <button type="button" onClick={() => setForm(p => ({ ...p, sharedNotes: p.notes, notes: p.sharedNotes }))}
                    className="mt-1 text-[10px] text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors underline flex items-center gap-0.5">
                    <ArrowLeftRight size={9} /> Swap
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Set visibility to Shared to enable shared fields.</p>
            )}
          </div>
        </div>
        )
      })()}

      {/* ══════ Tab: Addresses & More ══════ */}
      {activeTab === 'extended' && (
        <div className="border border-[var(--border)] p-3 space-y-2">
          {/* Addresses only — phones moved to Contact Info tab */}
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">Addresses</p>
            {[
              { label: 'Business', prefix: 'business' },
              { label: 'Home', prefix: 'home' },
              { label: 'Other', prefix: 'other' },
            ].map(({ label, prefix }) => (
              <div key={prefix} className="space-y-1">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{label}</p>
                <input value={form[`${prefix}Street`]} onChange={f(`${prefix}Street`)} className="v-input" placeholder="Street" />
                <div className="grid grid-cols-3 gap-1">
                  <input value={form[`${prefix}City`]} onChange={f(`${prefix}City`)} className="v-input" placeholder="City" />
                  <input value={form[`${prefix}State`]} onChange={f(`${prefix}State`)} className="v-input" placeholder="State" />
                  <input value={form[`${prefix}PostalCode`]} onChange={f(`${prefix}PostalCode`)} className="v-input" placeholder="Zip" />
                </div>
                <input value={form[`${prefix}Country`]} onChange={f(`${prefix}Country`)} className="v-input" placeholder="Country" />
              </div>
            ))}
        </div>
      )}

      <div className="flex gap-2">
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
  const { getContact, getCompany, updateContact, deleteContact, properties, updatePropertyWithStage, reminders, activities, teamMembers } = useCRM()
  const { user } = useAuth()
  const { contactHealth } = useIntelligence()
  const [editingHealth, setEditingHealth] = useState(false)
  const [healthInput, setHealthInput] = useState('')
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
  const isOwner = (contact.ownerIds || []).length === 0 || (contact.ownerIds || []).includes(user?.id)
  const relatedProps = properties.filter(p => p.contactIds?.includes(id))
  const contactLinkedDeals = relatedProps.filter(p => !p.deletedAt)

  async function linkContactToDeal(dealId) {
    const deal = properties.find(p => p.id === dealId)
    if (!deal) return
    const newIds = [...new Set([...(deal.contactIds || []), id])]
    await updatePropertyWithStage(dealId, { ...deal, contactIds: newIds })
  }

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
          <h2 className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
            {fullName(contact)}{contact.suffix ? ` ${contact.suffix}` : ''}{contact.nickname ? ` "${contact.nickname}"` : ''}
          </h2>
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
            {(() => {
              const canSeePrivate = isOwner || contact.visibility !== 'shared'
              const allEmails = [...new Set([
                ...(canSeePrivate ? [contact.email, contact.email2, contact.email3, ...(contact.personalEmails || [])] : []),
                ...(contact.sharedEmails || [])
              ].filter(Boolean))]
              const allPhones = [...new Set([
                ...(canSeePrivate ? [contact.phone, contact.mobile, ...(contact.personalPhones || [])] : []),
                ...(contact.sharedCellPhones || [])
              ].filter(Boolean))]
              return (<>
                {allEmails.map((em, i) => (
                  <a key={em} href={`mailto:${em}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                    <Mail size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> <span className="truncate">{em}</span>
                  </a>
                ))}
                {allPhones.map((ph, i) => (
                  <a key={ph} href={`tel:${ph}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                    <Phone size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> {ph} {ph === contact.mobile && <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">MOB</span>}
                  </a>
                ))}
              </>)
            })()}
            {contact.linkedIn && (
              <a href={`https://${contact.linkedIn}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                <Linkedin size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> LinkedIn <ExternalLink size={9} className="text-slate-400" />
              </a>
            )}
            {contact.webPage && (
              <a href={contact.webPage.startsWith('http') ? contact.webPage : `https://${contact.webPage}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                <Globe size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> Web <ExternalLink size={9} className="text-slate-400" />
              </a>
            )}
            {(contact.birthday || contact.anniversary) && (
              <div className="pt-1 space-y-0.5">
                {contact.birthday && (
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <Cake size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> {formatDate(contact.birthday)}
                  </p>
                )}
                {contact.anniversary && (
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <Calendar size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> {formatDate(contact.anniversary)}
                  </p>
                )}
              </div>
            )}
            {contact.businessStreet && (
              <div className="pt-1">
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <MapPin size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  <span>{[contact.businessStreet, contact.businessCity, contact.businessState, contact.businessPostalCode].filter(Boolean).join(', ')}</span>
                </p>
              </div>
            )}
            {(() => {
              const extraPhones = [
                contact.homePhone && { label: 'Home', num: contact.homePhone },
                contact.homePhone2 && { label: 'Home 2', num: contact.homePhone2 },
                contact.businessPhone2 && { label: 'Bus 2', num: contact.businessPhone2 },
                contact.carPhone && { label: 'Car', num: contact.carPhone },
                contact.otherPhone && { label: 'Other', num: contact.otherPhone },
                contact.companyMainPhone && { label: 'Main', num: contact.companyMainPhone },
              ].filter(Boolean)
              return extraPhones.length > 0 && (
                <div className="pt-1 space-y-0.5">
                  {extraPhones.map(({ label, num }) => (
                    <a key={label} href={`tel:${num}`} className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
                      <Phone size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0" /> {num} <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">{label.toUpperCase()}</span>
                    </a>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Health score */}
          {(() => {
            const ch = contactHealth.find(h => h.id === id)
            const score = ch?.healthScore ?? 0
            const lbl = ch?.healthLabel || 'cold'
            return (
              <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
                <div className="p-2 bg-surface-50 dark:bg-surface-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">Health</span>
                    <div className="flex items-center gap-1.5">
                      {contact.healthOverride != null && (
                        <span className="text-[9px] font-mono text-amber-500 dark:text-amber-400">override</span>
                      )}
                      {editingHealth ? (
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" max="100"
                            value={healthInput}
                            onChange={e => setHealthInput(e.target.value)}
                            className="w-14 text-[11px] text-center border border-[var(--border)] bg-white dark:bg-surface-200 text-slate-700 dark:text-slate-300 outline-none px-1 py-0"
                            autoFocus
                          />
                          <button type="button"
                            onClick={async () => {
                              const val = healthInput === '' ? null : Math.max(0, Math.min(100, Number(healthInput)))
                              await updateContact(id, { ...contact, healthOverride: val })
                              setEditingHealth(false)
                            }}
                            className="text-[10px] text-brand-600 dark:text-brand-400 font-medium hover:underline">Set</button>
                          <button type="button" onClick={() => setEditingHealth(false)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Cancel</button>
                        </div>
                      ) : (
                        <button type="button"
                          onClick={() => { setHealthInput(contact.healthOverride?.toString() ?? score.toString()); setEditingHealth(true) }}
                          className={clsx('text-[10px] font-bold font-mono tabular-nums',
                            score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-blue-500' : score >= 25 ? 'text-amber-500' : 'text-red-500')}>
                          {score}/100
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-200 dark:bg-surface-200 overflow-hidden">
                    <div className={clsx('h-full transition-all duration-500',
                      score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-blue-500' : score >= 25 ? 'bg-amber-500' : 'bg-red-500'
                    )} style={{ width: `${score}%` }} />
                  </div>
                  <p className={clsx('text-[10px] mt-1 font-mono',
                    score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-blue-500' : score >= 25 ? 'text-amber-500' : 'text-red-500')}>
                    {lbl}
                  </p>
                </div>
              </div>
            )
          })()}

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

          {/* Notes (private to owner for shared contacts, just notes for private contacts) */}
          {contact.notes && (isOwner || contact.visibility !== 'shared') && (
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] dark:border-[var(--border)]">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase">
                Notes {contact.visibility === 'shared' && <span className="text-[9px] font-normal text-slate-400 ml-1">(private)</span>}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
            </div>
          )}

          {/* Shared fields — only for shared contacts */}
          {contact.visibility === 'shared' && (contact.sharedNotes || contact.sharedCellPhones?.length > 0 || contact.sharedEmails?.length > 0) && (
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
              {contact.sharedEmails?.length > 0 && (
                <div>
                  <p className="text-[9px] text-brand-500 dark:text-brand-500 font-mono uppercase mb-0.5">Personal Emails</p>
                  <div className="space-y-0.5">
                    {contact.sharedEmails.map((em, i) => (
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
            <ActivityFeed contactId={id} contactDeals={contactLinkedDeals} onLinkDeal={linkContactToDeal} />
            <OutlookMessages email={(isOwner ? (contact.email || contact.personalEmails?.[0]) : null) || contact.sharedEmails?.[0]} contactId={id} />
            <OutlookAttachments email={(isOwner ? (contact.email || contact.personalEmails?.[0]) : null) || contact.sharedEmails?.[0]} />
          </div>
        </div>
      </div>

      {editing && (
        <Modal title={`Edit ${fullName(contact)}`} onClose={() => setEditing(false)} size="3xl" disableBackdropClose>
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

  const { sharedContacts: contacts, companies, addContact, updateContact, deleteContact, getCompany, teamMembers, shareContacts, makeContactsPrivate } = useCRM()
  const { isAdmin, user } = useAuth()
  const { contactHealth } = useIntelligence()
  const { contactDuplicates } = useDuplicates()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 200
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
  const [selected, setSelected] = useState(new Set())
  const [showShare, setShowShare] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [barStuck, setBarStuck] = useState(false)
  const observerRef = useRef(null)
  const barSentinelRef = useCallback(node => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null }
    if (node) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => setBarStuck(!entry.isIntersecting),
        { threshold: 0 }
      )
      observerRef.current.observe(node)
    } else {
      setBarStuck(false)
    }
  }, [])

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'lastTouch' || field === 'dateAdded' ? 'desc' : 'asc') }
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const cIsOwner = (c.ownerIds || []).length === 0 || (c.ownerIds || []).includes(user?.id)
    const allEmails = [...(cIsOwner ? [c.email, ...(c.personalEmails || [])] : []), ...(c.sharedEmails || [])].filter(Boolean)
    const matches = !q || fullName(c).toLowerCase().includes(q) || allEmails.some(e => e.toLowerCase().includes(q)) || c.title?.toLowerCase().includes(q) || (c.tags || []).some(t => t.toLowerCase().includes(q))
    const comp = !filterCompany || c.companyId === filterCompany
    const owner = !filterOwner || (c.ownerIds || []).length === 0 || (c.ownerIds || []).includes(filterOwner)
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

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [search, filterCompany, filterOwner, filterFunction])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const allVisibleSelected = paged.length > 0 && paged.every(c => selected.has(c.id))

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected(prev => { const next = new Set(prev); paged.forEach(c => next.delete(c.id)); return next })
    } else {
      setSelected(prev => { const next = new Set(prev); paged.forEach(c => next.add(c.id)); return next })
    }
  }

  function clearSelection() { setSelected(new Set()) }

  async function handleShare(userIds) {
    setSharing(true)
    try {
      await shareContacts([...selected], userIds)
      setShowShare(false)
      clearSelection()
    } finally {
      setSharing(false)
    }
  }

  async function handleMakePrivate() {
    if (!confirm(`Make ${selected.size} contact(s) private? They will be removed from the shared CRM.`)) return
    await makeContactsPrivate([...selected])
    clearSelection()
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} contact(s)? They will be moved to Recently Deleted.`)) return
    for (const cid of selected) await deleteContact(cid)
    clearSelection()
  }

  const BulkBar = ({ sticky = false }) => (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-1.5 border-b border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20',
      sticky ? 'fixed top-[40px] left-[200px] right-0 z-50 bg-white dark:bg-surface-50 border-brand-200 dark:border-brand-700' : 'flex-shrink-0'
    )}>
      <CheckSquare size={12} className="text-brand-600 dark:text-brand-400" />
      <span className="text-[11px] font-medium text-brand-700 dark:text-brand-300 font-mono">{selected.size} selected</span>
      <div className="flex-1" />
      <button onClick={() => setShowShare(true)} className="v-btn-primary text-[10px]">
        <Share2 size={11} /> Share
      </button>
      {[...selected].some(id => contacts.find(c => c.id === id)?.visibility === 'shared') && (
        <button onClick={handleMakePrivate} className="v-btn-secondary text-[10px]">
          <Lock size={11} /> Make Private
        </button>
      )}
      <button onClick={handleBulkDelete} className="v-btn-secondary text-[10px] text-red-600 dark:text-red-400">
        <Trash2 size={11} /> Delete
      </button>
      <button onClick={clearSelection} className="v-btn-ghost p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
        <X size={12} />
      </button>
    </div>
  )

  async function handleAdd(form) {
    const dup = contacts.find(c => {
      if ((c.firstName || '').toLowerCase() === form.firstName.toLowerCase() && (c.lastName || '').toLowerCase() === form.lastName.toLowerCase()) return true
      const formEmail = (form.email || form.personalEmails?.[0] || '').toLowerCase()
      if (!formEmail) return false
      const cEmails = [c.email, ...(c.personalEmails || []), ...(c.sharedEmails || [])].filter(Boolean).map(e => e.toLowerCase())
      return cEmails.includes(formEmail)
    })
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
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="v-btn-secondary text-[10px] px-1.5 py-0.5 disabled:opacity-30">Prev</button>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">{page + 1}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="v-btn-secondary text-[10px] px-1.5 py-0.5 disabled:opacity-30">Next</button>
          </div>
        )}
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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <>
          <div ref={barSentinelRef}>
            <BulkBar />
          </div>
          {barStuck && <BulkBar sticky />}
        </>
      )}

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
                <th className="w-8">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}
                    className="w-3.5 h-3.5 border-slate-300 text-brand-600 cursor-pointer accent-brand-600" />
                </th>
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
              {paged.map(c => {
                const company = getCompany(c.companyId)
                const stale = c.lastContacted && daysDiff(c.lastContacted) >= 90
                const ch = contactHealth.find(h => h.id === c.id)
                const healthScore = ch?.healthScore ?? 0
                const healthLbl = ch?.healthLabel || 'cold'
                const owners = (c.ownerIds || [])
                  .map(oid => teamMembers.find(m => m.id === oid))
                  .filter(Boolean)
                const isSelected = selected.has(c.id)
                const cOwner = (c.ownerIds || []).length === 0 || (c.ownerIds || []).includes(user?.id)
                return (
                  <tr key={c.id} className={clsx(isSelected && '!bg-brand-50/50 dark:!bg-brand-900/10')}>
                    <td>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(c.id)}
                        className="w-3.5 h-3.5 border-slate-300 text-brand-600 cursor-pointer accent-brand-600" />
                    </td>
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
                        {((cOwner && (c.email || c.personalEmails?.length > 0)) || c.sharedEmails?.length > 0) && <a href={`mailto:${(cOwner ? (c.email || c.personalEmails?.[0]) : null) || c.sharedEmails?.[0]}`} className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"><Mail size={12} /></a>}
                        {((cOwner && (c.phone || c.mobile || c.personalPhones?.length > 0)) || c.sharedCellPhones?.length > 0) && <a href={`tel:${(cOwner ? (c.phone || c.mobile || c.personalPhones?.[0]) : null) || c.sharedCellPhones?.[0]}`} className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"><Phone size={12} /></a>}
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
        {selected.size > 0 && <span>{selected.size} selected</span>}
      </div>

      {showAdd && (
        <Modal title="Add Contact" onClose={() => setShowAdd(false)} size="3xl" disableBackdropClose>
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

      {showShare && (
        <ShareModal
          count={selected.size}
          entityLabel="contact"
          teamMembers={teamMembers}
          onConfirm={handleShare}
          onCancel={() => setShowShare(false)}
          loading={sharing}
        />
      )}
    </div>
  )
}
