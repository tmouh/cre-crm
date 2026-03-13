import { useState, useMemo } from 'react'
import { Download, BarChart3, Users, Building2, Briefcase, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { formatCurrency, formatDealType, formatDealStatus, fullName, daysDiff, DEAL_STATUSES, DEAL_STATUS_COLORS, formatDate, DEAL_TYPES, DEAL_TYPE_COLORS } from '../utils/helpers'
import PageHeader from '../components/PageHeader'

function exportTableCSV(headers, rows, filename) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function PipelineReport({ properties, getCompany }) {
  const byStatus = useMemo(() => {
    return DEAL_STATUSES.map(s => ({
      status: s,
      deals: properties.filter(p => p.status === s),
      count: properties.filter(p => p.status === s).length,
      value: properties.filter(p => p.status === s).reduce((sum, p) => sum + (Number(p.dealValue) || 0), 0),
    }))
  }, [properties])

  const byType = useMemo(() => {
    return DEAL_TYPES.filter(t => properties.some(p => p.dealType === t)).map(t => ({
      type: t,
      count: properties.filter(p => p.dealType === t).length,
      value: properties.filter(p => p.dealType === t).reduce((sum, p) => sum + (Number(p.dealValue) || 0), 0),
    })).sort((a, b) => b.value - a.value)
  }, [properties])

  function handleExport() {
    const headers = ['Deal', 'Address', 'Type', 'Status', 'Value', 'Company', 'Market']
    const rows = properties.map(p => [p.name || '', p.address || '', formatDealType(p.dealType), formatDealStatus(p.status), p.dealValue || '', getCompany(p.ownerCompanyId)?.name || '', p.market || ''])
    exportTableCSV(headers, rows, 'pipeline-report.csv')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Pipeline Summary</h3>
        <button onClick={handleExport} className="v-btn-secondary text-xs"><Download size={13} /> Export CSV</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-surface-50 dark:bg-surface-100">
              <th className="text-left px-4 py-3 font-mono uppercase text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Status</th>
              <th className="text-right px-4 py-3 font-mono uppercase text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Deals</th>
              <th className="text-right px-4 py-3 font-mono uppercase text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Total Value</th>
              <th className="text-right px-4 py-3 font-mono uppercase text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Avg Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {byStatus.filter(s => s.count > 0).map(s => (
              <tr key={s.status}>
                <td className="px-4 py-2.5"><span className={clsx('v-badge text-[11px]', DEAL_STATUS_COLORS[s.status])}>{formatDealStatus(s.status)}</span></td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">{s.count}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">{formatCurrency(s.value)}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">{s.count > 0 ? formatCurrency(s.value / s.count) : '—'}</td>
              </tr>
            ))}
            <tr className="bg-surface-50 dark:bg-surface-100 font-semibold">
              <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100">Total</td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">{properties.length}</td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(properties.reduce((s, p) => s + (Number(p.dealValue) || 0), 0))}</td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">{properties.length > 0 ? formatCurrency(properties.reduce((s, p) => s + (Number(p.dealValue) || 0), 0) / properties.length) : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {byType.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h4 className="font-mono uppercase text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">By Deal Type</h4>
          </div>
          <table className="w-full text-[12px]">
            <tbody className="divide-y divide-[var(--border)]">
              {byType.map(t => (
                <tr key={t.type}>
                  <td className="px-4 py-2.5"><span className={clsx('v-badge text-[11px]', DEAL_TYPE_COLORS[t.type])}>{formatDealType(t.type)}</span></td>
                  <td className="px-4 py-2.5 text-right text-[12px] text-slate-600 dark:text-slate-400">{t.count} deal{t.count !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">{formatCurrency(t.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ActivityReport({ activities, contacts, getContact }) {
  const last30 = useMemo(() => {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()
    return activities.filter(a => a.createdAt >= cutoff)
  }, [activities])

  const byType = useMemo(() => {
    const map = {}
    last30.forEach(a => { map[a.type] = (map[a.type] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [last30])

  const topContacts = useMemo(() => {
    const map = {}
    last30.forEach(a => { if (a.contactId) map[a.contactId] = (map[a.contactId] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => ({ contact: getContact(id), count })).filter(c => c.contact)
  }, [last30, getContact])

  function handleExport() {
    const headers = ['Date', 'Type', 'Contact', 'Description']
    const rows = last30.map(a => [a.createdAt?.slice(0, 10) || '', a.type || '', a.contactId ? fullName(getContact(a.contactId)) : '', a.description || ''])
    exportTableCSV(headers, rows, 'activity-report.csv')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Activity Report (Last 30 days)</h3>
        <button onClick={handleExport} className="v-btn-secondary text-xs"><Download size={13} /> Export CSV</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">{last30.length}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Total activities</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">{new Set(last30.map(a => a.contactId).filter(Boolean)).size}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Contacts touched</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">{(last30.length / 30).toFixed(1)}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Activities / day</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-4">
          <h4 className="font-mono uppercase text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">By Type</h4>
          <div className="space-y-2">
            {byType.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-[12px] text-slate-700 dark:text-slate-300 capitalize">{type}</span>
                <span className="text-[12px] font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h4 className="font-mono uppercase text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">Most Active Contacts</h4>
          <div className="space-y-2">
            {topContacts.map(({ contact, count }) => (
              <div key={contact.id} className="flex items-center justify-between">
                <span className="text-[12px] text-slate-700 dark:text-slate-300">{fullName(contact)}</span>
                <span className="text-[12px] font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactsReport({ contacts, reminders }) {
  function handleExport() {
    const headers = ['Name', 'Title', 'Email', 'Phone', 'Last Contacted', 'Days Since', 'Tags']
    const rows = contacts.map(c => [fullName(c), c.title || '', c.email || '', c.phone || '', c.lastContacted?.slice(0, 10) || '', c.lastContacted ? daysDiff(c.lastContacted) : '', (c.tags || []).join('; ')])
    exportTableCSV(headers, rows, 'contacts-report.csv')
  }

  const stale = contacts.filter(c => c.lastContacted && daysDiff(c.lastContacted) >= 90)
  const neverContacted = contacts.filter(c => !c.lastContacted)
  const withPending = contacts.filter(c => reminders.some(r => r.contactId === c.id && r.status !== 'done'))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">Contacts Report</h3>
        <button onClick={handleExport} className="v-btn-secondary text-xs"><Download size={13} /> Export CSV</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">{contacts.length}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Total contacts</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-mono tabular-nums text-red-600">{stale.length}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Stale (90+ days)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-mono tabular-nums text-orange-500">{neverContacted.length}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Never contacted</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-mono tabular-nums text-green-600">{withPending.length}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">With pending tasks</p>
        </div>
      </div>
    </div>
  )
}

export default function Reports() {
  const { properties, contacts, companies, activities, reminders, getContact, getCompany } = useCRM()
  const [tab, setTab] = useState('pipeline')

  const tabs = [
    { id: 'pipeline', label: 'Pipeline', icon: Briefcase },
    { id: 'activity', label: 'Activity', icon: TrendingUp },
    { id: 'contacts', label: 'Contacts', icon: Users },
  ]

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <PageHeader title="Reports" subtitle="Analytics and exports" />

      <div className="flex gap-1 bg-surface-50 dark:bg-surface-100 p-0.5 mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors', tab === t.id ? 'bg-surface-0 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400')}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && <PipelineReport properties={properties} getCompany={getCompany} />}
      {tab === 'activity' && <ActivityReport activities={activities} contacts={contacts} getContact={getContact} />}
      {tab === 'contacts' && <ContactsReport contacts={contacts} reminders={reminders} />}
    </div>
  )
}
