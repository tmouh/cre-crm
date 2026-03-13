import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowLeft, Edit2, Trash2, Database, Filter, Download, Upload } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { ASSET_TYPES, formatAssetType, formatCurrency, formatPercent, formatPSF, formatDate } from '../utils/helpers'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import NumericInput from '../components/NumericInput'
import AddressAutocomplete from '../components/AddressAutocomplete'
import CompanyNameCombobox from '../components/CompanyNameCombobox'
import EmptyState from '../components/EmptyState'
import ImportModal from '../components/ImportModal'

const BLANK = { address: '', propertyType: '', salePrice: '', capRate: '', pricePerSf: '', noi: '', size: '', sizeUnit: 'SF', saleDate: '', buyer: '', seller: '', market: '', submarket: '', yearBuilt: '', notes: '', tags: [], propertyId: '' }

function CompForm({ initial = BLANK, onSubmit, onCancel, properties }) {
  const [form, setForm] = useState({ ...BLANK, ...initial, saleDate: initial.saleDate ? initial.saleDate.slice(0, 10) : '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.address.trim()) { setError('Address is required.'); return }
    if (!form.propertyType) { setError('Property type is required.'); return }
    if (!form.salePrice) { setError('Sale price is required.'); return }
    setSaving(true)
    try {
      await onSubmit({ ...form, saleDate: form.saleDate ? new Date(form.saleDate + 'T00:00:00').toISOString() : null })
    } catch (err) {
      setError(err?.message || 'Failed to save comp.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 border border-red-200 dark:border-red-800">{error}</p>}
      <div>
        <label className="v-label">Address <span className="text-red-500">*</span></label>
        <AddressAutocomplete value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="v-label">Property type <span className="text-red-500">*</span></label>
          <select value={form.propertyType} onChange={f('propertyType')} className="v-input">
            <option value="">— Select —</option>
            {ASSET_TYPES.map(t => <option key={t} value={t}>{formatAssetType(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="v-label">Sale date</label>
          <input type="date" value={form.saleDate} onChange={f('saleDate')} className="v-input" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="v-label">Sale price ($) <span className="text-red-500">*</span></label>
          <NumericInput value={form.salePrice} onChange={v => setForm(p => ({ ...p, salePrice: v }))} decimals placeholder="0" />
        </div>
        <div>
          <label className="v-label">Cap rate (%)</label>
          <NumericInput value={form.capRate} onChange={v => setForm(p => ({ ...p, capRate: v }))} decimals placeholder="0.00" />
        </div>
        <div>
          <label className="v-label">$/SF</label>
          <NumericInput value={form.pricePerSf} onChange={v => setForm(p => ({ ...p, pricePerSf: v }))} decimals placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="v-label">NOI ($)</label>
          <NumericInput value={form.noi} onChange={v => setForm(p => ({ ...p, noi: v }))} decimals placeholder="0" />
        </div>
        <div>
          <label className="v-label">Size</label>
          <NumericInput value={form.size} onChange={v => setForm(p => ({ ...p, size: v }))} placeholder="0" />
        </div>
        <div>
          <label className="v-label">Unit</label>
          <select value={form.sizeUnit} onChange={f('sizeUnit')} className="v-input">
            {['AC', 'keys', 'SF', 'units'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="v-label">Buyer</label>
          <CompanyNameCombobox value={form.buyer} onChange={v => setForm(p => ({ ...p, buyer: v }))} placeholder="Search companies or type name..." />
        </div>
        <div>
          <label className="v-label">Seller</label>
          <CompanyNameCombobox value={form.seller} onChange={v => setForm(p => ({ ...p, seller: v }))} placeholder="Search companies or type name..." />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="v-label">Market</label>
          <input value={form.market} onChange={f('market')} className="v-input" placeholder="e.g. NYC Metro" />
        </div>
        <div>
          <label className="v-label">Submarket</label>
          <input value={form.submarket} onChange={f('submarket')} className="v-input" placeholder="e.g. Midtown" />
        </div>
        <div>
          <label className="v-label">Year built</label>
          <input type="number" value={form.yearBuilt} onChange={f('yearBuilt')} className="v-input" placeholder="2005" />
        </div>
      </div>
      {properties?.length > 0 && (
        <div>
          <label className="v-label">Link to deal</label>
          <select value={form.propertyId || ''} onChange={f('propertyId')} className="v-input">
            <option value="">— None —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name || p.address}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="v-label">Tags</label>
        <TagInput tags={form.tags || []} onChange={(tags) => setForm(p => ({ ...p, tags }))} />
      </div>
      <div>
        <label className="v-label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="v-input resize-y" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="v-btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving…' : 'Save Comp'}</button>
        <button type="button" onClick={onCancel} className="v-btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

function CompDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { comps, updateComp, deleteComp, properties } = useCRM()
  const [editing, setEditing] = useState(false)

  const comp = comps.find(c => c.id === id)
  if (!comp) return <div className="p-6 text-slate-400 font-mono text-[12px]">Comp not found.</div>

  const linkedDeal = comp.propertyId ? properties.find(p => p.id === comp.propertyId) : null

  return (
    <div className="px-6 py-6 max-w-3xl">
      <Link to="/comps" className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4">
        <ArrowLeft size={12} /> Comps
      </Link>
      <div className="os-zone p-4">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 font-mono">{comp.address}</h2>
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} className="v-btn-ghost p-1.5"><Edit2 size={13} /></button>
            <button onClick={async () => { if (confirm('Delete this comp?')) { await deleteComp(id); navigate('/comps') } }} className="v-btn-ghost p-1.5 hover:text-red-500"><Trash2 size={13} /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
          {comp.propertyType && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Type</span><p className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatAssetType(comp.propertyType)}</p></div>}
          {comp.saleDate && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Sale date</span><p className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatDate(comp.saleDate)}</p></div>}
          {comp.salePrice && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Sale price</span><p className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(comp.salePrice)}</p></div>}
          {comp.capRate && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Cap rate</span><p className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatPercent(comp.capRate)}</p></div>}
          {comp.pricePerSf && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">$/SF</span><p className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatPSF(comp.pricePerSf)}</p></div>}
          {comp.noi && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">NOI</span><p className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(comp.noi)}</p></div>}
          {comp.size && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Size</span><p className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{Number(comp.size).toLocaleString()} {comp.sizeUnit}</p></div>}
          {comp.buyer && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Buyer</span><p className="font-mono text-slate-900 dark:text-slate-100">{comp.buyer}</p></div>}
          {comp.seller && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Seller</span><p className="font-mono text-slate-900 dark:text-slate-100">{comp.seller}</p></div>}
          {comp.market && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Market</span><p className="font-mono text-slate-900 dark:text-slate-100">{comp.market}</p></div>}
          {comp.submarket && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Submarket</span><p className="font-mono text-slate-900 dark:text-slate-100">{comp.submarket}</p></div>}
          {comp.yearBuilt && <div><span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Year built</span><p className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{comp.yearBuilt}</p></div>}
        </div>

        {linkedDeal && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">Linked deal</p>
            <Link to={`/deals/${linkedDeal.id}`} className="text-[12px] text-brand-600 hover:underline dark:text-brand-400 font-mono">{linkedDeal.name || linkedDeal.address}</Link>
          </div>
        )}

        {comp.notes && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">Notes</p>
            <p className="text-[12px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comp.notes}</p>
          </div>
        )}

        {comp.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[var(--border)]">
            {comp.tags.map(t => <span key={t} className="v-badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">{t}</span>)}
          </div>
        )}
      </div>

      {editing && (
        <Modal title="Edit Comp" onClose={() => setEditing(false)} size="lg" disableBackdropClose>
          <CompForm initial={comp} properties={properties} onSubmit={async (form) => { await updateComp(id, form); setEditing(false) }} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  )
}

export default function Comps() {
  const { id } = useParams()
  if (id) return <CompDetail />

  const { comps, addComp, properties } = useCRM()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterMarket, setFilterMarket] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [sortField, setSortField] = useState('saleDate')
  const [sortDir, setSortDir] = useState('desc')

  const markets = [...new Set(comps.map(c => c.market).filter(Boolean))].sort()

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const filtered = comps.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.address?.toLowerCase().includes(q) || c.buyer?.toLowerCase().includes(q) || c.seller?.toLowerCase().includes(q) || c.market?.toLowerCase().includes(q)
    const matchType = !filterType || c.propertyType === filterType
    const matchMarket = !filterMarket || c.market === filterMarket
    return matchSearch && matchType && matchMarket
  }).sort((a, b) => {
    const av = a[sortField], bv = b[sortField]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  function exportCSV() {
    const headers = ['Address', 'Type', 'Sale Price', 'Cap Rate', '$/SF', 'NOI', 'Size', 'Unit', 'Sale Date', 'Buyer', 'Seller', 'Market', 'Submarket']
    const rows = filtered.map(c => [c.address, formatAssetType(c.propertyType), c.salePrice || '', c.capRate || '', c.pricePerSf || '', c.noi || '', c.size || '', c.sizeUnit || '', c.saleDate ? c.saleDate.slice(0, 10) : '', c.buyer || '', c.seller || '', c.market || '', c.submarket || ''])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'comps-export.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const SortHeader = ({ field, children, className }) => (
    <th onClick={() => handleSort(field)} className={clsx('cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none', className)}>
      {children} {sortField === field && (sortDir === 'asc' ? '↑' : '↓')}
    </th>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="os-toolbar flex-shrink-0">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Comps</span>
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{comps.length} record{comps.length !== 1 ? 's' : ''}</span>
        <div className="flex-1" />
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="v-input pl-7 w-48 text-[11px]" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="v-input w-32 text-[11px]">
          <option value="">All types</option>
          {ASSET_TYPES.map(t => <option key={t} value={t}>{formatAssetType(t)}</option>)}
        </select>
        {markets.length > 0 && (
          <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)} className="v-input w-32 text-[11px]">
            <option value="">All markets</option>
            {markets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <button onClick={() => setShowImport(true)} className="v-btn-secondary"><Upload size={12} /> Import</button>
        <button onClick={exportCSV} className="v-btn-secondary"><Download size={12} /> Export</button>
        <button onClick={() => setShowAdd(true)} className="v-btn-primary"><Plus size={12} /> Add Comp</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <EmptyState icon={Database} title="No comps found" action={<button onClick={() => setShowAdd(true)} className="v-btn-primary"><Plus size={12} /> Add Comp</button>} />
        ) : (
          <table className="v-table">
            <thead className="sticky top-0 z-10">
              <tr>
                <SortHeader field="address">Address</SortHeader>
                <SortHeader field="propertyType">Type</SortHeader>
                <SortHeader field="salePrice">Sale Price</SortHeader>
                <SortHeader field="capRate">Cap Rate</SortHeader>
                <SortHeader field="pricePerSf">$/SF</SortHeader>
                <SortHeader field="size">Size</SortHeader>
                <SortHeader field="saleDate">Sale Date</SortHeader>
                <th>Market</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/comps/${c.id}`} className="text-[12px] font-medium text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400">{c.address}</Link>
                    {c.buyer && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{c.buyer} → {c.seller || '?'}</p>}
                  </td>
                  <td className="text-slate-600 dark:text-slate-400">{formatAssetType(c.propertyType) || '—'}</td>
                  <td className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">{formatCurrency(c.salePrice)}</td>
                  <td className="font-mono tabular-nums text-slate-600 dark:text-slate-400">{formatPercent(c.capRate)}</td>
                  <td className="font-mono tabular-nums text-slate-600 dark:text-slate-400">{formatPSF(c.pricePerSf)}</td>
                  <td className="font-mono tabular-nums text-slate-600 dark:text-slate-400">{c.size ? `${Number(c.size).toLocaleString()} ${c.sizeUnit || 'SF'}` : '—'}</td>
                  <td className="font-mono tabular-nums text-slate-600 dark:text-slate-400">{c.saleDate ? formatDate(c.saleDate) : '—'}</td>
                  <td className="text-slate-600 dark:text-slate-400">{c.market || '—'}{c.submarket ? ` · ${c.submarket}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Status bar */}
      <div className="os-status-bar flex-shrink-0">
        <span>{filtered.length} of {comps.length} comps</span>
        {filterType && <span>Type: {formatAssetType(filterType)}</span>}
        {filterMarket && <span>Market: {filterMarket}</span>}
      </div>

      {showAdd && (
        <Modal title="Add Comp" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <CompForm properties={properties} onSubmit={async (form) => { await addComp(form); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {showImport && <ImportModal entity="comps" onClose={() => setShowImport(false)} />}
    </div>
  )
}
