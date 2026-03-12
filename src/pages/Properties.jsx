import { useState, useRef, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, Users, Trash2, Edit2, ArrowLeft, Upload, MapPin, Briefcase, Calendar } from 'lucide-react'
import SearchableSelect from '../components/SearchableSelect'
import AddressAutocomplete from '../components/AddressAutocomplete'
import NumericInput from '../components/NumericInput'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { DEAL_TYPES, DEAL_STATUSES, DEAL_STATUS_COLORS, DEAL_TYPE_COLORS, formatDealType, formatDealStatus, fullName, formatDate, isOverdue, isDueToday } from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import ActivityFeed from '../components/ActivityFeed'
import ReminderList from '../components/ReminderList'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import ImportModal from '../components/ImportModal'
import DuplicateCheckModal from '../components/DuplicateCheckModal'

const BLANK = { name: '', address: '', dealType: '', status: '', size: '', sizeUnit: 'SF', dealValue: '', ownerCompanyId: '', tenantCompanyId: '', contactIds: [], notes: '', tags: [] }

function ContactSearch({ contacts, selected, onToggle }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedContacts = selected.map(id => contacts.find(c => c.id === id)).filter(Boolean)
  const matches = contacts.filter(c =>
    !selected.includes(c.id) &&
    (fullName(c).toLowerCase().includes(query.toLowerCase()) ||
     (c.title && c.title.toLowerCase().includes(query.toLowerCase())))
  )

  return (
    <div>
      <label className="label">Key contacts</label>
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedContacts.map(c => (
            <span key={c.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-xs font-medium">
              {fullName(c)}
              <button type="button" onClick={() => onToggle(c.id)} className="hover:bg-brand-200 dark:hover:bg-brand-800 rounded-full p-0.5 transition-colors">
                <span className="text-[10px] leading-none">✕</span>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative" ref={ref}>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search contacts..."
          className="input pl-9"
        />
        {open && query && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No contacts found</p>
            ) : (
              matches.slice(0, 8).map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onToggle(c.id); setQuery(''); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-brand-700 dark:text-brand-300">{c.firstName[0]}{c.lastName[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-gray-700 dark:text-gray-300">{fullName(c)}</span>
                    {c.title && <span className="text-gray-400 dark:text-gray-500 text-xs ml-1.5">· {c.title}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DealForm({ initial = BLANK, onSubmit, onCancel }) {
  const { companies, contacts, addCompany } = useCRM()
  const [form, setForm] = useState({ ...BLANK, ...initial })
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const setField = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

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
        <label className="label">Address *</label>
        <AddressAutocomplete
          value={form.address}
          onChange={setField('address')}
          required
        />
      </div>
      <div>
        <label className="label">Deal name</label>
        <input value={form.name} onChange={f('name')} className="input" placeholder="e.g. 1440 Broadway Acquisition" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Deal type</label>
          <select value={form.dealType} onChange={f('dealType')} className="input">
            <option value="">— Select —</option>
            {[...DEAL_TYPES].sort((a, b) => formatDealType(a).localeCompare(formatDealType(b))).map(t => <option key={t} value={t}>{formatDealType(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select value={form.status} onChange={f('status')} className="input">
            <option value="">— Select —</option>
            {[...DEAL_STATUSES].sort((a, b) => formatDealStatus(a).localeCompare(formatDealStatus(b))).map(s => <option key={s} value={s}>{formatDealStatus(s)}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Size</label>
          <NumericInput
            value={form.size}
            onChange={v => setForm(p => ({ ...p, size: v }))}
            placeholder="0"
          />
        </div>
        <div>
          <label className="label">Unit</label>
          <select value={form.sizeUnit} onChange={f('sizeUnit')} className="input">
            {['AC', 'keys', 'SF', 'units'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Deal value ($)</label>
          <NumericInput
            value={form.dealValue}
            onChange={v => setForm(p => ({ ...p, dealValue: v }))}
            decimals
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Owner / Sponsor</label>
          <SearchableSelect
            value={form.ownerCompanyId}
            onChange={setField('ownerCompanyId')}
            options={[...companies].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name }))}
            placeholder="Search or create company..."
            createLabel="Create"
            onCreate={async (name) => {
              const created = await addCompany({ name })
              setField('ownerCompanyId')(created.id)
            }}
          />
        </div>
        <div>
          <label className="label">Seller / Lender</label>
          <SearchableSelect
            value={form.tenantCompanyId}
            onChange={setField('tenantCompanyId')}
            options={[...companies].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name }))}
            placeholder="Search or create company..."
            createLabel="Create"
            onCreate={async (name) => {
              const created = await addCompany({ name })
              setField('tenantCompanyId')(created.id)
            }}
          />
        </div>
      </div>
      <ContactSearch
        contacts={contacts}
        selected={form.contactIds}
        onToggle={toggleContact}
      />
      <div>
        <label className="label">Tags</label>
        <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="input resize-y" placeholder="Key details, deal notes..." />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1">Save Deal</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

// ---- Detail ----
function DealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getProperty, getCompany, getContact, updateProperty, deleteProperty } = useCRM()
  const [editing, setEditing] = useState(false)

  const deal = getProperty(id)
  if (!deal) return <div className="p-8 text-gray-400 dark:text-gray-500">Deal not found.</div>

  const owner   = getCompany(deal.ownerCompanyId)
  const tenant  = getCompany(deal.tenantCompanyId)
  const keyContacts = (deal.contactIds || []).map(getContact).filter(Boolean)

  async function handleUpdate(form) { await updateProperty(id, form); setEditing(false) }
  async function handleDelete() {
    if (confirm(`Delete ${deal.name || deal.address}?`)) { await deleteProperty(id); navigate('/properties') }
  }

  return (
    <div className="px-8 py-8">
      <Link to="/properties" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6">
        <ArrowLeft size={15} /> Deals
      </Link>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {deal.status && (
                  <span className={clsx('badge text-sm px-3 py-1', DEAL_STATUS_COLORS[deal.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                    {formatDealStatus(deal.status)}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(true)} className="btn-ghost p-2"><Edit2 size={14} /></button>
                <button onClick={handleDelete} className="btn-ghost p-2 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{deal.name || deal.address}</h2>
            {deal.dealType && (
              <span className={clsx('badge mt-1', DEAL_TYPE_COLORS[deal.dealType] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                {formatDealType(deal.dealType)}
              </span>
            )}
            {deal.name && deal.address && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-start gap-1.5">
                <MapPin size={13} className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" /> {deal.address}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
              {deal.dealValue && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Deal value</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">${Number(deal.dealValue).toLocaleString()}</span>
                </div>
              )}
              {deal.size && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Size</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{Number(deal.size).toLocaleString()} {deal.sizeUnit}</span>
                </div>
              )}
            </div>

            {(owner || tenant) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                {owner && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Owner / Sponsor</p>
                    <Link to={`/companies/${owner.id}`} className="text-sm text-brand-600 hover:underline dark:text-brand-400 flex items-center gap-1.5">
                      <Building2 size={13} /> {owner.name}
                    </Link>
                  </div>
                )}
                {tenant && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Seller / Lender</p>
                    <Link to={`/companies/${tenant.id}`} className="text-sm text-brand-600 hover:underline dark:text-brand-400 flex items-center gap-1.5">
                      <Building2 size={13} /> {tenant.name}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {keyContacts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Key contacts</p>
                <div className="space-y-2">
                  {keyContacts.map(c => (
                    <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400">
                      <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">{c.firstName[0]}{c.lastName[0]}</span>
                      </div>
                      <span className="truncate">{fullName(c)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {deal.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {deal.tags.map(t => <span key={t} className="badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>)}
              </div>
            )}

            {deal.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{deal.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <ReminderList propertyId={id} />
          <ActivityFeed propertyId={id} />
        </div>
      </div>

      {editing && (
        <Modal title="Edit Deal" onClose={() => setEditing(false)} size="lg" disableBackdropClose>
          <DealForm initial={deal} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  )
}

// ---- Next Step helper ----
function NextStepCell({ dealId }) {
  const { remindersFor } = useCRM()
  const pending = remindersFor('propertyId', dealId).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  if (pending.length === 0) return <span className="text-gray-300 dark:text-gray-600">—</span>
  const next = pending[0]
  const overdue = isOverdue(next.dueDate)
  const today = isDueToday(next.dueDate)
  return (
    <div className="min-w-0">
      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{next.title}</p>
      <p className={clsx('text-[11px] flex items-center gap-1', overdue ? 'text-red-500' : today ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500')}>
        <Calendar size={10} /> {formatDate(next.dueDate)}
      </p>
    </div>
  )
}

// ---- List ----
export default function Properties() {
  const { id } = useParams()
  if (id) return <DealDetail />

  const { properties, addProperty, updateProperty, getCompany, getContact } = useCRM()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [dupCheck, setDupCheck] = useState(null)

  const filtered = properties.filter(p => {
    const q = search.toLowerCase()
    const matches = !q || p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q)
    const type   = !filterType   || p.dealType === filterType
    const status = !filterStatus || p.status   === filterStatus
    return matches && type && status
  }).sort((a, b) => (a.name || a.address || '').localeCompare(b.name || b.address || ''))

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Deals"
        subtitle={`${properties.length} deal${properties.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="btn-secondary"><Upload size={15} /> Import CSV</button>
            <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Deal</button>
          </div>
        }
      />

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals..." className="input pl-9" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input w-44">
          <option value="">All types</option>
          {[...DEAL_TYPES].sort((a, b) => formatDealType(a).localeCompare(formatDealType(b))).map(t => <option key={t} value={t}>{formatDealType(t)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-44">
          <option value="">All statuses</option>
          {[...DEAL_STATUSES].sort((a, b) => formatDealStatus(a).localeCompare(formatDealStatus(b))).map(s => <option key={s} value={s}>{formatDealStatus(s)}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="No deals found" action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add Deal</button>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/80 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deal</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Contact</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Next Step</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filtered.map(p => {
                const owner = getCompany(p.ownerCompanyId)
                const firstContact = (p.contactIds || []).length > 0 ? getContact(p.contactIds[0]) : null
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/properties/${p.id}`} className="block min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-400 truncate">{p.name || p.address}</p>
                        {p.name && p.address && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{p.address}</p>}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {p.dealType ? (
                        <span className={clsx('badge text-[11px]', DEAL_TYPE_COLORS[p.dealType] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>{formatDealType(p.dealType)}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge text-[11px]', DEAL_STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>{formatDealStatus(p.status)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {owner ? (
                        <Link to={`/companies/${owner.id}`} className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 truncate block">{owner.name}</Link>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {firstContact ? (
                        <Link to={`/contacts/${firstContact.id}`} className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 truncate block">{fullName(firstContact)}</Link>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <NextStepCell dealId={p.id} />
                    </td>
                    <td className="px-4 py-3">
                      {p.tags?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.tags.slice(0, 3).map(t => <span key={t} className="badge text-[11px] bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>)}
                          {p.tags.length > 3 && <span className="text-[11px] text-gray-400 dark:text-gray-500">+{p.tags.length - 3}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Deal" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <DealForm onSubmit={async (form) => {
            const dup = properties.find(p =>
              (form.name && p.name && p.name.toLowerCase() === form.name.toLowerCase()) ||
              (form.address && p.address && p.address.toLowerCase() === form.address.toLowerCase())
            )
            if (dup) {
              setDupCheck({ newData: form, existing: dup })
            } else {
              await addProperty(form)
              setShowAdd(false)
            }
          }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {dupCheck && (
        <DuplicateCheckModal
          entityType="deal"
          matchFields={[
            { label: 'Name', existingVal: dupCheck.existing.name, newVal: dupCheck.newData.name },
            { label: 'Address', existingVal: dupCheck.existing.address, newVal: dupCheck.newData.address },
            { label: 'Deal Type', existingVal: formatDealType(dupCheck.existing.dealType), newVal: formatDealType(dupCheck.newData.dealType) },
            { label: 'Status', existingVal: formatDealStatus(dupCheck.existing.status), newVal: formatDealStatus(dupCheck.newData.status) },
            { label: 'Size', existingVal: dupCheck.existing.size ? `${dupCheck.existing.size} ${dupCheck.existing.sizeUnit}` : '', newVal: dupCheck.newData.size ? `${dupCheck.newData.size} ${dupCheck.newData.sizeUnit}` : '' },
            { label: 'Company', existingVal: getCompany(dupCheck.existing.ownerCompanyId)?.name, newVal: getCompany(dupCheck.newData.ownerCompanyId)?.name },
          ]}
          onAdd={async () => {
            await addProperty(dupCheck.newData)
            setDupCheck(null)
            setShowAdd(false)
          }}
          onMerge={async () => {
            const merged = {}
            for (const [k, v] of Object.entries(dupCheck.newData)) {
              if (k === 'tags' || k === 'contactIds') continue
              if (v && !dupCheck.existing[k]) merged[k] = v
            }
            if (dupCheck.newData.tags?.length) {
              merged.tags = [...new Set([...(dupCheck.existing.tags || []), ...dupCheck.newData.tags])]
            }
            if (dupCheck.newData.contactIds?.length) {
              merged.contactIds = [...new Set([...(dupCheck.existing.contactIds || []), ...dupCheck.newData.contactIds])]
            }
            await updateProperty(dupCheck.existing.id, merged)
            setDupCheck(null)
            setShowAdd(false)
          }}
          onCancel={() => setDupCheck(null)}
        />
      )}

      {showImport && (
        <ImportModal entity="properties" onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
