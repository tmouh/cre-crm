import { useState } from 'react'
import { X, Share2, Users, Check } from 'lucide-react'
import clsx from 'clsx'

/**
 * ShareModal — select which team members to share contacts/companies with.
 * Props:
 *   count        — number of items being shared
 *   entityLabel  — 'contact' | 'company' (default 'contact')
 *   teamMembers  — array from CRMContext
 *   onConfirm(userIds | null) — null means all team members
 *   onCancel
 *   loading
 */
export default function ShareModal({ count, entityLabel = 'contact', teamMembers, onConfirm, onCancel, loading }) {
  // null = all team; Set of UUIDs = specific users
  const [shareAll, setShareAll] = useState(true)
  const [selected, setSelected] = useState(new Set())

  const allChecked = shareAll || selected.size === teamMembers.length

  function toggleAll() {
    if (allChecked) {
      setShareAll(false)
      setSelected(new Set())
    } else {
      setShareAll(true)
      setSelected(new Set())
    }
  }

  function toggleMember(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (next.size === teamMembers.length) {
          setShareAll(true)
          return new Set()
        }
      }
      setShareAll(false)
      return next
    })
  }

  const canConfirm = shareAll || selected.size > 0

  function handleConfirm() {
    onConfirm(shareAll || selected.size === teamMembers.length ? null : [...selected])
  }

  const label = count === 1 ? `1 ${entityLabel}` : `${count} ${entityLabel}s`

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Share2 size={14} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
              Share {label}
            </h2>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Choose who can see {count === 1 ? 'this' : 'these'} {entityLabel}{count !== 1 ? 's' : ''} in the shared CRM.
          </p>

          {/* All team members option */}
          <label className={clsx(
            'flex items-center gap-2.5 px-3 py-2 border cursor-pointer transition-colors',
            allChecked
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
              : 'border-[var(--border)] hover:border-slate-400 dark:hover:border-slate-500'
          )}>
            <div className={clsx('w-4 h-4 flex items-center justify-center border transition-colors', allChecked ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-600')}>
              {allChecked && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1"><Users size={11} /> All team members</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Everyone can see this in Shared CRM.</p>
            </div>
            <input type="checkbox" checked={allChecked} onChange={toggleAll} className="sr-only" />
          </label>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">or select specific</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Individual members */}
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {teamMembers.map(m => {
              const isChecked = allChecked || selected.has(m.id)
              return (
                <label key={m.id} className={clsx(
                  'flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors',
                  isChecked ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                )}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => { if (!shareAll) toggleMember(m.id); else { setShareAll(false); setSelected(new Set(teamMembers.filter(tm => tm.id !== m.id).map(tm => tm.id))) } }}
                    className="w-3.5 h-3.5 border-slate-300 text-brand-600 cursor-pointer accent-brand-600"
                  />
                  <div className="w-5 h-5 bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-[8px] font-bold text-white font-mono">{(m.displayName || m.email)[0].toUpperCase()}</span>
                  </div>
                  <span className="text-[11px] text-slate-700 dark:text-slate-300">{m.displayName || m.email}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="v-btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Share2 size={12} />
            {loading ? 'Sharing…' : `Share ${label}`}
          </button>
          <button onClick={onCancel} disabled={loading} className="v-btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
