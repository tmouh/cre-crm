/**
 * DuplicateScanModal — shows all detected duplicate pairs for a given entity type
 * and lets the user merge or dismiss each one.
 */
import { useState } from 'react'
import { AlertTriangle, Merge, X, ChevronRight, ChevronLeft, CheckCircle2, Zap } from 'lucide-react'
import clsx from 'clsx'
import Modal from './Modal'
import { useCRM } from '../context/CRMContext'
import { fullName } from '../utils/helpers'

function ConfidenceBadge({ confidence }) {
  const cls =
    confidence >= 85 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
    confidence >= 65 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
  return <span className={clsx('v-badge', cls)}>{confidence}%</span>
}

function ContactPair({ pair, onMerge, onDismiss }) {
  const { a, b } = pair
  return (
    <PairCard
      pair={pair}
      fields={[
        { label: 'Name', aVal: fullName(a), bVal: fullName(b) },
        { label: 'Email', aVal: [a.email, ...(a.personalEmails || []), ...(a.sharedEmails || [])].filter(Boolean).join(', ') || '', bVal: [b.email, ...(b.personalEmails || []), ...(b.sharedEmails || [])].filter(Boolean).join(', ') || '' },
        { label: 'Phone', aVal: [a.phone, a.mobile, ...(a.personalPhones || []), ...(a.sharedCellPhones || [])].filter(Boolean).join(', ') || '', bVal: [b.phone, b.mobile, ...(b.personalPhones || []), ...(b.sharedCellPhones || [])].filter(Boolean).join(', ') || '' },
        { label: 'Title', aVal: a.title, bVal: b.title },
      ]}
      labelA={fullName(a)}
      labelB={fullName(b)}
      onMerge={onMerge}
      onDismiss={onDismiss}
    />
  )
}

function CompanyPair({ pair, onMerge, onDismiss }) {
  const { a, b } = pair
  return (
    <PairCard
      pair={pair}
      fields={[
        { label: 'Name', aVal: a.name, bVal: b.name },
        { label: 'Type', aVal: a.type, bVal: b.type },
        { label: 'Email', aVal: a.email, bVal: b.email },
        { label: 'Phone', aVal: a.phone, bVal: b.phone },
        { label: 'Website', aVal: a.website, bVal: b.website },
        { label: 'Address', aVal: a.address, bVal: b.address },
      ]}
      labelA={a.name}
      labelB={b.name}
      onMerge={onMerge}
      onDismiss={onDismiss}
    />
  )
}

function PairCard({ pair, fields, labelA, labelB, onMerge, onDismiss }) {
  return (
    <div className="border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-surface-50 dark:bg-surface-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
            {labelA} · {labelB}
          </span>
          <ConfidenceBadge confidence={pair.confidence} />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {pair.reasons.map(r => (
            <span key={r} className="v-badge bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">{r}</span>
          ))}
        </div>
      </div>

      {/* Side-by-side fields */}
      <table className="v-table text-[11px]">
        <thead>
          <tr>
            <th className="w-1/5">Field</th>
            <th className="w-[40%]">{labelA}</th>
            <th className="w-[40%]">{labelB}</th>
          </tr>
        </thead>
        <tbody>
          {fields.filter(f => f.aVal || f.bVal).map(({ label, aVal, bVal }) => {
            const diff = (aVal || '') !== (bVal || '')
            return (
              <tr key={label}>
                <td className="px-3 py-1.5 text-slate-400 dark:text-slate-500">{label}</td>
                <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{aVal || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                <td className={clsx('px-3 py-1.5', diff ? 'text-brand-600 dark:text-brand-400 font-medium' : 'text-slate-700 dark:text-slate-300')}>
                  {bVal || <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Actions */}
      <div className="px-3 py-2 bg-surface-50 dark:bg-surface-100 flex gap-2 border-t border-[var(--border)]">
        <button
          onClick={() => onMerge(pair, 'a')}
          className="v-btn text-2xs bg-brand-600 text-white hover:bg-brand-700 flex items-center gap-1"
        >
          <Merge size={11} /> Keep "{labelA}", fill from "{labelB}"
        </button>
        <button
          onClick={() => onMerge(pair, 'b')}
          className="v-btn text-2xs bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 flex items-center gap-1"
        >
          <Merge size={11} /> Keep "{labelB}", fill from "{labelA}"
        </button>
        <button
          onClick={() => onDismiss(pair.id)}
          className="v-btn text-2xs ml-auto flex items-center gap-1 text-slate-400 dark:text-slate-500"
        >
          <X size={11} /> Not a dup
        </button>
      </div>
    </div>
  )
}

export default function DuplicateScanModal({ entityType, pairs, onClose }) {
  const { updateContact, updateCompany, contacts, companies } = useCRM()
  const [dismissed, setDismissed] = useState(new Set())
  const [merged, setMerged] = useState(new Set())
  const [working, setWorking] = useState(null)

  const visible = pairs.filter(p => !dismissed.has(p.id) && !merged.has(p.id))
  const doneCount = dismissed.size + merged.size

  async function handleMerge(pair, keepSide) {
    setWorking(pair.id)
    const keeper = keepSide === 'a' ? pair.a : pair.b
    const donor  = keepSide === 'a' ? pair.b : pair.a

    const patch = {}
    const skipKeys = new Set(['id', 'createdAt', 'deletedAt'])

    for (const [k, v] of Object.entries(donor)) {
      if (skipKeys.has(k)) continue
      const existing = keeper[k]
      if (Array.isArray(v)) {
        if (v.length > 0 && (!existing || !existing.length)) patch[k] = v
        else if (v.length > 0 && existing?.length) patch[k] = [...new Set([...existing, ...v])]
      } else if (v && !existing) {
        patch[k] = v
      }
    }

    try {
      if (entityType === 'contact') {
        await updateContact(keeper.id, patch)
        // Soft-delete the donor — we don't hard-delete since it may have activity links
        // Instead just mark it for the user to clean up
      } else {
        await updateCompany(keeper.id, patch)
      }
      setMerged(prev => new Set([...prev, pair.id]))
    } catch { /* silently fail — user can retry */ }
    setWorking(null)
  }

  function handleDismiss(id) {
    setDismissed(prev => new Set([...prev, id]))
  }

  return (
    <Modal
      title={`Duplicate ${entityType === 'contact' ? 'Contacts' : 'Companies'} Scan`}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Zap size={13} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-[12px] text-amber-800 dark:text-amber-300 flex-1">
            Found <strong>{pairs.length}</strong> potential duplicate pair{pairs.length !== 1 ? 's' : ''}.
            {doneCount > 0 && <span className="ml-1 text-amber-600 dark:text-amber-400">{doneCount} resolved.</span>}
          </p>
          {doneCount > 0 && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium font-mono">
              {visible.length} remaining
            </span>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3" />
            <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">All resolved!</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Merged {merged.size} pair{merged.size !== 1 ? 's' : ''}. Dismissed {dismissed.size}.
            </p>
            <button onClick={onClose} className="v-btn-primary mt-4">Done</button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {visible.map(pair =>
              pair.entityType === 'contact' ? (
                <ContactPair
                  key={pair.id}
                  pair={pair}
                  onMerge={handleMerge}
                  onDismiss={handleDismiss}
                />
              ) : (
                <CompanyPair
                  key={pair.id}
                  pair={pair}
                  onMerge={handleMerge}
                  onDismiss={handleDismiss}
                />
              )
            )}
          </div>
        )}

        {working && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center rounded-lg">
            <span className="text-sm text-slate-500 dark:text-slate-400">Merging…</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
