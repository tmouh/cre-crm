import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ArrowRight, Clock, TrendingUp, DollarSign, Briefcase } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { DEAL_STATUSES, DEAL_STATUS_COLORS, formatDealStatus, formatDealType, formatCurrency, fullName } from '../utils/helpers'
import PageHeader from '../components/PageHeader'

const PIPELINE_STAGES = DEAL_STATUSES.filter(s => s !== 'dead')

function KanbanCard({ deal, getCompany, getContact }) {
  const owner = getCompany(deal.ownerCompanyId)
  const firstContact = (deal.contactIds || []).length > 0 ? getContact(deal.contactIds[0]) : null

  return (
    <Link to={`/deals/${deal.id}`} className="block p-2.5 bg-surface-0 border border-[var(--border)] hover:border-[var(--border)] hover:shadow-elevated transition-all duration-150 cursor-pointer">
      <p className="text-[12px] font-medium text-slate-900 dark:text-slate-100 truncate">{deal.name || deal.address}</p>
      {deal.dealType && (
        <span className="text-[10px] text-slate-500 dark:text-slate-400">{formatDealType(deal.dealType)}</span>
      )}
      {deal.dealValue && (
        <p className="text-[12px] font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 mt-1">{formatCurrency(deal.dealValue)}</p>
      )}
      <div className="flex items-center gap-2 mt-1.5">
        {owner && <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{owner.name}</span>}
      </div>
      {firstContact && (
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-5 h-5 bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-semibold text-brand-700 dark:text-brand-300">{(firstContact.firstName || '')[0]}{(firstContact.lastName || '')[0]}</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{fullName(firstContact)}</span>
        </div>
      )}
    </Link>
  )
}

function StageColumn({ stage, deals, getCompany, getContact, onDrop }) {
  const [dragOver, setDragOver] = useState(false)
  const totalValue = deals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0)

  return (
    <div
      className={clsx(
        'flex-1 min-w-[200px] max-w-[280px] flex flex-col border transition-colors',
        dragOver ? 'border-brand-400 bg-brand-50/50 dark:bg-brand-900/10' : 'border-[var(--border)] bg-surface-50 dark:bg-surface-100'
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(stage, e.dataTransfer.getData('dealId')) }}
    >
      <div className="p-2.5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-1">
          <span className={clsx('v-badge text-[11px]', DEAL_STATUS_COLORS[stage])}>{formatDealStatus(stage)}</span>
          <span className="text-[11px] font-mono tabular-nums font-medium text-slate-500 dark:text-slate-400">{deals.length}</span>
        </div>
        {totalValue > 0 && (
          <p className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">{formatCurrency(totalValue)}</p>
        )}
      </div>
      <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[calc(100vh-320px)]">
        {deals.map(deal => (
          <div key={deal.id} draggable onDragStart={(e) => e.dataTransfer.setData('dealId', deal.id)}>
            <KanbanCard deal={deal} getCompany={getCompany} getContact={getContact} />
          </div>
        ))}
        {deals.length === 0 && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-6">No deals</p>
        )}
      </div>
    </div>
  )
}

function VelocityMetrics({ properties }) {
  const metrics = useMemo(() => {
    const active = properties.filter(p => p.status !== 'dead' && p.status !== 'closed')
    const closed = properties.filter(p => p.status === 'closed')
    const dead = properties.filter(p => p.status === 'dead')

    const totalPipelineValue = active.reduce((s, p) => s + (Number(p.dealValue) || 0), 0)
    const closedValue = closed.reduce((s, p) => s + (Number(p.dealValue) || 0), 0)
    const winRate = (closed.length + dead.length) > 0 ? (closed.length / (closed.length + dead.length) * 100) : 0

    // Average days per stage from stage history
    const stageDurations = {}
    for (const p of [...closed, ...active]) {
      const history = p.stageHistory || []
      for (let i = 0; i < history.length; i++) {
        const entry = history[i]
        const nextEntry = history[i + 1]
        if (entry.at && nextEntry?.at) {
          const days = (new Date(nextEntry.at) - new Date(entry.at)) / 86400000
          if (!stageDurations[entry.to]) stageDurations[entry.to] = []
          stageDurations[entry.to].push(days)
        }
      }
    }
    const avgStageDays = {}
    for (const [stage, durations] of Object.entries(stageDurations)) {
      avgStageDays[stage] = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    }

    return { active: active.length, totalPipelineValue, closedValue, closed: closed.length, dead: dead.length, winRate, avgStageDays }
  }, [properties])

  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Briefcase size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <p className="text-lg font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">{metrics.active}</p>
        <p className="text-[11px] font-mono uppercase tracking-wide text-slate-500 dark:text-slate-400">Active deals</p>
      </div>
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <DollarSign size={14} className="text-green-600 dark:text-green-400" />
          </div>
        </div>
        <p className="text-lg font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">{formatCurrency(metrics.totalPipelineValue)}</p>
        <p className="text-[11px] font-mono uppercase tracking-wide text-slate-500 dark:text-slate-400">Pipeline value</p>
      </div>
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <p className="text-lg font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">{metrics.winRate.toFixed(0)}%</p>
        <p className="text-[11px] font-mono uppercase tracking-wide text-slate-500 dark:text-slate-400">Win rate ({metrics.closed}W / {metrics.dead}L)</p>
      </div>
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <DollarSign size={14} className="text-violet-600 dark:text-violet-400" />
          </div>
        </div>
        <p className="text-lg font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">{formatCurrency(metrics.closedValue)}</p>
        <p className="text-[11px] font-mono uppercase tracking-wide text-slate-500 dark:text-slate-400">Closed value</p>
      </div>
    </div>
  )
}

