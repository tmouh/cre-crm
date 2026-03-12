import { useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, MapPin, Mail, Phone, Globe, Trash2, Edit2, ArrowLeft, ExternalLink, Upload, X, CheckSquare } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { COMPANY_TYPES, COMPANY_TYPE_COLORS, companyInitials, formatDate, fullName } from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import ActivityFeed from '../components/ActivityFeed'
import ReminderList from '../components/ReminderList'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import ImportModal from '../components/ImportModal'
import CompanyTypeCombobox from '../components/CompanyTypeCombobox'

const BLANK = { name: '', type: 'owner', address: '', phone: '', email: '', website: '', notes: '', tags: [] }

function CompanyForm({ initial = BLANK, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...BLANK, ...initial })
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="label">Company name *</label>
        <input value={form.name} onChange={f('name')} className="input" required placeholder="Acme Properties LLC" />
      </div>
      <div>
        <label className="label">Type</label>
        <CompanyTypeCombobox value={form.type} onChange={(val) => setForm(p => ({ ...p, type: val }))} />
      </div>
      <div>
        <label className="label">Address</label>
        <input value={form.address} onChange={f('address')} className="input" placeholder="123 Main St, City, ST 00000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Phone</label>
          <input value={form.phone} onChange={f('phone')} className="input" placeholder="212-555-0100" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" value={form.email} onChange={f('email')} className="input" placeholder="info@company.com" />
        </div>
      </div>
      <div>
        <label className="label">Website</label>
        <input value={form.website} onChange={f('website')} className="input" placeholder="company.com" />
      </div>
      <div>
        <label className="label">Tags</label>
        <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="input resize-none" placeholder="Background, relationship notes..." />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1">Save Company</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

