import { Link } from 'react-router-dom'
import { parseISO, isToday, addDays, isBefore, isAfter } from 'date-fns'
import { Bell, Users, Building2, Briefcase, CheckCircle2, ArrowRight, AlertCircle, Calendar, TrendingUp, DollarSign } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'
import { formatDate, isOverdue, isDueToday, PRIORITY_COLORS, TYPE_COLORS, fullName, daysDiff, formatCurrency, DEAL_STATUSES, DEAL_STATUS_COLORS, formatDealStatus } from '../utils/helpers'

function StatCard({ icon: Icon, label, value, to, color }) {
  return (
    <Link to={to} className="rounded-xl border px-5 py-5 hover:shadow-md transition-all duration-150 group shadow-sm"
      style={{ backgroundColor: '#d3e1fa', borderColor: '#b6cbf4' }}>
      <div className="flex items-center justify-between mb-3">
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          <Icon size={17} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: '#2d3754' }}>{value}</p>
      <p className="text-[13px] mt-0.5" style={{ color: '#747b8e' }}>{label}</p>
    </Link>
  )
}

function ReminderCard({ reminder, contact, company, property, onComplete }) {
  const overdue = isOverdue(reminder.dueDate)
  const today   = isDueToday(reminder.dueDate)

  return (
    <div className={clsx(
      'flex items-start gap-3 p-4 rounded-xl border transition-all duration-150',
      overdue ? 'border-red-200/80 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20' :
      today   ? 'border-orange-200/80 bg-orange-50 dark:border-orange-800/60 dark:bg-orange-900/20' :
                'border-gray-200/80 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
    )}>
      <button onClick={() => onComplete(reminder.id)} className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-green-500 dark:text-gray-600 dark:hover:text-green-400 transition-colors">
        <CheckCircle2 size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{reminder.title}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {contact && (
            <Link to={`/contacts/${contact.id}`} className="text-xs text-brand-600 hover:underline dark:text-brand-400">{fullName(contact)}</Link>
          )}
          {contact && company && <span className="text-xs text-gray-400 dark:text-gray-600">·</span>}
          {company && (
            <Link to={`/companies/${company.id}`} className="text-xs text-gray-500 hover:underline dark:text-gray-400">{company.name}</Link>
          )}
          {(contact || company) && property && <span className="text-xs text-gray-400 dark:text-gray-600">·</span>}
          {property && (
            <Link to={`/properties/${property.id}`} className="text-xs text-gray-500 hover:underline dark:text-gray-400">{property.name}</Link>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={clsx('badge text-[11px]', overdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : today ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300')}>
            {overdue ? `${daysDiff(reminder.dueDate)}d overdue` : formatDate(reminder.dueDate)}
          </span>
          <span className={clsx('badge text-[11px]', TYPE_COLORS[reminder.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>{reminder.type}</span>
          {reminder.priority === 'high' && <span className="badge text-[11px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">high</span>}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { contacts, companies, properties, reminders, activities, completeReminder, getContact, getCompany, getProperty } = useCRM()
  const { user } = useAuth()
  const displayName = (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there').split(' ')[0]

  const pending = reminders.filter(r => r.status !== 'done')
  const overdue = pending.filter(r => isOverdue(r.dueDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const today   = pending.filter(r => isDueToday(r.dueDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const week    = pending.filter(r => {
    const d = parseISO(r.dueDate)
    return isAfter(d, new Date()) && isBefore(d, addDays(new Date(), 7))
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const stale = contacts.filter(c => {
    if (!c.lastContacted) return false
    return daysDiff(c.lastContacted) >= 90
  }).sort((a, b) => a.lastContacted.localeCompare(b.lastContacted)).slice(0, 5)

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Welcome, {displayName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard icon={Bell}      label="Pending reminders" value={pending.length}    to="/reminders"  color="bg-brand-500" />
        <StatCard icon={Users}     label="Contacts"           value={contacts.length}   to="/contacts"   color="bg-blue-500" />
        <StatCard icon={Building2} label="Companies"          value={companies.length}  to="/companies"  color="bg-violet-500" />
        <StatCard icon={Briefcase}  label="Active deals"        value={properties.filter(p => p.status !== 'dead' && p.status !== 'closed').length} to="/pipeline" color="bg-teal-500" />
        <StatCard icon={DollarSign} label="Pipeline value"     value={formatCurrency(properties.filter(p => p.status !== 'dead' && p.status !== 'closed').reduce((s, p) => s + (Number(p.dealValue) || 0), 0))} to="/pipeline" color="bg-emerald-500" />
      </div>

      {/* Mini pipeline bar */}
      {properties.length > 0 && (
        <Link to="/pipeline" className="block mb-8">
          <div className="card px-5 py-3 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pipeline</span>
              <span className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1">View pipeline <ArrowRight size={11} /></span>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-700">
              {DEAL_STATUSES.filter(s => s !== 'dead').map(s => {
                const count = properties.filter(p => p.status === s).length
                if (count === 0) return null
                const pct = (count / properties.length) * 100
                const colors = { prospect: '#9ca3af', engaged: '#3b82f6', 'under-loi': '#6366f1', 'under-contract': '#eab308', 'due-diligence': '#a855f7', closed: '#10b981' }
                return <div key={s} style={{ width: `${pct}%`, backgroundColor: colors[s] || '#6b7280' }} className="h-full" title={`${formatDealStatus(s)}: ${count}`} />
              })}
            </div>
            <div className="flex gap-3 mt-1.5">
              {DEAL_STATUSES.filter(s => s !== 'dead' && properties.some(p => p.status === s)).map(s => (
                <span key={s} className="text-[10px] text-gray-400 dark:text-gray-500">{formatDealStatus(s)}: {properties.filter(p => p.status === s).length}</span>
              ))}
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-3 gap-6 items-start">
        {/* Left: reminders */}
        <div className="col-span-2 space-y-8">
          {/* Overdue */}
          {overdue.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={15} className="text-red-500" />
                <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Overdue ({overdue.length})</h2>
              </div>
              <div className="space-y-2">
                {overdue.map(r => (
                  <ReminderCard key={r.id} reminder={r}
                    contact={getContact(r.contactId)} company={getCompany(r.companyId)} property={getProperty(r.propertyId)}
                    onComplete={completeReminder}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Today */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                Today {today.length > 0 && <span className="text-gray-400 dark:text-gray-500 font-normal">({today.length})</span>}
              </h2>
            </div>
            {today.length === 0 ? (
              <div className="card p-6 text-center">
                <CheckCircle2 size={22} className="text-green-400 mx-auto mb-2" />
                <p className="text-[13px] text-gray-500 dark:text-gray-400">Nothing due today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {today.map(r => (
                  <ReminderCard key={r.id} reminder={r}
                    contact={getContact(r.contactId)} company={getCompany(r.companyId)} property={getProperty(r.propertyId)}
                    onComplete={completeReminder}
                  />
                ))}
              </div>
            )}
          </section>

          {/* This week */}
          {week.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">This Week ({week.length})</h2>
                <Link to="/reminders" className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 transition-colors">
                  View all <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-2">
                {week.slice(0, 5).map(r => (
                  <ReminderCard key={r.id} reminder={r}
                    contact={getContact(r.contactId)} company={getCompany(r.companyId)} property={getProperty(r.propertyId)}
                    onComplete={completeReminder}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Needs Attention */}
          <div className="card p-5">
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-1">Needs Attention</h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">Not contacted in 3+ months</p>
            {stale.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">All contacts are fresh</p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2 px-0">
                  <div className="w-8 flex-shrink-0" />
                  <div className="flex-1"><span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Last touch</span></div>
                  <div className="w-16 flex-shrink-0"><span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Last type</span></div>
                </div>
                <div className="space-y-3">
                  {stale.map(c => {
                    const lastReminder = reminders
                      .filter(r => r.contactId === c.id && r.status === 'done')
                      .sort((a, b) => (b.completedAt || b.dueDate).localeCompare(a.completedAt || a.dueDate))[0]
                    const lastActivity = activities
                      .filter(a => a.contactId === c.id)
                      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]
                    const reminderDate = lastReminder ? (lastReminder.completedAt || lastReminder.dueDate || '') : ''
                    const activityDate = lastActivity ? (lastActivity.createdAt || '') : ''
                    const lastTouch = reminderDate >= activityDate ? lastReminder : lastActivity
                    return (
                      <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                            {(c.firstName || '')[0]}{(c.lastName || '')[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate transition-colors">{fullName(c)}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {c.lastContacted ? `${daysDiff(c.lastContacted)}d ago` : 'Never contacted'}
                          </p>
                        </div>
                        <div className="w-16 flex-shrink-0">
                          {lastTouch ? (
                            <span className={clsx('badge text-[10px] py-0', TYPE_COLORS[lastTouch.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                              {lastTouch.type}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">None</span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
            <Link to="/contacts" className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors">
              All contacts <ArrowRight size={11} />
            </Link>
          </div>

          {/* Upcoming */}
          <div className="card p-5">
            <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-1">Upcoming</h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">Next reminders by contact</p>
            {(() => {
              const contactsWithUpcoming = contacts
                .map(c => {
                  const next = reminders
                    .filter(r => r.contactId === c.id && r.status !== 'done')
                    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
                  return next ? { contact: c, reminder: next } : null
                })
                .filter(Boolean)
                .sort((a, b) => a.reminder.dueDate.localeCompare(b.reminder.dueDate))
                .slice(0, 6)

              if (contactsWithUpcoming.length === 0) {
                return <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No upcoming reminders</p>
              }

              return (
                <div className="space-y-3">
                  {contactsWithUpcoming.map(({ contact: c, reminder: r }) => {
                    const ov = isOverdue(r.dueDate)
                    const td = isDueToday(r.dueDate)
                    return (
                      <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                            {(c.firstName || '')[0]}{(c.lastName || '')[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate transition-colors">{fullName(c)}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={clsx('badge text-[10px] py-0', TYPE_COLORS[r.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>{r.type}</span>
                            <span className={clsx('text-[10px] flex items-center gap-0.5', ov ? 'text-red-500' : td ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500')}>
                              <Calendar size={9} /> {ov ? `${daysDiff(r.dueDate)}d overdue` : formatDate(r.dueDate)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap max-w-[90px]">
                          {c.tags?.length > 0 ? (
                            <>
                              {c.tags.slice(0, 2).map(t => (
                                <span key={t} className="badge text-[10px] py-0 bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">{t}</span>
                              ))}
                              {c.tags.length > 2 && <span className="text-[10px] text-gray-400 dark:text-gray-500">+{c.tags.length - 2}</span>}
                            </>
                          ) : (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )
            })()}
            <Link to="/reminders" className="flex items-center gap-1 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors">
              All reminders <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
