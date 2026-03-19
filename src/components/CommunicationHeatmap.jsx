import { useState, useEffect, useMemo } from 'react'
import { Activity, Users } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { db } from '../lib/supabase'
import { fullName, initials } from '../utils/helpers'
import { Link } from 'react-router-dom'

const WEEKS = 26 // show 6 months

function daysSince(isoDate) {
  if (!isoDate) return Infinity
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24))
}

function recencyDot(days) {
  if (days <= 30) return 'bg-emerald-400 dark:bg-emerald-500'
  if (days <= 90) return 'bg-yellow-400 dark:bg-yellow-500'
  return 'bg-slate-300 dark:bg-slate-600'
}

function recencyLabel(days) {
  if (days === Infinity) return null
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 60) return '~1mo ago'
  return `${Math.floor(days / 30)}mo ago`
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoWeekKey(date) {
  const d = startOfWeek(date)
  return d.toISOString().slice(0, 10)
}

function formatWeekLabel(isoDate) {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CELL_COLORS = [
  'bg-slate-100 dark:bg-slate-700/50',           // 0 — empty
  'bg-brand-200 dark:bg-brand-900/50',            // 1
  'bg-brand-400 dark:bg-brand-700',               // 2–3
  'bg-brand-500 dark:bg-brand-600',               // 4–6
  'bg-brand-600 dark:bg-brand-500',               // 7+
]

function cellColor(count) {
  if (count === 0) return CELL_COLORS[0]
  if (count === 1) return CELL_COLORS[1]
  if (count <= 3) return CELL_COLORS[2]
  if (count <= 6) return CELL_COLORS[3]
  return CELL_COLORS[4]
}

export default function CommunicationHeatmap({ contactId }) {
  const { activitiesFor, properties, teamMembers, contacts } = useCRM()
  const [emailItems, setEmailItems] = useState([])
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (!contactId) return
    db.emailInteractions.forContact(contactId)
      .then(setEmailItems)
      .catch(() => {})
  }, [contactId])

  // Build 26-week grid
  const weeks = useMemo(() => {
    const now = new Date()
    const result = []
    for (let i = WEEKS - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      result.push(isoWeekKey(d))
    }
    return result
  }, [])

  // Count activities + emails per week
  const weekCounts = useMemo(() => {
    const manual = activitiesFor('contactId', contactId)
    const counts = {}
    weeks.forEach(w => { counts[w] = 0 })

    manual.forEach(a => {
      const d = a.date || a.createdAt
      if (!d) return
      const k = isoWeekKey(new Date(d))
      if (k in counts) counts[k]++
    })

    emailItems.forEach(e => {
      if (!e.receivedAt) return
      const k = isoWeekKey(new Date(e.receivedAt))
      if (k in counts) counts[k]++
    })

    return counts
  }, [activitiesFor, contactId, emailItems, weeks])

  const totalInteractions = Object.values(weekCounts).reduce((s, v) => s + v, 0)
  const activeWeeks = Object.values(weekCounts).filter(v => v > 0).length

  // "Who knows this contact" — team members who co-own deals containing this contact
  const whoKnows = useMemo(() => {
    const memberMap = new Map(teamMembers.map(m => [m.id, m]))
    const seen = new Set()
    const result = []

    // Deals that include this contact
    const relatedDeals = properties.filter(p => (p.contactIds || []).includes(contactId))
    relatedDeals.forEach(deal => {
      ;(deal.ownerIds || []).forEach(oid => {
        if (!seen.has(oid) && memberMap.has(oid)) {
          seen.add(oid)
          result.push({ member: memberMap.get(oid), via: deal.name || deal.address, viaId: deal.id })
        }
      })
    })

    // Also check contacts that share the same company and have the same owners
    const contact = contacts.find(c => c.id === contactId)
    if (contact?.companyId) {
      const companyContacts = contacts.filter(c => c.id !== contactId && c.companyId === contact.companyId)
      companyContacts.forEach(cc => {
        ;(cc.ownerIds || []).forEach(oid => {
          if (!seen.has(oid) && memberMap.has(oid)) {
            seen.add(oid)
            result.push({ member: memberMap.get(oid), via: `${fullName(cc)} (same company)`, viaId: null })
          }
        })
      })
    }

    return result
  }, [teamMembers, properties, contacts, contactId])

  // Per-member last email date (keyed on userId stored in email_interactions)
  const memberLastEmail = useMemo(() => {
    const map = {}
    emailItems.forEach(e => {
      if (!e.userId || !e.receivedAt) return
      if (!map[e.userId] || e.receivedAt > map[e.userId]) {
        map[e.userId] = e.receivedAt
      }
    })
    return map
  }, [emailItems])

  // Month labels for heatmap
  const monthLabels = useMemo(() => {
    const labels = []
    let lastMonth = null
    weeks.forEach((w, i) => {
      const d = new Date(w)
      const month = d.toLocaleDateString('en-US', { month: 'short' })
      if (month !== lastMonth) {
        labels.push({ index: i, label: month })
        lastMonth = month
      }
    })
    return labels
  }, [weeks])

  return (
    <div className="card overflow-hidden">
      {/* Heatmap */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity size={12} className="text-slate-400 dark:text-slate-500" />
          <span className="os-zone-title">Communication Activity</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto font-mono">
            {totalInteractions} total · {activeWeeks} active weeks
          </span>
        </div>

        {/* Month labels */}
        <div className="relative mb-1" style={{ height: 14 }}>
          <div className="flex gap-1">
            {weeks.map((_, i) => {
              const label = monthLabels.find(l => l.index === i)
              return (
                <div key={i} className="w-4 flex-shrink-0 text-[9px] text-slate-400 dark:text-slate-500 leading-none">
                  {label ? label.label : ''}
                </div>
              )
            })}
          </div>
        </div>

        {/* Cells */}
        <div className="flex gap-1">
          {weeks.map(w => {
            const count = weekCounts[w] || 0
            return (
              <div
                key={w}
                className={clsx('w-4 h-4 rounded-sm flex-shrink-0 cursor-default transition-transform hover:scale-110', cellColor(count))}
                onMouseEnter={e => setTooltip({ week: w, count, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip(null)}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Less</span>
          {CELL_COLORS.map((cls, i) => (
            <div key={i} className={clsx('w-3 h-3 rounded-sm', cls)} />
          ))}
          <span className="text-[10px] text-slate-400 dark:text-slate-500">More</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          {formatWeekLabel(tooltip.week)}: {tooltip.count} interaction{tooltip.count !== 1 ? 's' : ''}
        </div>
      )}

      {/* Who knows this contact */}
      {whoKnows.length > 0 && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={12} className="text-slate-400 dark:text-slate-500" />
            <span className="os-zone-title">Who Knows This Contact</span>
          </div>
          <div className="space-y-1.5">
            {whoKnows.map(({ member, via, viaId }, i) => {
              const lastEmail = memberLastEmail[member.id]
              const days = daysSince(lastEmail)
              const label = recencyLabel(days)
              return (
                <div key={i} className="flex items-center gap-2">
                  {/* Avatar with recency dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-6 h-6 bg-brand-600 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white font-mono">
                        {(member.displayName || member.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <span className={clsx('absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-surface-0', recencyDot(days))} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                        {member.displayName || member.email}
                      </p>
                      {label && (
                        <span className={clsx(
                          'text-[9px] font-mono flex-shrink-0',
                          days <= 30 ? 'text-emerald-500 dark:text-emerald-400' :
                          days <= 90 ? 'text-yellow-500 dark:text-yellow-400' :
                          'text-slate-400 dark:text-slate-500'
                        )}>
                          {label}
                        </span>
                      )}
                    </div>
                    {via && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        via{' '}
                        {viaId ? (
                          <Link to={`/deals/${viaId}`} className="hover:text-brand-500 dark:hover:text-brand-400">{via}</Link>
                        ) : via}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