// ---- Detail ----
function CompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getCompany, contacts, properties, updateCompany, deleteCompany, teamMembers } = useCRM()
  const [editing, setEditing] = useState(false)

  const company = getCompany(id)
  if (!company) return <div className="p-8 text-gray-400 dark:text-gray-500">Company not found.</div>

  const relatedContacts  = contacts.filter(c => c.companyId === id)
  const ownedProperties  = properties.filter(p => p.ownerCompanyId === id)
  const tenantProperties = properties.filter(p => p.tenantCompanyId === id)

  async function handleUpdate(form) { await updateCompany(id, form); setEditing(false) }
  async function handleDelete() {
    if (confirm(`Delete ${company.name}?`)) { await deleteCompany(id); navigate('/companies') }
  }

  return (
    <div className="px-8 py-8">
      <Link to="/companies" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <ArrowLeft size={15} /> Companies
      </Link>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <span className="text-sm font-bold text-brand-700 dark:text-brand-300">{companyInitials(company)}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="btn-ghost p-2"><Edit2 size={14} /></button>
                <button onClick={handleDelete} className="btn-ghost p-2 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{company.name}</h2>
            <span className={clsx('badge mt-1', COMPANY_TYPE_COLORS[company.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
              {company.type}
            </span>

            {company.address && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 flex items-start gap-1.5">
                <MapPin size={13} className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />{company.address}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2.5">
              {company.email && <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"><Mail size={14} className="text-gray-400 dark:text-gray-500" />{company.email}</a>}
              {company.phone && <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"><Phone size={14} className="text-gray-400 dark:text-gray-500" />{company.phone}</a>}
              {company.website && (
                <a href={`https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400">
                  <Globe size={14} className="text-gray-400 dark:text-gray-500" />{company.website} <ExternalLink size={11} className="text-gray-400 dark:text-gray-500" />
                </a>
              )}
            </div>

            {company.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {company.tags.map(t => <span key={t} className="badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>)}
              </div>
            )}

            {company.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </div>

          {/* Contacts */}
          {relatedContacts.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Contacts ({relatedContacts.length})</p>
              <div className="space-y-2.5">
                {relatedContacts.map(c => {
                  const owners = (c.ownerIds || []).map(oid => teamMembers.find(m => m.id === oid)).filter(Boolean)
                  return (
                    <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-2 group">
                      <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">{c.firstName[0]}{c.lastName[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 dark:text-gray-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">{fullName(c)}</p>
                        <div className="flex items-center gap-1.5">
                          {c.title && <span className="text-xs text-gray-400 dark:text-gray-500">{c.title}</span>}
                          {c.title && owners.length > 0 && <span className="text-xs text-gray-300 dark:text-gray-600">·</span>}
                          {owners.length > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              Owner: {owners.map(o => o.name || o.email).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Properties */}
          {(ownedProperties.length > 0 || tenantProperties.length > 0) && (
            <div className="card p-4">
              {ownedProperties.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Owns ({ownedProperties.length})</p>
                  <div className="space-y-1.5 mb-3">
                    {ownedProperties.map(p => (
                      <Link key={p.id} to={`/properties/${p.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400">
                        <MapPin size={12} className="text-gray-400 dark:text-gray-500" /><span className="truncate">{p.name}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
              {tenantProperties.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Tenancy ({tenantProperties.length})</p>
                  <div className="space-y-1.5">
                    {tenantProperties.map(p => (
                      <Link key={p.id} to={`/properties/${p.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400">
                        <MapPin size={12} className="text-gray-400 dark:text-gray-500" /><span className="truncate">{p.name}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-4">
          <div className="card p-5"><ReminderList companyId={id} /></div>
          <div className="card p-5"><ActivityFeed companyId={id} /></div>
        </div>
      </div>

      {editing && (
        <Modal title="Edit Company" onClose={() => setEditing(false)} size="lg">
          <CompanyForm initial={company} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  )
}

// ---- Bulk Edit Modal ----
function BulkEditModal({ selected, onClose, onSave }) {
  const [field, setField] = useState('')
  const [typeVal, setTypeVal] = useState('owner')
  const [tagsVal, setTagsVal] = useState([])
  const [tagMode, setTagMode] = useState('add') // 'add' | 'replace'
  const [textVal, setTextVal] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'done'

  const EDITABLE_FIELDS = [
    { key: 'type', label: 'Type' },
    { key: 'tags', label: 'Tags' },
    { key: 'address', label: 'Address' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'website', label: 'Website' },
    { key: 'notes', label: 'Notes' },
  ]

  async function handleApply() {
    let patch = {}
    if (field === 'type') patch = { type: typeVal }
    else if (field === 'tags') patch = { tags: tagsVal, _tagMode: tagMode }
    else if (field === 'notes') patch = { notes: textVal }
    else if (field) patch = { [field]: textVal }
    setStatus('saving')
    await onSave(patch)
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <Modal title="Bulk Edit" onClose={onClose} size="md">
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Completed!</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{selected.size} compan{selected.size !== 1 ? 'ies were' : 'y was'} updated successfully.</p>
          <button onClick={onClose} className="btn-primary mt-2 px-6">Done</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Bulk Edit — ${selected.size} compan${selected.size !== 1 ? 'ies' : 'y'}`} onClose={onClose} size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Field to edit</label>
          <select value={field} onChange={e => setField(e.target.value)} className="input" disabled={status === 'saving'}>
            <option value="">Select a field…</option>
            {EDITABLE_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>

        {field === 'type' && (
          <div>
            <label className="label">New type</label>
            <CompanyTypeCombobox value={typeVal} onChange={setTypeVal} disabled={status === 'saving'} />
          </div>
        )}

        {field === 'tags' && (
          <>
            <div>
              <label className="label">Tag mode</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="radio" name="tagMode" checked={tagMode === 'add'} onChange={() => setTagMode('add')} className="accent-brand-600" disabled={status === 'saving'} />
                  Add to existing
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="radio" name="tagMode" checked={tagMode === 'replace'} onChange={() => setTagMode('replace')} className="accent-brand-600" disabled={status === 'saving'} />
                  Replace all
                </label>
              </div>
            </div>
            <div>
              <label className="label">Tags</label>
              <TagInput tags={tagsVal} onChange={setTagsVal} />
            </div>
          </>
        )}

        {field && field !== 'type' && field !== 'tags' && (
          <div>
            <label className="label">New value</label>
            {field === 'notes' ? (
              <textarea value={textVal} onChange={e => setTextVal(e.target.value)} rows={3} className="input resize-none" placeholder="Enter new value…" disabled={status === 'saving'} />
            ) : (
              <input value={textVal} onChange={e => setTextVal(e.target.value)} className="input" placeholder="Enter new value…" disabled={status === 'saving'} />
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={handleApply} disabled={!field || status === 'saving'} className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed">
            {status === 'saving' ? 'Applying…' : `Apply to ${selected.size} compan${selected.size !== 1 ? 'ies' : 'y'}`}
          </button>
          <button onClick={onClose} className="btn-secondary" disabled={status === 'saving'}>Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

// ---- List ----
export default function Companies() {
  const { id } = useParams()
  if (id) return <CompanyDetail />

  const { companies, contacts, addCompany, updateCompany, deleteCompany } = useCRM()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [showBulkEdit, setShowBulkEdit] = useState(false)

  const filtered = useMemo(() => companies.filter(c => {
    const q = search.toLowerCase()
    const matches = !q || c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    const type = !filterType || c.type === filterType
    return matches && type
  }).sort((a, b) => a.name.localeCompare(b.name)), [companies, search, filterType])

  const allVisibleSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(c => next.delete(c.id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(c => next.add(c.id))
        return next
      })
    }
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function handleBulkEdit(patch) {
    const { _tagMode, ...fields } = patch
    const ids = [...selected]
    for (const cid of ids) {
      let finalPatch = { ...fields }
      if (patch.tags && _tagMode === 'add') {
        const existing = companies.find(c => c.id === cid)
        const merged = [...new Set([...(existing?.tags || []), ...patch.tags])]
        finalPatch.tags = merged
      }
      await updateCompany(cid, finalPatch)
    }
    // Don't close modal here — BulkEditModal will show "Completed!" state
  }

  function handleBulkEditClose() {
    setShowBulkEdit(false)
    clearSelection()
  }

  async function handleBulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} compan${count !== 1 ? 'ies' : 'y'}? This cannot be undone.`)) return
    for (const cid of selected) {
      await deleteCompany(cid)
    }
    clearSelection()
  }

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Companies"
        subtitle={`${companies.length} compan${companies.length !== 1 ? 'ies' : 'y'}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="btn-secondary"><Upload size={15} /> Import CSV</button>
            <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Company</button>
          </div>
        }
      />

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies..." className="input pl-9" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input w-40">
          <option value="">All types</option>
          {[...new Set([...COMPANY_TYPES, ...companies.map(c => c.type).filter(Boolean)])].map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-5 py-3 animate-in fade-in slide-in-from-top-2">
          <CheckSquare size={16} className="text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{selected.size} selected</span>
          <div className="flex-1" />
          <button onClick={() => setShowBulkEdit(true)} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
            <Edit2 size={13} /> Edit
          </button>
          <button onClick={handleBulkDelete} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5 text-red-600 hover:bg-red-50 hover:border-red-200 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-800">
            <Trash2 size={13} /> Delete
          </button>
          <button onClick={clearSelection} className="btn-ghost p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            <X size={15} />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No companies found" action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add Company</button>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                  />
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Contacts</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.map(c => {
                const compContacts = contacts.filter(ct => ct.companyId === c.id)
                const isSelected = selected.has(c.id)
                return (
                  <tr key={c.id} className={clsx('transition-colors', isSelected ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-gray-50/70 dark:hover:bg-gray-700/50')}>
                    <td className="px-3 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(c.id)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Link to={`/companies/${c.id}`} className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-brand-700 dark:text-brand-300">{companyInitials(c)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400">{c.name}</p>
                            {c.address && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{c.address}</p>}
                          </div>
                        </Link>
                        {c.website && (
                          <a href={`https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-600 dark:text-gray-500 dark:hover:text-brand-400 flex-shrink-0" title={c.website}>
                            <Globe size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={clsx('badge', COMPANY_TYPE_COLORS[c.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>{c.type}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.notes ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-[250px] line-clamp-3">{c.notes}</p>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{compContacts.length}</span>
                    </td>
                    <td className="px-4 py-3.5">
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
        <Modal title="Add Company" onClose={() => setShowAdd(false)} size="lg">
          <CompanyForm onSubmit={async (form) => { await addCompany(form); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {showImport && (
        <ImportModal entity="companies" onClose={() => setShowImport(false)} />
      )}

      {showBulkEdit && (
        <BulkEditModal selected={selected} onClose={handleBulkEditClose} onSave={handleBulkEdit} />
      )}
    </div>
  )
}
