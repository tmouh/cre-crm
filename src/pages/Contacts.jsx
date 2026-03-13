import { useState, Component } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, Phone, Mail, Linkedin, Building2, MapPin, Trash2, Edit2, ArrowLeft, ExternalLink, Upload, UserCheck } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'
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
import LinkedInProfile from '../components/LinkedInProfile'

// Prevents a LinkedIn section crash from taking down the whole contact page
class LinkedInErrorBoundary extends Component {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) return null
    return this.props.children
  }
}

const BLANK = { firstName: '', lastName: '', title: '', contactFunction: '', companyId: '', email: '', phone: '', mobile: '', linkedIn: '', notes: '', tags: [], ownerIds: [] }

function ContactForm({ initial = BLANK, onSubmit, onCancel }) {
  const { addCompany, teamMembers } = useCRM()
  const { user } = useAuth()

  // Default ownerIds to [current user] when creating a new contact
  const defaultOwnerIds = initial === BLANK ? (user ? [user.id] : []) : (initial.ownerIds || [])
  const [form, setForm] = useState({ ...BLANK, ...initial, ownerIds: defaultOwnerIds })
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  function toggleOwner(id) {
    setForm(p => ({
      ...p,
      ownerIds: p.ownerIds.includes(id)
        ? p.ownerIds.filter(o => o !== id)
        : [...p.ownerIds, id],
    }))
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
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
          <input value={form.title} onChange={f('title')} className="input" placeholder="e.g. VP Real Estate" />
        </div>
        <div>
          <label className="label">Function</label>
          <select value={form.contactFunction || ''} onChange={f('contactFunction')} className="input">
            <option value="">— Select —</option>
            {CONTACT_FUNCTIONS.map(fn => <option key={fn} value={fn}>{formatContactFunction(fn)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Company</label>
        <CompanyCombobox
          value={form.companyId}
          onChange={(id) => setForm(p => ({ ...p, companyId: id }))}
          onCreateAndSelect={async (name) => {
            const c = await addCompany({ name, type: 'other' })
            setForm(p => ({ ...p, companyId: c.id }))
          }}
        />
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Mobile</label>
          <input value={form.mobile} onChange={f('mobile')} className="input" placeholder="917-555-0100" />
        </div>
        <div>
          <label className="label">LinkedIn</label>
          <input value={form.linkedIn} onChange={f('linkedIn')} className="input" placeholder="linkedin.com/in/..." />
        </div>
      </div>

      {/* Owner assignment */}
      {teamMembers.length > 0 && (
        <div>
          <label className="label">Owners</label>
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 space-y-1 max-h-28 overflow-y-auto">
            {teamMembers.map(m => (
              <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded">
                <input
                  type="checkbox"
                  checked={form.ownerIds.includes(m.id)}
                  onChange={() => toggleOwner(m.id)}
                  className="rounded"
                />
                <span className="text-gray-700 dark:text-gray-300">{m.displayName || m.email}</span>
                {m.id === user?.id && <span className="text-xs text-gray-400 dark:text-gray-500">(you)</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="label">Tags</label>
        <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="input resize-y" placeholder="Background, preferences, how you met..." />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1">Save Contact</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

// ---- Detail ----
function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getContact, getCompany, updateContact, deleteContact, properties, reminders, activities, teamMembers } = useCRM()
  const [editing, setEditing] = useState(false)

  const contact = getContact(id)
  if (!contact) return <div className="p-8 text-gray-400 dark:text-gray-500">Contact not found.</div>

  const company = getCompany(contact.companyId)
  const relatedProps = properties.filter(p => p.contactIds?.includes(id))

  // Find the type of the most recent touch (activity or completed reminder)
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

  async function handleDelete() {
    if (confirm(`Delete ${fullName(contact)}? This cannot be undone.`)) {
      await deleteContact(id)
      navigate('/contacts')
    }
  }

  return (
    <div className="px-8 py-8">
      <Link to="/contacts" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <ArrowLeft size={15} /> Contacts
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="col-span-1 space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <span className="text-xl font-bold text-brand-700 dark:text-brand-300">{initials(contact)}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="btn-ghost p-2"><Edit2 size={14} /></button>
                <button onClick={handleDelete} className="btn-ghost p-2 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{fullName(contact)}</h2>
            {contact.title && <p className="text-sm text-gray-500 dark:text-gray-400">{contact.title}</p>}
            {contact.contactFunction && (
              <span className={clsx('badge mt-1 inline-block', contact.contactFunction === 'lp-investor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                {formatContactFunction(contact.contactFunction)}
              </span>
            )}
            {company && (
              <Link to={`/companies/${company.id}`} className="flex items-center gap-1.5 mt-2 text-sm text-brand-600 hover:underline dark:text-brand-400">
                <Building2 size={13} /> {company.name}
              </Link>
            )}

            <div className="mt-4 space-y-2.5 border-t border-gray-100 dark:border-gray-700 pt-4">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">
                  <Mail size={14} className="text-gray-400 dark:text-gray-500" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">
                  <Phone size={14} className="text-gray-400 dark:text-gray-500" /> {contact.phone}
                </a>
              )}
              {contact.mobile && (
                <a href={`tel:${contact.mobile}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">
                  <Phone size={14} className="text-gray-400 dark:text-gray-500" /> {contact.mobile} <span className="text-xs text-gray-400 dark:text-gray-500">mobile</span>
                </a>
              )}
              {contact.linkedIn && (
                <a href={`https://${contact.linkedIn}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">
                  <Linkedin size={14} className="text-gray-400 dark:text-gray-500" /> LinkedIn <ExternalLink size={11} className="text-gray-400 dark:text-gray-500" />
                </a>
              )}
            </div>

            {/* Owners */}
            {owners.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                  <UserCheck size={12} /> Owners
                </p>
                <div className="space-y-1">
                  {owners.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-700 dark:text-brand-300">{m.email[0].toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{m.displayName || m.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contact.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {contact.tags.map(t => (
                  <span key={t} className="badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-1.5 text-xs text-gray-400 dark:text-gray-500">
              <p>Last contacted: <span className="text-gray-600 dark:text-gray-300">{formatDate(contact.lastContacted)}</span>{lastTouchType && <span className="text-gray-400 dark:text-gray-500"> · {lastTouchType}</span>}</p>
              <p>Added: <span className="text-gray-600 dark:text-gray-300">{formatDate(contact.createdAt)}</span></p>
            </div>

            {contact.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Relevant Deals */}
          {relatedProps.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={15} className="text-gray-400 dark:text-gray-500" />
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Relevant Deals</p>
              </div>
              <div className="space-y-2">
                {relatedProps.map(p => (
                  <Link key={p.id} to={`/properties/${p.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400">
                    <MapPin size={13} className="text-gray-400 dark:text-gray-500" />
                    <span className="truncate">{p.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <LinkedInErrorBoundary key={contact.id}>
            <LinkedInProfile contact={contact} />
          </LinkedInErrorBoundary>
        </div>

        {/* Right panel */}
        <div className="col-span-2 space-y-4">
          <ReminderList contactId={id} />
          <ActivityFeed contactId={id} />
          <OutlookMessages email={contact.email} />
          <OutlookAttachments email={contact.email} />
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

// ---- List ----
export default function Contacts() {
  const { id } = useParams()
  if (id) return <ContactDetail />

  const { contacts, companies, addContact, updateContact, getCompany, teamMembers } = useCRM()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showOutlookImport, setShowOutlookImport] = useState(false)
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
    <div className="px-8 py-8">
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="btn-secondary"><Upload size={15} /> Import CSV</button>
            <button onClick={() => setShowOutlookImport(true)} className="btn-secondary flex items-center gap-1.5">
              <svg viewBox="0 0 21 21" className="w-3.5 h-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
                <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Import from Outlook
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Contact</button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="input pl-9" />
        </div>
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="input w-44">
          <option value="">All companies</option>
          {[...companies].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className="input w-40">
          <option value="">All owners</option>
          {[...teamMembers].sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email)).map(m => (
            <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
          ))}
        </select>
        <select value={filterFunction} onChange={e => setFilterFunction(e.target.value)} className="input w-40">
          <option value="">All functions</option>
          {CONTACT_FUNCTIONS.map(fn => <option key={fn} value={fn}>{formatContactFunction(fn)}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No contacts found" description="Add your first contact to get started." action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add Contact</button>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200/80 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60">
                {[
                  { field: 'name', label: 'Name', className: 'px-5' },
                  { field: 'company', label: 'Company' },
                  { field: 'title', label: 'Title' },
                  { field: 'function', label: 'Function' },
                  { field: null, label: 'Contact' },
                  { field: 'lastTouch', label: 'Last touch' },
                  { field: null, label: 'Owners' },
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
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.map(c => {
                const company = getCompany(c.companyId)
                const stale = c.lastContacted && daysDiff(c.lastContacted) >= 90
                const owners = (c.ownerIds || [])
                  .map(oid => teamMembers.find(m => m.id === oid))
                  .filter(Boolean)
                return (
                  <tr key={c.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`/contacts/${c.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">{initials(c)}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400">{fullName(c)}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      {company ? (
                        <Link to={`/companies/${company.id}`} className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">{company.name}</Link>
                      ) : <span className="text-sm text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {c.title ? <span className="text-sm text-gray-600 dark:text-gray-400">{c.title}</span> : <span className="text-sm text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {c.contactFunction ? (
                        <span className={clsx('badge text-[11px]', c.contactFunction === 'lp-investor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                          {formatContactFunction(c.contactFunction)}
                        </span>
                      ) : <span className="text-sm text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        {c.email && <a href={`mailto:${c.email}`} className="text-gray-400 hover:text-brand-600 dark:text-gray-500 dark:hover:text-brand-400"><Mail size={14} /></a>}
                        {(c.phone || c.mobile) && <a href={`tel:${c.phone || c.mobile}`} className="text-gray-400 hover:text-brand-600 dark:text-gray-500 dark:hover:text-brand-400"><Phone size={14} /></a>}
                        {c.linkedIn && <a href={`https://${c.linkedIn}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-600 dark:text-gray-500 dark:hover:text-brand-400"><Linkedin size={14} /></a>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={clsx('text-xs', stale ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-500')}>
                        {c.lastContacted ? formatDate(c.lastContacted) : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1">
                        {owners.slice(0, 3).map(m => (
                          <div key={m.id} title={m.displayName || m.email} className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <span className="text-xs font-bold text-brand-700 dark:text-brand-300">{m.email[0].toUpperCase()}</span>
                          </div>
                        ))}
                        {owners.length === 0 && <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                      </div>
                    </td>
                    <td className="px-4 pr-6 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).slice(0, 3).map(t => <span key={t} className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{t}</span>)}
                        {(c.tags || []).length > 3 && <span className="badge bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">+{c.tags.length - 3}</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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
            if (dupCheck.newData.ownerIds?.length) {
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
    </div>
  )
}
