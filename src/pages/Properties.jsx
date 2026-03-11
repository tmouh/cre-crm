import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, MapPin, Building2, Users, Trash2, Edit2, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { PROPERTY_TYPES, PROPERTY_STATUSES, STATUS_COLORS, fullName, formatDate } from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import ActivityFeed from '../components/ActivityFeed'
import ReminderList from '../components/ReminderList'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

const BLANK = { name: '', address: '', type: 'office', subtype: '', size: '', sizeUnit: 'SF', status: 'available', askingRent: '', rentUnit: '/SF/yr', ownerCompanyId: '', tenantCompanyId: '', contactIds: [], floor: '', notes: '', tags: [] }

function PropertyForm({ initial = BLANK, onSubmit, onCancel }) {
  const { companies, contacts } = useCRM()
  const [form, setForm] = useState({ ...BLANK, ...initial })
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  function toggleContact(id) {
    setForm(p => ({
      ...p,
      contactIds: p.contactIds.includes(id)
        ? p.contactIds.filter(c => c !== id)
        : [...p.contactIds, id]
    }))
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="label">Property name *</label>
        <input value={form.name} onChange={f('name')} className="input" required placeholder="e.g. 1440 Broadway" />
      </div>
      <div>
        <label className="label">Address</label>
        <input value={form.address} onChange={f('address')} className="input" placeholder="Full address" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select value={form.type} onChange={f('type')} className="input">
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Subtype</label>
          <input value={form.subtype} onChange={f('subtype')} className="input" placeholder="e.g. Class A, Distribution" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Size</label>
          <input type="number" value={form.size} onChange={f('size')} className="input" placeholder="0" />
        </div>
        <div>
          <label className="label">Unit</label>
          <select value={form.sizeUnit} onChange={f('sizeUnit')} className="input">
            {['SF', 'AC', 'units', 'keys'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select value={form.status} onChange={f('status')} className="input">
            {PROPERTY_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Asking rent</label>
          <input type="number" step="0.01" value={form.askingRent} onChange={f('askingRent')} className="input" placeholder="0.00" />
        </div>
        <div>
          <label className="label">Rent unit</label>
          <select value={form.rentUnit} onChange={f('rentUnit')} className="input">
            {['/SF/yr', '/SF/mo', '/unit/mo', '/key/night', 'lump sum'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Owner / Landlord</label>
          <select value={form.ownerCompanyId} onChange={f('ownerCompanyId')} className="input">
            <option value="">— None —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tenant</label>
          <select value={form.tenantCompanyId} onChange={f('tenantCompanyId')} className="input">
            <option value="">— None —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Key contacts</label>
        <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
          {contacts.map(c => (
            <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
              <input type="checkbox" checked={form.contactIds.includes(c.id)} onChange={() => toggleContact(c.id)} className="rounded" />
              {fullName(c)} {c.title && <span className="text-gray-400 text-xs">· {c.title}</span>}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Floor / Suite</label>
        <input value={form.floor} onChange={f('floor')} className="input" placeholder="e.g. 14-22, Suite 400" />
      </div>
      <div>
        <label className="label">Tags</label>
        <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="input resize-none" placeholder="Key details, deal notes..." />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1">Save Property</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

// ---- Detail ----
function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getProperty, getCompany, getContact, updateProperty, deleteProperty } = useCRM()
  const [editing, setEditing] = useState(false)

  const property = getProperty(id)
  if (!property) return <div className="p-8 text-gray-400">Property not found.</div>

  const owner   = getCompany(property.ownerCompanyId)
  const tenant  = getCompany(property.tenantCompanyId)
  const keyContacts = (property.contactIds || []).map(getContact).filter(Boolean)

  function handleUpdate(form) { updateProperty(id, form); setEditing(false) }
  function handleDelete() {
    if (confirm(`Delete ${property.name}?`)) { deleteProperty(id); navigate('/properties') }
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <Link to="/properties" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={15} /> Properties
      </Link>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={clsx('badge text-sm px-3 py-1', STATUS_COLORS[property.status] || 'bg-gray-100 text-gray-600')}>
                {property.status}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="btn-ghost p-2"><Edit2 size={14} /></button>
                <button onClick={handleDelete} className="btn-ghost p-2 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{property.name}</h2>
            {property.subtype && <p className="text-sm text-gray-500">{property.type} · {property.subtype}</p>}
            {property.address && (
              <p className="text-sm text-gray-500 mt-1 flex items-start gap-1.5">
                <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" /> {property.address}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              {property.size && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Size</span>
                  <span className="font-medium">{Number(property.size).toLocaleString()} {property.sizeUnit}</span>
                </div>
              )}
              {property.askingRent && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Asking rent</span>
                  <span className="font-medium">${property.askingRent}{property.rentUnit}</span>
                </div>
              )}
              {property.floor && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Floor/Suite</span>
                  <span className="font-medium">{property.floor}</span>
                </div>
              )}
            </div>

            {(owner || tenant) && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {owner && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Owner</p>
                    <Link to={`/companies/${owner.id}`} className="text-sm text-brand-600 hover:underline flex items-center gap-1.5">
                      <Building2 size={13} /> {owner.name}
                    </Link>
                  </div>
                )}
                {tenant && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Tenant</p>
                    <Link to={`/companies/${tenant.id}`} className="text-sm text-brand-600 hover:underline flex items-center gap-1.5">
                      <Building2 size={13} /> {tenant.name}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {keyContacts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Key contacts</p>
                <div className="space-y-2">
                  {keyContacts.map(c => (
                    <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600">
                      <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-brand-700">{c.firstName[0]}{c.lastName[0]}</span>
                      </div>
                      <span className="truncate">{fullName(c)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {property.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100">
                {property.tags.map(t => <span key={t} className="badge bg-brand-50 text-brand-600">{t}</span>)}
              </div>
            )}

            {property.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{property.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <div className="card p-5"><ReminderList propertyId={id} /></div>
          <div className="card p-5"><ActivityFeed propertyId={id} /></div>
        </div>
      </div>

      {editing && (
        <Modal title="Edit Property" onClose={() => setEditing(false)} size="lg">
          <PropertyForm initial={property} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  )
}

// ---- List ----
export default function Properties() {
  const { id } = useParams()
  if (id) return <PropertyDetail />

  const { properties, addProperty, getCompany } = useCRM()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = properties.filter(p => {
    const q = search.toLowerCase()
    const matches = !q || p.name.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q)
    const type   = !filterType   || p.type   === filterType
    const status = !filterStatus || p.status === filterStatus
    return matches && type && status
  }).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="px-8 py-8 max-w-5xl">
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} propert${properties.length !== 1 ? 'ies' : 'y'}`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Property</button>}
      />

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search properties..." className="input pl-9" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input w-36">
          <option value="">All types</option>
          {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-40">
          <option value="">All statuses</option>
          {PROPERTY_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MapPin} title="No properties found" action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add Property</button>} />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(p => {
            const owner = getCompany(p.ownerCompanyId)
            return (
              <Link key={p.id} to={`/properties/${p.id}`} className="card p-5 hover:shadow-md transition-shadow block">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    {p.address && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={11} />{p.address}</p>}
                  </div>
                  <span className={clsx('badge', STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600')}>{p.status}</span>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span className="badge bg-gray-100 text-gray-600">{p.type}</span>
                  {p.size && <span>{Number(p.size).toLocaleString()} {p.sizeUnit}</span>}
                  {p.askingRent && <span>${p.askingRent}{p.rentUnit}</span>}
                </div>
                {owner && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Building2 size={11} />{owner.name}</p>
                )}
                {p.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {p.tags.map(t => <span key={t} className="badge bg-brand-50 text-brand-600">{t}</span>)}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Property" onClose={() => setShowAdd(false)} size="lg">
          <PropertyForm onSubmit={(form) => { addProperty(form); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}
