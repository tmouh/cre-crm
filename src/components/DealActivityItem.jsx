/**
 * DealActivityItem
 *
 * Renders a single deal_activity thread entry in the Activity Log.
 * One entry = one email thread (not one email per message).
 *
 * Shows: subject, linked contact/company/deal, message counts,
 * last-activity direction, and correction UI (change deal, dismiss).
 */

import { useState } from 'react'
import { Mail, ArrowUpRight, ArrowDownLeft, AlertCircle, ChevronDown, ChevronRight, Check, X, Zap } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DealActivityItem({ da }) {
  const { getContact, getCompany, getProperty, properties, updateDealActivity } = useCRM()
  const [expanded, setExpanded]     = useState(false)
  const [resolving, setResolving]   = useState(false)
  const [candidatePick, setCandidatePick] = useState('')

  const contact  = da.contactId  ? getContact(da.contactId)   : null
  const company  = da.companyId  ? getCompany(da.companyId)   : null
  const property = da.propertyId ? getProperty(da.propertyId) : null

  const needsReview = da.status === 'needs_review'
  const hasCandidates = (da.candidatePropertyIds || []).length > 1

  async function dismiss() {
    await updateDealActivity(da.id, { status: 'dismissed' }).catch(() => {})
  }

  async function confirm() {
    await updateDealActivity(da.id, { status: 'confirmed' }).catch(() => {})
  }

  async function resolveProperty() {
    if (!candidatePick) return
    await updateDealActivity(da.id, {
      propertyId: candidatePick,
      candidatePropertyIds: [],
      status: 'confirmed',
    }).catch(() => {})
    setResolving(false)
  }

  const DirectionIcon = da.lastDirection === 'inbound' ? ArrowDownLeft : ArrowUpRight
  const directionColor = da.lastDirection === 'inbound'
    ? 'text-green-500 dark:text-green-400'
    : 'text-blue-500 dark:text-blue-400'

  return (
    <div className={clsx(
      'rounded-lg border transition-colors',
      needsReview
        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10'
        : 'border-slate-100 bg-slate-50/30 dark:border-slate-700/40 dark:bg-slate-800/20',
    )}>
      {/* Main row */}
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        {/* Mail icon */}
        <div className={clsx(
          'w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5',
          needsReview
            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400',
        )}>
          <Mail size={13} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Subject + expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 w-full text-left group"
          >
            {expanded
              ? <ChevronDown size={11} className="flex-shrink-0 text-slate-400" />
              : <ChevronRight size={11} className="flex-shrink-0 text-slate-400" />
            }
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
              {da.subject || '(no subject)'}
            </span>
          </button>

          {/* Meta row: entities + count + time */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {contact && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {contact.firstName} {contact.lastName}
              </span>
            )}
            {company && (
              <>
                {contact && <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>}
                <span className="text-xs text-slate-500 dark:text-slate-400">{company.name}</span>
              </>
            )}
            {property && (
              <>
                <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
                <span className="text-xs text-brand-600 dark:text-brand-400 font-medium truncate max-w-[140px]">
                  {property.name || property.address}
                </span>
              </>
            )}
            {!property && hasCandidates && (
              <>
                <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
                <span className="text-xs text-amber-600 dark:text-amber-400 italic">deal unclear</span>
              </>
            )}
          </div>

          {/* Thread count + direction + time */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              {da.messageCount || 1} msg{(da.messageCount || 1) !== 1 ? 's' : ''}
            </span>
            <DirectionIcon size={10} className={directionColor} />
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {timeAgo(da.lastMessageAt)}
            </span>
            {needsReview && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                <AlertCircle size={10} /> Review
              </span>
            )}
            {da.status === 'confirmed' && (
              <span className="flex items-center gap-0.5 text-[10px] text-green-600 dark:text-green-400">
                <Check size={10} /> Confirmed
              </span>
            )}
            {da.confidence === 'high' && da.status === 'auto' && (
              <span className="flex items-center gap-0.5 text-[10px] text-blue-400 dark:text-blue-500">
                <Zap size={9} /> Auto
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {needsReview && (
            <button
              onClick={confirm}
              className="p-1 text-slate-300 hover:text-green-500 dark:text-slate-600 dark:hover:text-green-400 transition-colors"
              title="Confirm — looks right"
            >
              <Check size={12} />
            </button>
          )}
          <button
            onClick={dismiss}
            className="p-1 text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-colors"
            title="Dismiss — not deal activity"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700/40 pt-2 space-y-2">
          {/* Signals (why this was included) */}
          {(da.relevanceSignals || []).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Matched on</p>
              <div className="flex flex-wrap gap-1">
                {da.relevanceSignals.map((sig, i) => (
                  <span key={i} className={clsx(
                    'text-[10px] px-1.5 py-0.5 rounded font-medium',
                    sig.type === 'sharepoint_deal_folder'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      : sig.type === 'active_deal_match'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                  )}>
                    {sig.type === 'recipient_match'      && 'Contact matched'}
                    {sig.type === 'active_deal_match'    && 'Active deal link'}
                    {sig.type === 'address_match'        && 'Address in email'}
                    {sig.type === 'deal_keywords'        && 'Deal keywords'}
                    {sig.type === 'sharepoint_deal_folder' && '📁 SharePoint OM/UW folder'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Multi-deal disambiguation */}
          {hasCandidates && !da.propertyId && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                Multiple deals matched — pick one
              </p>
              {resolving ? (
                <div className="flex items-center gap-2">
                  <select
                    value={candidatePick}
                    onChange={e => setCandidatePick(e.target.value)}
                    className="v-input text-xs py-1 flex-1"
                  >
                    <option value="">Select deal...</option>
                    {(da.candidatePropertyIds || []).map(pid => {
                      const p = properties.find(x => x.id === pid)
                      return p ? <option key={pid} value={pid}>{p.name || p.address}</option> : null
                    })}
                  </select>
                  <button onClick={resolveProperty} className="v-btn-primary text-xs py-1">Link</button>
                  <button onClick={() => setResolving(false)} className="v-btn-secondary text-xs py-1">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setResolving(true)}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Pick the correct deal →
                </button>
              )}
            </div>
          )}

          {/* Manual deal override (when propertyId is set but might be wrong) */}
          {da.propertyId && !resolving && (
            <button
              onClick={() => { setCandidatePick(''); setResolving(true) }}
              className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
            >
              Wrong deal? Change it →
            </button>
          )}
          {resolving && da.propertyId && (
            <div className="flex items-center gap-2">
              <select
                value={candidatePick}
                onChange={e => setCandidatePick(e.target.value)}
                className="v-input text-xs py-1 flex-1"
              >
                <option value="">Select deal...</option>
                {properties.filter(p => !p.deletedAt).map(p => (
                  <option key={p.id} value={p.id}>{p.name || p.address}</option>
                ))}
              </select>
              <button onClick={resolveProperty} className="v-btn-primary text-xs py-1">Save</button>
              <button onClick={() => setResolving(false)} className="v-btn-secondary text-xs py-1">Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
