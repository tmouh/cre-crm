import { useState, useCallback, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Search, Building2, Mail, Phone, Globe, Trash2, Share2, Lock, Users, X, CheckSquare } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { COMPANY_TYPE_COLORS, companyInitials } from '../utils/helpers'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import ShareModal from '../components/ShareModal'
import { CompanyForm, CompanyDetail } from './Companies'

export default function PersonalCompanies() {
  const { id } = useParams()
  if (id) return <CompanyDetail backTo="/personal/companies" />

  const { personalCompanies, contacts, addCompany, deleteCompany, teamMembers, shareCompanies, makeCompaniesPrivate } = useCRM()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [showShare, setShowShare] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
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
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = personalCompanies.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
  }).sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'name': cmp = a.name.localeCompare(b.name); break
      case 'type': cmp = (a.type || '').localeCompare(b.type || ''); break
      default: cmp = 0
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

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
      setSelected(prev => { const next = new Set(prev); filtered.forEach(c => next.delete(c.id)); return next })
    } else {
      setSelected(prev => { const next = new Set(prev); filtered.forEach(c => next.add(c.id)); return next })
    }
  }

  function clearSelection() { setSelected(new Set()) }

  async function handleShare(userIds) {
    setSharing(true)
    try {
      await shareCompanies([...selected], userIds)
      setShowShare(false)
      clearSelection()
    } finally {
      setSharing(false)
    }
  }

  async function handleMakePrivate() {
    if (!confirm(`Make ${selected.size} compan${selected.size !== 1 ? 'ies' : 'y'} private? They will be removed from the shared CRM.`)) return
    await makeCompaniesPrivate([...selected])
    clearSelection()
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} compan${selected.size !== 1 ? 'ies' : 'y'}? They will be moved to Recently Deleted.`)) return
    for (const cid of selected) await deleteCompany(cid)
    clearSelection()
  }

  async function handleAdd(form) {
    await addCompany({ ...form, visibility: form.visibility || 'private' })
    setShowAdd(false)
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
      {[...selected].some(id => personalCompanies.find(c => c.id === id)?.visibility === 'shared') && (
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

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="os-toolbar flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search my companies..." className="v-input pl-7 text-[11px]" />
        </div>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">{filtered.length} / {personalCompanies.length} mine</span>
        <div className="flex gap-1">
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

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={Lock}
            title="No personal companies"
            description="Add companies here to keep them private to yourself."
            action={<button onClick={() => setShowAdd(true)} className="v-btn-primary"><Plus size={12} /> Add Company</button>}
          />
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
                  { field: 'name', label: 'Company' },
                  { field: 'type', label: 'Type' },
                  { field: null, label: 'Contacts' },
                  { field: null, label: 'Visibility' },
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
                const compContacts = contacts.filter(ct => ct.companyId === c.id)
                const isSelected = selected.has(c.id)
                return (
                  <tr key={c.id} className={clsx(isSelected && '!bg-brand-50/50 dark:!bg-brand-900/10')}>
                    <td>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(c.id)}
                        className="w-3.5 h-3.5 border-slate-300 text-brand-600 cursor-pointer accent-brand-600" />
                    </td>
                    <td>
                      <Link to={`/personal/companies/${c.id}`} className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 bg-brand-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-white font-mono">{companyInitials(c)}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[12px] font-medium text-slate-800 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400">{c.name}</span>
                          {c.address && <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate block max-w-[180px]">{c.address}</span>}
                        </div>
                      </Link>
                    </td>
                    <td>
                      {c.type ? (
                        <span className={clsx('v-badge', COMPANY_TYPE_COLORS[c.type] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                          {c.type.charAt(0).toUpperCase() + c.type.slice(1)}
                        </span>
                      ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td>
                      <span className="text-[12px] text-slate-500 dark:text-slate-400">{compContacts.length || '—'}</span>
                    </td>
                    <td>
                      {(c.visibility || 'shared') === 'private' ? (
                        <span className="v-badge bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 flex items-center gap-0.5 w-fit"><Lock size={9} /> Private</span>
                      ) : (
                        <span className="v-badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300 flex items-center gap-0.5 w-fit"><Users size={9} /> Shared</span>
                      )}
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

      {/* Status bar */}
      <div className="os-status-bar flex-shrink-0">
        <span>{filtered.length} compan{filtered.length !== 1 ? 'ies' : 'y'}</span>
        <span className="text-slate-400 dark:text-slate-500">·</span>
        <span>{personalCompanies.filter(c => (c.visibility || 'shared') === 'private').length} private</span>
        <span className="text-slate-400 dark:text-slate-500">·</span>
        <span>{personalCompanies.filter(c => (c.visibility || 'shared') === 'shared').length} shared</span>
      </div>

      {showAdd && (
        <Modal title="Add Company" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <CompanyForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} defaultVisibility="private" />
        </Modal>
      )}

      {showShare && (
        <ShareModal
          count={selected.size}
          entityLabel="company"
          teamMembers={teamMembers}
          onConfirm={handleShare}
          onCancel={() => setShowShare(false)}
          loading={sharing}
        />
      )}
    </div>
  )
}
