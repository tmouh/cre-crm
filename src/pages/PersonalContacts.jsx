import { useState, useCallback, useRef, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Search, Phone, Mail, Linkedin, Trash2, Share2, Lock, Users, X, CheckSquare, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useIntelligence } from '../hooks/useIntelligence'
import { fullName, initials, formatDate, daysDiff, CONTACT_FUNCTIONS, formatContactFunction } from '../utils/helpers'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import ShareModal from '../components/ShareModal'
import { ContactForm, ContactDetail } from './Contacts'

export default function PersonalContacts() {
  const { id } = useParams()
  if (id) return <ContactDetail backTo="/personal/contacts" />
  return <PersonalContactsList />
}

function PersonalContactsList() {
  const { personalContacts, companies, addContact, deleteContact, getCompany, teamMembers, shareContacts, makeContactsPrivate } = useCRM()
  const { contactHealth } = useIntelligence()
  const [search, setSearch] = useState('')
  const [filterFunction, setFilterFunction] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [showAdd, setShowAdd] = useState(false)
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

  const filtered = personalContacts.filter(c => {
    const q = search.toLowerCase()
    const matches = !q || fullName(c).toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q) || (c.tags || []).some(t => t.toLowerCase().includes(q))
    const fn = !filterFunction || c.contactFunction === filterFunction
    return matches && fn
  }).sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'name': cmp = fullName(a).localeCompare(fullName(b)); break
      case 'company': {
        const ca = getCompany(a.companyId)?.name || ''
        const cb = getCompany(b.companyId)?.name || ''
        cmp = ca.localeCompare(cb) || fullName(a).localeCompare(fullName(b)); break
      }
      case 'lastTouch': {
        const da = a.lastContacted || '', db = b.lastContacted || ''
        if (!da && !db) cmp = 0; else if (!da) cmp = 1; else if (!db) cmp = -1; else cmp = da.localeCompare(db); break
      }
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

  async function handleAdd(form) {
    await addContact({ ...form, visibility: form.visibility || 'private' })
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
      {[...selected].some(id => personalContacts.find(c => c.id === id)?.visibility === 'shared') && (
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search my contacts..." className="v-input pl-7 text-[11px]" />
        </div>
        <select value={filterFunction} onChange={e => setFilterFunction(e.target.value)} className="v-select w-32 text-[11px]">
          <option value="">All functions</option>
          {CONTACT_FUNCTIONS.map(fn => <option key={fn} value={fn}>{formatContactFunction(fn)}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">{filtered.length} / {personalContacts.length} mine</span>
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
            title="No personal contacts"
            description="Add contacts here to keep them private, or import from Outlook and choose Personal."
            action={<button onClick={() => setShowAdd(true)} className="v-btn-primary"><Plus size={12} /> Add Contact</button>}
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
                  { field: 'name', label: 'Name' },
                  { field: 'company', label: 'Company' },
                  { field: null, label: 'Contact' },
                  { field: null, label: 'Visibility' },
                  { field: null, label: 'Health' },
                  { field: 'lastTouch', label: 'Last Touch' },
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
                const company = getCompany(c.companyId)
                const stale = c.lastContacted && daysDiff(c.lastContacted) >= 90
                const ch = contactHealth.find(h => h.id === c.id)
                const healthScore = ch?.healthScore ?? 0
                const healthLbl = ch?.healthLabel || 'cold'
                const isSelected = selected.has(c.id)
                return (
                  <tr key={c.id} className={clsx(isSelected && '!bg-brand-50/50 dark:!bg-brand-900/10')}>
                    <td>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(c.id)}
                        className="w-3.5 h-3.5 border-slate-300 text-brand-600 cursor-pointer accent-brand-600" />
                    </td>
                    <td>
                      <Link to={`/personal/contacts/${c.id}`} className="flex items-center gap-2">
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
                      <div className="flex gap-1.5">
                        {(c.email || c.personalEmails?.length > 0 || c.sharedEmails?.length > 0) && <a href={`mailto:${c.email || c.personalEmails?.[0] || c.sharedEmails?.[0]}`} className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"><Mail size={12} /></a>}
                        {(c.phone || c.mobile || c.personalPhones?.length > 0 || c.sharedCellPhones?.length > 0) && <a href={`tel:${c.phone || c.mobile || c.personalPhones?.[0] || c.sharedCellPhones?.[0]}`} className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"><Phone size={12} /></a>}
                        {c.linkedIn && <a href={`https://${c.linkedIn}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"><Linkedin size={12} /></a>}
                      </div>
                    </td>
                    <td>
                      {(c.visibility || 'shared') === 'private' ? (
                        <span className="v-badge bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 flex items-center gap-0.5 w-fit"><Lock size={9} /> Private</span>
                      ) : (
                        <span className="v-badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300 flex items-center gap-0.5 w-fit"><Users size={9} /> Shared</span>
                      )}
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
        <span>{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</span>
        <span className="text-slate-400 dark:text-slate-500">·</span>
        <span>{personalContacts.filter(c => (c.visibility || 'shared') === 'private').length} private</span>
        <span className="text-slate-400 dark:text-slate-500">·</span>
        <span>{personalContacts.filter(c => (c.visibility || 'shared') === 'shared').length} shared</span>
      </div>

      {showAdd && (
        <Modal title="Add Contact" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <ContactForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} defaultVisibility="private" />
        </Modal>
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
