import { useState } from 'react'
import { Trash2, RotateCcw, User, Building2, Briefcase, Bell, Clock } from 'lucide-react'
import clsx from 'clsx'
import { addDays } from 'date-fns'
import { useCRM } from '../context/CRMContext'
import { fullName } from '../utils/helpers'

const RETENTION_DAYS = 15

function daysLeft(deletedAt) {
  const exp = addDays(new Date(deletedAt), RETENTION_DAYS)
  return Math.max(0, Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24)))
}

function DeletedItem({ icon: Icon, title, subtitle, deletedAt, onRestore, onPurge }) {
  const days = daysLeft(deletedAt)
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-slate-400 dark:text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{title}</p>
        {subtitle && <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{subtitle}</p>}
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
          <Clock size={10} />
          {days === 0 ? 'Expires today' : `${days}d until permanent deletion`}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onRestore}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
        >
          <RotateCcw size={11} /> Restore
        </button>
        <button
          onClick={onPurge}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </div>
  )
}

function Section({ icon: Icon, label, items, renderItem }) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
        <Icon size={13} /> {label} ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map(renderItem)}
      </div>
    </section>
  )
}

const TABS = [
  { id: 'all',       label: 'All' },
  { id: 'contacts',  label: 'Contacts' },
  { id: 'companies', label: 'Companies' },
  { id: 'deals',     label: 'Deals' },
  { id: 'followups', label: 'Reminders' },
]

export default function RecentlyDeleted() {
  const {
    deletedContacts, deletedCompanies, deletedProperties, deletedReminders,
    restoreContact, restoreCompany, restoreProperty, restoreReminder,
    purgeContact, purgeCompany, purgeProperty, purgeReminder,
  } = useCRM()

  const [activeTab, setActiveTab] = useState('all')

  const counts = {
    contacts:  deletedContacts.length,
    companies: deletedCompanies.length,
    deals:     deletedProperties.length,
    followups: deletedReminders.length,
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  const show = (id) => activeTab === 'all' || activeTab === id

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Recently Deleted</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Items are permanently deleted after {RETENTION_DAYS} days</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-slate-200 dark:border-slate-700">
        {TABS.map(t => {
          const count = t.id === 'all' ? total : counts[t.id]
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={clsx(
                'px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5',
                activeTab === t.id
                  ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {t.label}
              {count > 0 && (
                <span className={clsx(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  activeTab === t.id
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {total === 0 ? (
        <div className="card p-12 text-center">
          <Trash2 size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-[13px] text-slate-500 dark:text-slate-400">Nothing in the trash</p>
        </div>
      ) : (
        <div className="space-y-8">
          {show('contacts') && (
            <Section icon={User} label="Contacts" items={deletedContacts} renderItem={c => (
              <DeletedItem
                key={c.id}
                icon={User}
                title={fullName(c)}
                subtitle={c.title || c.email}
                deletedAt={c.deletedAt}
                onRestore={() => restoreContact(c.id)}
                onPurge={() => purgeContact(c.id)}
              />
            )} />
          )}

          {show('companies') && (
            <Section icon={Building2} label="Companies" items={deletedCompanies} renderItem={c => (
              <DeletedItem
                key={c.id}
                icon={Building2}
                title={c.name}
                subtitle={c.type}
                deletedAt={c.deletedAt}
                onRestore={() => restoreCompany(c.id)}
                onPurge={() => purgeCompany(c.id)}
              />
            )} />
          )}

          {show('deals') && (
            <Section icon={Briefcase} label="Deals" items={deletedProperties} renderItem={p => (
              <DeletedItem
                key={p.id}
                icon={Briefcase}
                title={p.name}
                subtitle={p.address}
                deletedAt={p.deletedAt}
                onRestore={() => restoreProperty(p.id)}
                onPurge={() => purgeProperty(p.id)}
              />
            )} />
          )}

          {show('followups') && (
            <Section icon={Bell} label="Reminders" items={deletedReminders} renderItem={r => (
              <DeletedItem
                key={r.id}
                icon={Bell}
                title={r.title}
                subtitle={r.type}
                deletedAt={r.deletedAt}
                onRestore={() => restoreReminder(r.id)}
                onPurge={() => purgeReminder(r.id)}
              />
            )} />
          )}
        </div>
      )}
    </div>
  )
}
