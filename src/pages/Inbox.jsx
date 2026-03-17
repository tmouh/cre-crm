import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Mail, Phone, Calendar, FileText, MessageSquare,
  Clock, Users, Trash2, AlertCircle, Bell, ChevronDown, ChevronRight,
  Check, X, Zap, ArrowUpRight, ArrowDownLeft, Inbox as InboxIcon, Plus,
} from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useMicrosoft } from '../context/MicrosoftContext'
import { useAuth } from '../context/AuthContext'
import { fullName, formatDate, formatDateTime, TYPE_COLORS, isOverdue, isDueToday } from '../utils/helpers'

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACTIVITY_ICONS = {
  call: Phone, email: Mail, meeting: Calendar,
  note: FileText, tour: MessageSquare, proposal: FileText, other: Activity,
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

const FILTERS = ['all', 'call', 'email', 'meeting', 'note', 'tour', 'proposal']

// ─── Date grouping ─────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${dateStr} · ${timeStr}`
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DateGroupHeader({ label }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1 first:pt-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 font-mono">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

function ActivityCard({ a, getContact, getCompany, getProperty, deleteActivity, updateActivity, actorName, avatarLetter }) {
  const [showNotes, setShowNotes]   = useState(false)
  const [draftNotes, setDraftNotes] = useState(a.description || '')
  const [saving, setSaving]         = useState(false)

  const Icon    = ACTIVITY_ICONS[a.type] || Activity
  const verb    = ACTIVITY_VERBS[a.type] || 'logged activity on'
  const contact = a.contactId  ? getContact(a.contactId)   : null
  const company = a.companyId  ? getCompany(a.companyId)   : null
  const deal    = a.propertyId ? getProperty(a.propertyId) : null

  async function saveNotes() {
    if (draftNotes === (a.description || '')) { setShowNotes(false); return }
    setSaving(true)
    await updateActivity(a.id, { description: draftNotes }).catch(() => {})
    setSaving(false)
    setShowNotes(false)
  }

  const target = contact
    ? <Link to={`/contacts/${contact.id}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">{fullName(contact)}</Link>
    : company
    ? <Link to={`/companies/${company.id}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">{company.name}</Link>
    : deal
    ? <Link to={`/deals/${deal.id}`} className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">{deal.name || deal.address}</Link>
    : <span className="text-slate-400 dark:text-slate-500">—</span>

  return (
    <div className="v-card overflow-hidden group">
      <div className="p-3 flex gap-3">
        {/* Avatar circle */}
        <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[11px] font-bold font-mono text-brand-700 dark:text-brand-300 select-none">{avatarLetter}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Type · Date · Time */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <Icon size={10} className={clsx(TYPE_COLORS[a.type] || TYPE_COLORS.other)} />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono capitalize">
              {a.type} · {formatActivityTime(a.date || a.createdAt)}
            </span>
          </div>

          {/* [Actor] [verb] [Contact/Company/Deal] */}
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
            <span className="font-semibold">{actorName}</span>{' '}
            <span className="text-slate-500 dark:text-slate-400">{verb}</span>{' '}
            {target}
          </p>

          {/* Secondary context links */}
          {contact && (company || deal) && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {company && (
                <Link to={`/companies/${company.id}`} className="text-[10px] text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400">
                  {company.name}
                </Link>
              )}
              {deal && (
                <Link to={`/deals/${deal.id}`} className="text-[10px] text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400">
                  {deal.name || deal.address}
                </Link>
              )}
            </div>
          )}

          {/* Existing notes preview */}
          {a.description && !showNotes && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 italic line-clamp-2 leading-relaxed">
              {a.description}
            </p>
          )}

          {/* Add / Edit notes toggle */}
          {!showNotes && (
            <button
              onClick={() => { setDraftNotes(a.description || ''); setShowNotes(true) }}
              className="mt-1.5 flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              <Plus size={9} />
              {a.description ? 'Edit notes' : 'Add notes'}
            </button>
          )}
        </div>

        {/* Delete button (hover-reveal) */}
        <button
          onClick={() => deleteActivity(a.id)}
          className="p-1 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 self-start"
          title="Delete activity"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Inline notes editor */}
      {showNotes && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700/40 pt-2 space-y-1.5">
          <textarea
            autoFocus
            value={draftNotes}
            onChange={e => setDraftNotes(e.target.value)}
            rows={3}
            placeholder="Notes from this activity..."
            className="v-input text-xs resize-none w-full leading-relaxed"
          />
          <div className="flex gap-1.5">
            <button
              onClick={saveNotes}
              disabled={saving}
              className="v-btn-primary text-[10px] py-0.5 px-2.5 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowNotes(false)} className="v-btn-secondary text-[10px] py-0.5 px-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

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
                    sig.type === 'sharepoint_deal_folder' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : sig.type === 'active_deal_match'    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                    {sig.type === 'recipient_match'        && 'Contact matched'}
                    {sig.type === 'active_deal_match'      && 'Active deal link'}
                    {sig.type === 'address_match'          && 'Address in email'}
                    {sig.type === 'deal_keywords'          && 'Deal keywords'}
                    {sig.type === 'sharepoint_deal_folder' && '📁 SharePoint folder'}
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

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Inbox() {
  const {
    activities, dealActivities, reminders, properties,
    getContact, getCompany, getProperty,
    deleteActivity, updateActivity, updateDealActivity, completeReminder,
  } = useCRM()
  const { isConnected, recentEmails, upcomingEvents } = useMicrosoft()
  const { user } = useAuth()

  const [activeFilter, setActiveFilter] = useState('all')
  const [activeTab, setActiveTab]       = useState('activity')

  // Actor display for activity cards
  const actorName    = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'You'
  const avatarLetter = (actorName[0] || 'U').toUpperCase()

  // ─── Action-needed items ──────────────────────────────────────────────────
  const needsReviewThreads = useMemo(() =>
    dealActivities.filter(d => d.status === 'needs_review')
      .sort((a, b) => (b.lastMessageAt || b.createdAt || '').localeCompare(a.lastMessageAt || a.createdAt || '')),
  [dealActivities])

  const urgentReminders = useMemo(() =>
    reminders.filter(r => r.status !== 'done' && (isOverdue(r.dueDate) || isDueToday(r.dueDate)))
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
  [reminders])

  const actionCount = needsReviewThreads.length + urgentReminders.length

  // ─── Unified stream (manual activities only) ─────────────────────────────
  const streamItems = useMemo(() => {
    const items = activities
      .filter(a => activeFilter === 'all' || a.type === activeFilter)
      .map(a => ({ _type: 'activity', _sortDate: a.date || a.createdAt, ...a }))

    items.sort((a, b) => (b._sortDate || '').localeCompare(a._sortDate || ''))
    return items
  }, [activities, activeFilter])

  const grouped = useMemo(() => groupItems(streamItems), [streamItems])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Tabs toolbar */}
      <div className="os-toolbar flex-shrink-0 border-b-0">
        {[
          { id: 'activity', label: 'Activity', icon: Activity },
          ...(isConnected ? [
            { id: 'emails',   label: 'Emails',   icon: Mail     },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
          ] : []),
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border-b-2 -mb-[1.5px] transition-colors relative',
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            )}
          >
            <tab.icon size={12} />
            {tab.label}
            {tab.id === 'activity' && actionCount > 0 && (
              <span className="min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[9px] font-bold font-mono flex items-center justify-center">
                {actionCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 max-w-[1000px]">

        {/* ── Activity tab ── */}
        {activeTab === 'activity' && (
          <div className="space-y-4">

            {/* Action Needed section */}
            {actionCount > 0 && (
              <div className="border border-red-200 dark:border-red-800/40 overflow-hidden">
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

            {/* Type filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={clsx(
                    'v-btn text-2xs capitalize',
                    activeFilter === f
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-surface-100 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-200'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Date-grouped stream */}
            {streamItems.length === 0 ? (
              <div className="v-card p-8 text-center">
                <InboxIcon size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 dark:text-slate-500">No activity yet</p>
              </div>
            ) : (
              <div>
                {GROUP_ORDER.filter(g => grouped[g]?.length).map(groupLabel => (
                  <div key={groupLabel}>
                    <DateGroupHeader label={groupLabel} />
                    <div className="space-y-1.5">
                      {grouped[groupLabel].map(item => (
                        <ActivityCard
                          key={item.id}
                          a={item}
                          getContact={getContact}
                          getCompany={getCompany}
                          getProperty={getProperty}
                          deleteActivity={deleteActivity}
                          updateActivity={updateActivity}
                          actorName={actorName}
                          avatarLetter={avatarLetter}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Emails tab ── */}
        {activeTab === 'emails' && (
          <div className="space-y-1">
            {recentEmails.length === 0 ? (
              <div className="v-card p-8 text-center">
                <Mail size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 dark:text-slate-500">No recent emails synced</p>
              </div>
            ) : recentEmails.map(email => (
              <a
                key={email.id}
                href={email.webLink}
                target="_blank"
                rel="noopener noreferrer"
                className="v-card p-3 block hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Mail size={14} className={clsx('mt-0.5 flex-shrink-0', email.isRead ? 'text-slate-300 dark:text-slate-600' : 'text-brand-500')} />
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-xs truncate', email.isRead ? 'text-slate-500 dark:text-slate-400' : 'font-semibold text-slate-800 dark:text-slate-200')}>
                      {email.subject || '(no subject)'}
                    </p>
                    <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {email.from?.emailAddress?.name || email.from?.emailAddress?.address} · {formatDate(email.receivedDateTime)}
                    </p>
                    {email.bodyPreview && (
                      <p className="text-2xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">{email.bodyPreview}</p>
                    )}
                  </div>
                  {email.hasAttachments && <FileText size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* ── Calendar tab ── */}
        {activeTab === 'calendar' && (
          <div className="space-y-1">
            {upcomingEvents.length === 0 ? (
              <div className="v-card p-8 text-center">
                <Calendar size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 dark:text-slate-500">No upcoming events</p>
              </div>
            ) : upcomingEvents.map(evt => (
              <a
                key={evt.id}
                href={evt.webLink}
                target="_blank"
                rel="noopener noreferrer"
                className="v-card p-3 block hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Calendar size={14} className="text-brand-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{evt.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-2xs text-slate-400 dark:text-slate-500">
                      <Clock size={10} />
                      {evt.start?.dateTime ? formatDateTime(evt.start.dateTime) : 'TBD'}
                      {evt.location?.displayName && <span>· {evt.location.displayName}</span>}
                    </div>
                    {evt.attendees?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Users size={10} className="text-slate-400" />
                        <span className="text-2xs text-slate-400 dark:text-slate-500">
                          {evt.attendees.slice(0, 3).map(a => a.emailAddress?.name || a.emailAddress?.address).join(', ')}
                          {evt.attendees.length > 3 && ` +${evt.attendees.length - 3}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
