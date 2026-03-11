import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, Phone, Mail, Linkedin, Building2, MapPin, Trash2, Edit2, ArrowLeft, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { fullName, initials, formatDate, daysDiff } from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import ActivityFeed from '../components/ActivityFeed'
import ReminderList from '../components/ReminderList'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

const BLANK = { firstName: '', lastName: '', title: '', companyId: '', email: '', phone: '', mobile: '', linkedIn: '', notes: '', tags: [] }

function ContactForm({ initial = BLANK, onSubmit, onCancel }) {
  const { companies } = useCRM()
  const [form, setForm] = useState(initial)
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First name *</label>
          <input value={form.firstName} onChange={f('firstName')} className="input" required />
        </div>
        <div>
          <label className="label">Last name *</label>
          <input value={form.lastName} onChange={f('lastName')} className="input" required />
        </div>
      </div>
      <div>
        <label className="label">Title / Role</label>
        <input value={form.title} onChange={f('title')} className="input" placeholder="e.g. VP Real Estate" />
      </div>
      <div>
        <label className="label">Company</label>
        <select value={form.companyId} onChange={f('companyId')} className="input">
          <option value="">— No company —</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
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
      <div>
        <label className="label">Tags</label>
        <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="input resize-none" placeholder="Background, preferences, how you met..." />
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
  const { getContact, getCompany, updateContact, deleteContact, properties, reminders } = useCRM()
  const [editing, setEditing] = useState(false)

  const contact = getContact(id)
  if (!contact) return <div className="p-8 text-gray-400">Contact not found.</div>

  const company = getCompany(contact.companyId)
  const relatedProps = properties.filter(p => p.contactIds?.includes(id))
  const pendingReminders = reminders.filter(r => r.contactId === id && r.status !== 'done').length

  function handleUpdate(form) {
    updateContact(id, form)
    setEditing(false)
  }

  function handleDelete() {
    if (confirm(`Delete ${fullName(contact)}? This cannot be undone.`)) {
      deleteContact(id)
      navigate('/contacts')
    }
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link to="/contacts" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={15} /> Contacts
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="col-span-1 space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
                <span className="text-xl font-bold text-brand-700">{initials(contact)}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="btn-ghost p-2"><Edit2 size={14} /></button>
                <button onClick={handleDelete} className="btn-ghost p-2 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{fullName(contact)}</h2>
            {contact.title && <p className="text-sm text-gray-500">{contact.title}</p>}
            {company && (
              <Link to={`/companies/${company.id}`} className="flex items-center gap-1.5 mt-2 text-sm text-brand-600 hover:underline">
                <Building2 size={13} /> {company.name}
              </Link>
            )}

            <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
                  <Mail size={14} className="text-gray-400" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
                  <Phone size={14} className="text-gray-400" /> {contact.phone}
                </a>
              )}
              {contact.mobile && (
                <a href={`tel:${contact.mobile}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
                  <Phone size={14} className="text-gray-400" /> {contact.mobile} <span className="text-xs text-gray-400">mobile</span>
                </a>
              )}
              {contact.linkedIn && (
                <a href={`https://${contact.linkedIn}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
                  <Linkedin size={14} className="text-gray-400" /> LinkedIn <ExternalLink size={11} className="text-gray-400" />
                </a>
              )}
            </div>

            {contact.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100">
                {contact.tags.map(t => (
                  <span key={t} className="badge bg-brand-50 text-brand-600">{t}</span>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-xs text-gray-400">
              <p>Last contacted: <span className="text-gray-600">{formatDate(contact.lastContacted)}</span></p>
              <p>Added: <span className="text-gray-600">{formatDate(contact.createdAt)}</span></p>
            </div>

            {contact.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Related properties */}
          {relatedProps.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">Properties</p>
              <div className="space-y-2">
                {relatedProps.map(p => (
                  <Link key={p.id} to={`/properties/${p.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600">
                    <MapPin size={13} className="text-gray-400" />
                    <span className="truncate">{p.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="col-span-2 space-y-4">
          <div className="card p-5">
            <ReminderList contactId={id} />
          </div>
          <div className="card p-5">
            <ActivityFeed contactId={id} />
          </div>
        </div>
      </div>

      {editing && (
        <Modal title={`Edit ${fullName(contact)}`} onClose={() => setEditing(false)} size="lg">
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

  const { contacts, companies, addContact, getCompany } = useCRM()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [filterCompany, setFilterCompany] = useState('')

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matches = !q || fullName(c).toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)
    const comp = !filterCompany || c.companyId === filterCompany
    return matches && comp
  }).sort((a, b) => fullName(a).localeCompare(fullName(b)))

  function handleAdd(form) {
    addContact(form)
    setShowAdd(false)
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Contact</button>}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="input pl-9" />
        </div>
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="input w-48">
          <option value="">All companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No contacts found" description="Add your first contact to get started." action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add Contact</button>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Last touch</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => {
                const company = getCompany(c.companyId)
                const stale = !c.lastContacted || daysDiff(c.lastContacted) > 30
                return (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`/contacts/${c.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-brand-700">{initials(c)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 hover:text-brand-600">{fullName(c)}</p>
                          {c.title && <p className="text-xs text-gray-400">{c.title}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      {company ? (
                        <Link to={`/companies/${company.id}`} className="text-sm text-gray-600 hover:text-brand-600">{company.name}</Link>
                      ) : <span className="text-sm text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        {c.email && <a href={`mailto:${c.email}`} className="text-gray-400 hover:text-brand-600"><Mail size={14} /></a>}
                        {c.phone && <a href={`tel:${c.phone}`} className="text-gray-400 hover:text-brand-600"><Phone size={14} /></a>}
                        {c.linkedIn && <a href={`https://${c.linkedIn}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-600"><Linkedin size={14} /></a>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={clsx('text-xs', stale ? 'text-red-500 font-medium' : 'text-gray-400')}>
                        {c.lastContacted ? formatDate(c.lastContacted) : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).slice(0, 3).map(t => <span key={t} className="badge bg-gray-100 text-gray-600">{t}</span>)}
                        {(c.tags || []).length > 3 && <span className="badge bg-gray-100 text-gray-500">+{c.tags.length - 3}</span>}
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
        <Modal title="Add Contact" onClose={() => setShowAdd(false)} size="lg">
          <ContactForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}