function DealFunnel({ properties }) {
  const stages = DEAL_STATUSES.filter(s => s !== 'dead')
  const maxCount = Math.max(...stages.map(s => properties.filter(p => p.status === s).length), 1)

  return (
    <div className="card p-3 mb-4">
      <h3 className="font-mono uppercase tracking-wide text-[12px] text-slate-800 dark:text-slate-200 mb-3">Deal Funnel</h3>
      <div className="space-y-1.5">
        {stages.map(stage => {
          const count = properties.filter(p => p.status === stage).length
          const value = properties.filter(p => p.status === stage).reduce((s, p) => s + (Number(p.dealValue) || 0), 0)
          const pct = (count / maxCount) * 100
          return (
            <div key={stage} className="flex items-center gap-3">
              <div className="w-28 flex-shrink-0">
                <span className={clsx('v-badge text-[11px]', DEAL_STATUS_COLORS[stage])}>{formatDealStatus(stage)}</span>
              </div>
              <div className="flex-1 h-7 bg-surface-50 dark:bg-surface-100 overflow-hidden relative">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: stage === 'closed' ? '#10b981' : '#6366f1' }}
                />
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="text-[11px] font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
                    {count} deal{count !== 1 ? 's' : ''} {value > 0 && `· ${formatCurrency(value)}`}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Pipeline() {
  const { properties, updatePropertyWithStage, getCompany, getContact } = useCRM()
  const [view, setView] = useState('kanban')

  async function handleDrop(newStatus, dealId) {
    if (!dealId) return
    const deal = properties.find(p => p.id === dealId)
    if (!deal || deal.status === newStatus) return
    await updatePropertyWithStage(dealId, { status: newStatus })
  }

  const dealsByStage = useMemo(() => {
    const map = {}
    for (const s of PIPELINE_STAGES) map[s] = []
    for (const p of properties) {
      if (p.status !== 'dead' && map[p.status]) map[p.status].push(p)
    }
    return map
  }, [properties])

  return (
    <div className="px-5 py-5">
      <PageHeader
        title="Pipeline"
        subtitle={`${properties.filter(p => p.status !== 'dead' && p.status !== 'closed').length} active deals`}
        actions={
          <div className="flex gap-1 bg-surface-50 dark:bg-surface-100 p-0.5">
            <button onClick={() => setView('kanban')} className={clsx('px-3 py-1.5 text-[11px] font-mono font-medium transition-colors', view === 'kanban' ? 'bg-surface-0 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400')}>
              Kanban
            </button>
            <button onClick={() => setView('funnel')} className={clsx('px-3 py-1.5 text-[11px] font-mono font-medium transition-colors', view === 'funnel' ? 'bg-surface-0 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400')}>
              Funnel
            </button>
          </div>
        }
      />

      <VelocityMetrics properties={properties} />

      {view === 'kanban' ? (
        <div className="flex gap-2.5 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => (
            <StageColumn
              key={stage}
              stage={stage}
              deals={dealsByStage[stage] || []}
              getCompany={getCompany}
              getContact={getContact}
              onDrop={handleDrop}
            />
          ))}
        </div>
      ) : (
        <DealFunnel properties={properties} />
      )}
    </div>
  )
}
