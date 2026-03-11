import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, MapPin, Mail, Phone, Globe, Trash2, Edit2, ArrowLeft, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { COMPANY_TYPES, COMPANY_TYPE_COLORS, companyInitials, formatDate, fullName } from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import ActivityFeed from '../components/ActivityFeed'
import ReminderList from '../components/ReminderList'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

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
        <select value={form.type} onChange={f('type')} className="input">
          {COMPANY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
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
  const { getCompany, contacts, properties, updateCompany, deleteCompany } = useCRM()
  const [editing, setEditing] = useState(false)

  const company = getCompany(id)
  if (!company) return <div className="p-8 text-gray-400">Company not found.</div>

  const relatedContacts  = contacts.filter(c => c.companyId === id)
  const ownedProperties  = properties.filter(p => p.ownerCompanyId === id)
  const tenantProperties = properties.filter(p => p.tenantCompanyId === id)

  async function handleUpdate(form) { await updateCompany(id, form); setEditing(false) }
  async function handleDelete() {
    if (confirm(`Delete ${company.name}?`)) { await deleteCompany(id); navigate('/companies') }
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link to="/companies" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={15} /> Companies
      </Link>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center">
                <span className="text-sm font-bold text-brand-700">{companyInitials(company)}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="btn-ghost p-2"><Edit2 size={14} /></button>
                <button onClick={handleDelete} className="btn-ghost p-2 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{company.name}</h2>
            <span className={clsx('badge mt-1', COMPANY_TYPE_COLORS[company.type] || 'bg-gray-100 text-gray-600')}>
              {company.type}
            </span>

            {company.address && (
              <p className="text-sm text-gray-500 mt-3 flex items-start gap-1.5">
                <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />{company.address}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
              {company.email && <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600"><Mail size={14} className="text-gray-400" />{company.email}</a>}
              {company.phone && <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600"><Phone size={14} className="text-gray-400" />{company.phone}</a>}
              {company.website && (
                <a href={`https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
                  <Globe size={14} className="text-gray-400" />{company.website} <ExternalLink size={11} className="text-gray-400" />
                </a>
              )}
            </div>

            {company.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100">
                {company.tags.map(t => <span key={t} className="badge bg-brand-50 text-brand-600">{t}</span>)}
              </div>
            )}

            {company.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </div>

          {/* Contacts */}
          {relatedContacts.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">Contacts ({relatedContacts.length})</p>
              <div className="space-y-2">
                {relatedContacts.map(c => (
                  <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-brand-700">{c.firstName[0]}{c.lastName[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-800 group-hover:text-brand-600">{fullName(c)}</p>
                      {c.title && <p className="text-xs text-gray-400">{c.title}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Properties */}
          {(ownedProperties.length > 0 || tenantProperties.length > 0) && (
            <div className="card p-4">
              {ownedProperties.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Owns ({ownedProperties.length})</p>
                  <div className="space-y-1.5 mb-3">
                    {ownedProperties.map(p => (
                      <Link key={p.id} to={`/properties/${p.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600">
                        <MapPin size={12} className="text-gray-400" /><span className="truncate">{p.name}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
              {tenantProperties.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Tenancy ({tenantProperties.length})</p>
                  <div className="space-y-1.5">
                    {tenantProperties.map(p => (
                      <Link key={p.id} to={`/properties/${p.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600">
                        <MapPin size={12} className="text-gray-400" /><span className="truncate">{p.name}</span>
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

// ---- List ----
export default function Companies() {
  const { id } = useParams()
  if (id) return <CompanyDetail />

  const { companies, contacts, addCompany } = useCRM()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = companies.filter(c => {
    const q = search.toLowerCase()
    const matches = !q || c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    const type = !filterType || c.type === filterType
    return matches && type
  }).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="px-8 py-8 max-w-5xl">
      <PageHeader
        title="Companies"
        subtitle={`${companies.length} compan${companies.length !== 1 ? 'ies' : 'y'}`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Company</button>}
      />

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies..." className="input pl-9" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input w-40">
          <option value="">All types</option>
          {COMPANY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No companies found" action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add Company</button>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Contacts</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => {
                const compContacts = contacts.filter(ct => ct.companyId === c.id)
                return (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`/companies/${c.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-brand-700">{companyInitials(c)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 hover:text-brand-600">{c.name}</p>
                          {c.address && <p className="text-xs text-gray-400 truncate max-w-[200px]">{c.address}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={clsx('badge', COMPANY_TYPE_COLORS[c.type] || 'bg-gray-100 text-gray-600')}>{c.type}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">{compContacts.length}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        {c.email && <a href={`mailto:${c.email}`} className="text-gray-400 hover:text-brand-600"><Mail size={14} /></a>}
                        {c.phone && <a href={`tel:${c.phone}`} className="text-gray-400 hover:text-brand-600"><Phone size={14} /></a>}
                        {c.website && <a href={`https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-600"><Globe size={14} /></a>}
                      </div>
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
        <Modal title="Add Company" onClose={() => setShowAdd(false)} size="lg">
          <CompanyForm onSubmit={async (form) => { await addCompany(form); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}
