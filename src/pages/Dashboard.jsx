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
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Contacts" value={contacts.length} icon={Users} color="brand" to="/contacts" />
        <StatCard label="Companies" value={companies.length} icon={Building2} color="blue" to="/companies" />
        <StatCard label="Active Deals" value={activeDeals.length} icon={Briefcase} color="emerald" to="/deals" />
        <StatCard label="Pipeline" value={formatCurrency(pipelineStats.totalValue)} icon={TrendingUp} color="violet" to="/pipeline" isText />
        <StatCard label="Overdue" value={overdueCount} icon={AlertTriangle} color={overdueCount > 0 ? 'red' : 'slate'} to="/reminders" />
        <StatCard label="Due Today" value={todayCount} icon={Clock} color={todayCount > 0 ? 'amber' : 'slate'} to="/reminders" />
      </div>

      {/* Pipeline bar */}
      <PipelineBar stats={pipelineStats} />

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Col 1: Tasks */}
        <div className="space-y-4">
          <Panel title="Priority Tasks" icon={Bell} badge={overdueCount + todayCount} badgeColor="red" to="/reminders">
            {pendingReminders.length === 0 ? (
              <EmptyPanel text="All caught up" icon={CheckCircle2} />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {pendingReminders.slice(0, 6).map(r => (
                  <ReminderRow key={r.id} reminder={r} contacts={contacts} />
                ))}
              </div>
            )}
          </Panel>

          {suggestedFollowUps.length > 0 && (
            <Panel title="Suggested Follow-ups" icon={Zap}>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {suggestedFollowUps.slice(0, 5).map((s, i) => (
                  <Link key={i} to={s.entityType === 'contact' ? `/contacts/${s.entity.id}` : `/deals/${s.entity.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-surface-100 transition-colors">
                    <div className={clsx('v-dot', s.priority === 'high' ? 'bg-red-500' : 'bg-amber-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {s.entityType === 'contact' ? fullName(s.entity) : s.entity.name || s.entity.address}
                      </p>
                      <p className="text-2xs text-slate-400 dark:text-slate-500">{s.reason}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Col 2: Deals */}
        <div className="space-y-4">
          <Panel title="Hot Deals" icon={Flame} to="/deals">
            {hotDeals.length === 0 ? (
              <EmptyPanel text="No hot deals" icon={Briefcase} />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {hotDeals.slice(0, 5).map(d => <DealRow key={d.id} deal={d} />)}
              </div>
            )}
          </Panel>

          {stalledDeals.length > 0 && (
            <Panel title="Needs Attention" icon={AlertTriangle} to="/deals">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {stalledDeals.slice(0, 4).map(d => <DealRow key={d.id} deal={d} showMomentum />)}
              </div>
            </Panel>
          )}

          <Panel title="Activity (30d)" icon={Activity}>
            <div className="px-4 py-3 grid grid-cols-3 gap-3">
              {Object.entries(communicationStats.byType).map(([type, count]) => (
                <div key={type} className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{count}</p>
                  <p className="text-2xs text-slate-400 dark:text-slate-500 capitalize">{type}s</p>
                </div>
              ))}
              {Object.keys(communicationStats.byType).length === 0 && (
                <div className="col-span-3 text-center py-2">
                  <p className="text-2xs text-slate-400 dark:text-slate-500">No activity yet</p>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Col 3: Relationships & Microsoft */}
        <div className="space-y-4">
          <Panel title="Cooling Relationships" icon={Snowflake} to="/contacts">
            {staleContacts.length === 0 ? (
              <EmptyPanel text="All relationships healthy" icon={Users} />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {staleContacts.slice(0, 5).map(c => (
                  <Link key={c.id} to={`/contacts/${c.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-surface-100 transition-colors">
                    <HealthDot score={c.healthScore} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{fullName(c)}</p>
                      <p className="text-2xs text-slate-400 dark:text-slate-500">{c.title || 'No title'}</p>
                    </div>
                    <span className="text-2xs text-slate-400 dark:text-slate-500">
                      {c.lastContacted ? formatDate(c.lastContacted) : 'Never'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {isConnected && upcomingEvents.length > 0 && (
            <Panel title="Upcoming Meetings" icon={Calendar}>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {upcomingEvents.slice(0, 5).map(evt => (
                  <div key={evt.id} className="px-4 py-2.5">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{evt.subject}</p>
                    <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {evt.start?.dateTime ? formatDate(evt.start.dateTime) : ''}
                      {evt.location?.displayName ? ` · ${evt.location.displayName}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Recent Activity" icon={Activity} to="/inbox">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {recentActivities.length === 0 ? (
                <EmptyPanel text="No activity yet" icon={Activity} />
              ) : recentActivities.slice(0, 5).map(a => (
                <div key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={clsx('v-badge', TYPE_COLORS[a.type] || TYPE_COLORS.other)}>{a.type}</span>
                    <span className="text-2xs text-slate-400 dark:text-slate-500">{formatDate(a.date || a.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">{a.description}</p>
                </div>
              ))}
            </div>
          </Panel>

          {!isConnected && (
            <div className="v-card p-4 text-center">
              <Activity size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Connect Microsoft 365</p>
              <p className="text-2xs text-slate-400 dark:text-slate-500 mt-1">Sync emails, calendar, contacts & files</p>
              <Link to="/settings" className="v-btn-primary mt-3 text-2xs">Connect</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */

function StatCard({ label, value, icon: Icon, color, to, isText }) {
  const colors = {
    brand: 'text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-950/30',
    blue: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30',
    emerald: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30',
    violet: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/30',
    red: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30',
    amber: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30',
    slate: 'text-slate-400 bg-slate-100 dark:text-slate-500 dark:bg-slate-800',
  }
  return (
    <Link to={to} className="v-card p-3 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
      <div className={clsx('w-6 h-6 rounded flex items-center justify-center mb-2', colors[color])}>
        <Icon size={13} />
      </div>
      <p className={clsx('font-bold text-slate-900 dark:text-white tabular-nums', isText ? 'text-sm' : 'text-lg')}>{value}</p>
      <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">{label}</p>
    </Link>
  )
}

function Panel({ title, icon: Icon, children, badge, badgeColor, to }) {
  return (
    <div className="v-panel">
      <div className="v-panel-header">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-slate-400 dark:text-slate-500" />}
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">{title}</h3>
          {badge > 0 && (
            <span className={clsx('min-w-[16px] h-[16px] px-1 rounded-full text-2xs font-bold flex items-center justify-center text-white', badgeColor === 'red' ? 'bg-red-500' : 'bg-brand-500')}>
              {badge}
            </span>
          )}
        </div>
        {to && (
          <Link to={to} className="text-2xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
            View all <ArrowRight size={10} />
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyPanel({ text, icon: Icon }) {
  return (
    <div className="px-4 py-6 text-center">
      <Icon size={18} className="text-slate-200 dark:text-slate-700 mx-auto mb-2" />
      <p className="text-2xs text-slate-400 dark:text-slate-500">{text}</p>
    </div>
  )
}

function ReminderRow({ reminder, contacts }) {
  const contact = contacts.find(c => c.id === reminder.contactId)
  const overdue = isOverdue(reminder.dueDate)
  const today = isDueToday(reminder.dueDate)
  return (
    <Link to="/reminders" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-surface-100 transition-colors">
      <div className={clsx('v-dot', overdue ? 'bg-red-500' : today ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600')} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{reminder.title}</p>
        <p className="text-2xs text-slate-400 dark:text-slate-500 truncate">
          {contact ? fullName(contact) : ''}{contact && reminder.dueDate ? ' · ' : ''}{reminder.dueDate ? formatDate(reminder.dueDate) : ''}
        </p>
      </div>
      <span className={clsx('v-badge', PRIORITY_COLORS[reminder.priority] || PRIORITY_COLORS.low)}>{reminder.priority}</span>
    </Link>
  )
}

function DealRow({ deal, showMomentum }) {
  return (
    <Link to={`/deals/${deal.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-surface-100 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{deal.name || deal.address}</p>
        <p className="text-2xs text-slate-400 dark:text-slate-500">{formatDealType(deal.dealType)} · {formatCurrency(deal.dealValue)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {showMomentum && deal.momentumScore != null && (
          <span className={clsx('text-2xs font-bold tabular-nums', deal.momentumScore >= 50 ? 'text-emerald-500' : deal.momentumScore >= 25 ? 'text-amber-500' : 'text-red-500')}>
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
  const colors = { prospect: 'bg-slate-400 dark:bg-slate-600', engaged: 'bg-blue-500', 'under-loi': 'bg-indigo-500', 'under-contract': 'bg-amber-500', 'due-diligence': 'bg-purple-500' }
  const total = stages.reduce((s, st) => s + (stats.byStage[st]?.count || 0), 0) || 1
  return (
    <div className="v-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-2xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pipeline</p>
        <p className="text-2xs text-slate-400 dark:text-slate-500">{stats.activeDeals} active · {formatCurrency(stats.totalValue)} total</p>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-surface-200 gap-px">
        {stages.map(st => {
          const pct = ((stats.byStage[st]?.count || 0) / total) * 100
          if (pct === 0) return null
          return <div key={st} className={clsx('h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full', colors[st])} style={{ width: `${pct}%` }} title={`${formatDealStatus(st)}: ${stats.byStage[st]?.count || 0}`} />
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {stages.map(st => stats.byStage[st] ? (
          <div key={st} className="flex items-center gap-1.5">
            <div className={clsx('w-2 h-2 rounded-full', colors[st])} />
            <span className="text-2xs text-slate-500 dark:text-slate-400">{formatDealStatus(st)} ({stats.byStage[st].count})</span>
          </div>
        ) : null)}
      </div>
    </div>
  )
}

function HealthDot({ score }) {
  return <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-blue-500' : score >= 25 ? 'bg-amber-500' : 'bg-red-500')} />
}
