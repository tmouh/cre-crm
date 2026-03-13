import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Users, Building2, Briefcase, Bell,
  AlertTriangle, Clock, CheckCircle2, ArrowRight, Activity,
  Calendar, Flame, Snowflake, Zap,
} from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useMicrosoft } from '../context/MicrosoftContext'
import { useIntelligence } from '../hooks/useIntelligence'
import {
  formatCurrency, formatDate, fullName, isOverdue, isDueToday,
  formatDealStatus, formatDealType, DEAL_STATUS_COLORS,
  PRIORITY_COLORS, TYPE_COLORS,
} from '../utils/helpers'

export default function Dashboard() {
  const { contacts, companies, properties, reminders, activities } = useCRM()
  const { isConnected, upcomingEvents } = useMicrosoft()
  const {
    hotDeals, stalledDeals, staleContacts,
    suggestedFollowUps, pipelineStats, communicationStats,
  } = useIntelligence()

  const pendingReminders = useMemo(() =>
    reminders
      .filter(r => r.status !== 'done')
      .sort((a, b) => {
        const aOverdue = isOverdue(a.dueDate) ? 0 : isDueToday(a.dueDate) ? 1 : 2
        const bOverdue = isOverdue(b.dueDate) ? 0 : isDueToday(b.dueDate) ? 1 : 2
        if (aOverdue !== bOverdue) return aOverdue - bOverdue
        return (a.dueDate || '').localeCompare(b.dueDate || '')
      }),
    [reminders]
  )

  const overdueCount = pendingReminders.filter(r => isOverdue(r.dueDate)).length
  const todayCount = pendingReminders.filter(r => isDueToday(r.dueDate)).length
  const activeDeals = properties.filter(p => p.status !== 'closed' && p.status !== 'dead')

  const recentActivities = useMemo(() =>
    [...activities].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 8),
    [activities]
  )

  return (
    <div className="animate-fade-in h-full flex flex-col">
      {/* ─ Status strip ─ */}
      <div className="flex items-center border-b border-[var(--border)] bg-surface-0 px-4 py-1.5 gap-6 flex-shrink-0">
        <StatusMetric label="CONTACTS" value={contacts.length} to="/contacts" />
        <StatusMetric label="COMPANIES" value={companies.length} to="/companies" />
        <StatusMetric label="ACTIVE DEALS" value={activeDeals.length} to="/deals" accent />
        <StatusMetric label="PIPELINE" value={formatCurrency(pipelineStats.totalValue)} to="/pipeline" />
        <div className="w-px h-4 bg-[var(--border)]" />
        <StatusMetric label="OVERDUE" value={overdueCount} to="/reminders" warn={overdueCount > 0} />
        <StatusMetric label="DUE TODAY" value={todayCount} to="/reminders" warn={todayCount > 0} />
        <div className="flex-1" />
        <PipelineBar stats={pipelineStats} />
      </div>

      {/* ─ Main grid ─ */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-3 h-full" style={{ gridTemplateRows: '1fr 1fr' }}>
          {/* ─ Zone 1: Tasks ─ */}
          <div className="border-r border-b border-[var(--border)] flex flex-col overflow-hidden">
            <ZoneHeader title="Priority Tasks" icon={Bell} badge={overdueCount + todayCount} to="/reminders" />
            <div className="flex-1 overflow-auto">
              {pendingReminders.length === 0 ? (
                <EmptyZone text="All caught up" icon={CheckCircle2} />
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] dark:divide-[var(--border)]">
                  {pendingReminders.slice(0, 8).map(r => (
                    <ReminderRow key={r.id} reminder={r} contacts={contacts} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─ Zone 2: Deals ─ */}
          <div className="border-r border-b border-[var(--border)] flex flex-col overflow-hidden">
            <ZoneHeader title="Hot Deals" icon={Flame} to="/deals" />
            <div className="flex-1 overflow-auto">
              {hotDeals.length === 0 ? (
                <EmptyZone text="No hot deals" icon={Briefcase} />
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] dark:divide-[var(--border)]">
                  {hotDeals.slice(0, 6).map(d => <DealRow key={d.id} deal={d} />)}
                </div>
              )}
              {stalledDeals.length > 0 && (
                <>
                  <div className="os-zone-header border-t border-[var(--border)]">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={11} className="text-amber-500" />
                      <span className="os-zone-title text-[10px]">Needs Attention</span>
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--border-subtle)] dark:divide-[var(--border)]">
                    {stalledDeals.slice(0, 4).map(d => <DealRow key={d.id} deal={d} showMomentum />)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ─ Zone 3: Relationships ─ */}
          <div className="border-b border-[var(--border)] flex flex-col overflow-hidden">
            <ZoneHeader title="Cooling Relationships" icon={Snowflake} to="/contacts" />
            <div className="flex-1 overflow-auto">
              {staleContacts.length === 0 ? (
                <EmptyZone text="All relationships healthy" icon={Users} />
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] dark:divide-[var(--border)]">
                  {staleContacts.slice(0, 8).map(c => (
                    <Link key={c.id} to={`/contacts/${c.id}`}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-100 transition-colors">
                      <HealthDot score={c.healthScore} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">{fullName(c)}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{c.title || '—'}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                        {c.lastContacted ? formatDate(c.lastContacted) : 'Never'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─ Zone 4: Follow-ups + Activity stats ─ */}
          <div className="border-r border-[var(--border)] flex flex-col overflow-hidden">
            {suggestedFollowUps.length > 0 ? (
              <>
                <ZoneHeader title="Suggested Follow-ups" icon={Zap} />
                <div className="flex-1 overflow-auto divide-y divide-[var(--border-subtle)] dark:divide-[var(--border)]">
                  {suggestedFollowUps.slice(0, 6).map((s, i) => (
                    <Link key={i} to={s.entityType === 'contact' ? `/contacts/${s.entity.id}` : `/deals/${s.entity.id}`}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-100 transition-colors">
                      <div className={clsx('v-dot', s.priority === 'high' ? 'bg-red-500' : 'bg-amber-500')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">
                          {s.entityType === 'contact' ? fullName(s.entity) : s.entity.name || s.entity.address}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{s.reason}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <>
                <ZoneHeader title="Activity (30d)" icon={Activity} />
                <div className="flex-1 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-4 px-4">
                    {Object.entries(communicationStats.byType).map(([type, count]) => (
                      <div key={type} className="text-center">
                        <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums font-mono">{count}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize font-mono">{type}s</p>
                      </div>
                    ))}
                    {Object.keys(communicationStats.byType).length === 0 && (
                      <div className="col-span-3 text-center">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">NO ACTIVITY</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ─ Zone 5: Calendar ─ */}
          <div className="border-r border-[var(--border)] flex flex-col overflow-hidden">
            <ZoneHeader title="Upcoming Meetings" icon={Calendar} />
            <div className="flex-1 overflow-auto">
              {isConnected && upcomingEvents.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)] dark:divide-[var(--border)]">
                  {upcomingEvents.slice(0, 6).map(evt => {
                    const joinUrl = evt.onlineMeeting?.joinUrl
                    const inner = (
                      <div className="px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-100 transition-colors">
                        <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">{evt.subject}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 flex-1 font-mono">
                            {evt.start?.dateTime ? formatDate(evt.start.dateTime) : ''}
                            {evt.location?.displayName ? ` · ${evt.location.displayName}` : ''}
                          </p>
                          {joinUrl && (
                            <a href={joinUrl} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex-shrink-0 font-mono uppercase">
                              Join
                            </a>
                          )}
                        </div>
                      </div>
                    )
                    return evt.webLink ? (
                      <a key={evt.id} href={evt.webLink} target="_blank" rel="noopener noreferrer" className="block">
                        {inner}
                      </a>
                    ) : (
                      <div key={evt.id}>{inner}</div>
                    )
                  })}
                </div>
              ) : !isConnected ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                  <Activity size={16} className="text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Connect Microsoft 365</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Sync emails, calendar & files</p>
                  <Link to="/settings" className="v-btn-primary mt-2 text-[10px]">Connect</Link>
                </div>
              ) : (
                <EmptyZone text="No upcoming meetings" icon={Calendar} />
              )}
            </div>
          </div>

          {/* ─ Zone 6: Recent activity feed ─ */}
          <div className="flex flex-col overflow-hidden">
            <ZoneHeader title="Recent Activity" icon={Activity} to="/inbox" />
            <div className="flex-1 overflow-auto">
              {recentActivities.length === 0 ? (
                <EmptyZone text="No activity yet" icon={Activity} />
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] dark:divide-[var(--border)]">
                  {recentActivities.slice(0, 8).map(a => (
                    <div key={a.id} className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={clsx('v-badge', TYPE_COLORS[a.type] || TYPE_COLORS.other)}>{a.type}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{formatDate(a.date || a.createdAt)}</span>
                      </div>
                      <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">{a.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */

function StatusMetric({ label, value, to, accent, warn }) {
  return (
    <Link to={to} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">{label}</span>
      <span className={clsx(
        'text-[13px] font-bold tabular-nums font-mono',
        warn ? 'text-red-500' : accent ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-white'
      )}>{value}</span>
    </Link>
  )
}

function ZoneHeader({ title, icon: Icon, badge, to }) {
  return (
    <div className="os-zone-header flex-shrink-0">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-slate-400 dark:text-slate-500" />}
        <span className="os-zone-title">{title}</span>
        {badge > 0 && (
          <span className="min-w-[14px] h-[14px] px-0.5 bg-red-500 text-white text-[9px] font-bold font-mono flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      {to && (
        <Link to={to} className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5 font-mono uppercase">
          All <ArrowRight size={9} />
        </Link>
      )}
    </div>
  )
}

function EmptyZone({ text, icon: Icon }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6">
      <Icon size={16} className="text-slate-200 dark:text-slate-700 mb-1.5" />
      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">{text}</p>
    </div>
  )
}

function ReminderRow({ reminder, contacts }) {
  const contact = contacts.find(c => c.id === reminder.contactId)
  const overdue = isOverdue(reminder.dueDate)
  const today = isDueToday(reminder.dueDate)
  return (
    <Link to="/reminders" className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-100 transition-colors">
      <div className={clsx('v-dot', overdue ? 'bg-red-500' : today ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600')} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">{reminder.title}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">
          {contact ? fullName(contact) : ''}{contact && reminder.dueDate ? ' · ' : ''}{reminder.dueDate ? formatDate(reminder.dueDate) : ''}
        </p>
      </div>
      <span className={clsx('v-badge', PRIORITY_COLORS[reminder.priority] || PRIORITY_COLORS.low)}>{reminder.priority}</span>
    </Link>
  )
}

function DealRow({ deal, showMomentum }) {
  return (
    <Link to={`/deals/${deal.id}`} className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-50 dark:hover:bg-surface-100 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">{deal.name || deal.address}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{formatDealType(deal.dealType)} · {formatCurrency(deal.dealValue)}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {showMomentum && deal.momentumScore != null && (
          <span className={clsx('text-[10px] font-bold tabular-nums font-mono', deal.momentumScore >= 50 ? 'text-emerald-500' : deal.momentumScore >= 25 ? 'text-amber-500' : 'text-red-500')}>
            {deal.momentumScore}
          </span>
        )}
        <span className={clsx('v-badge', DEAL_STATUS_COLORS[deal.status])}>{formatDealStatus(deal.status)}</span>
      </div>
    </Link>
  )
}

function PipelineBar({ stats }) {
  const stages = ['prospect', 'engaged', 'under-loi', 'under-contract', 'due-diligence']
  const colors = { prospect: 'bg-slate-400 dark:bg-slate-500', engaged: 'bg-blue-500', 'under-loi': 'bg-indigo-500', 'under-contract': 'bg-amber-500', 'due-diligence': 'bg-purple-500' }
  const total = stages.reduce((s, st) => s + (stats.byStage[st]?.count || 0), 0) || 1
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">PIPELINE</span>
      <div className="flex h-1.5 w-32 overflow-hidden bg-surface-200 gap-px">
        {stages.map(st => {
          const pct = ((stats.byStage[st]?.count || 0) / total) * 100
          if (pct === 0) return null
          return <div key={st} className={clsx('h-full', colors[st])} style={{ width: `${pct}%` }} title={`${formatDealStatus(st)}: ${stats.byStage[st]?.count || 0}`} />
        })}
      </div>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">{stats.activeDeals}</span>
    </div>
  )
}

function HealthDot({ score }) {
  return <div className={clsx('w-2 h-2 flex-shrink-0', score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-blue-500' : score >= 25 ? 'bg-amber-500' : 'bg-red-500')} />
}
