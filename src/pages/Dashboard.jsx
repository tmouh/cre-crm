import { Link } from 'react-router-dom'
import { parseISO, isToday, addDays, isBefore, isAfter } from 'date-fns'
import { Bell, Users, Building2, MapPin, CheckCircle2, Phone, Mail, Users as MeetingIcon, ArrowRight, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { formatDate, isOverdue, isDueToday, PRIORITY_COLORS, TYPE_COLORS, fullName, daysDiff } from '../utils/helpers'

function StatCard({ icon: Icon, label, value, to, color }) {
  return (
    <Link to={to} className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </Link>
  )
}

function ReminderCard({ reminder, contact, company, property, onComplete }) {
  const overdue = isOverdue(reminder.dueDate)
  const today   = isDueToday(reminder.dueDate)

  return (
    <div className={clsx(
      'flex items-start gap-3 p-4 rounded-xl border transition-colors',
      overdue ? 'border-red-200 bg-red-50' : today ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'
    )}>
      <button onClick={() => onComplete(reminder.id)} className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors">
        <CheckCircle2 size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{reminder.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {contact && (
            <Link to={`/contacts/${contact.id}`} className="text-xs text-brand-600 hover:underline">{fullName(contact)}</Link>
          )}
          {company && (
            <Link to={`/companies/${company.id}`} className="text-xs text-gray-500 hover:underline">{company.name}</Link>
          )}
          {property && (
            <Link to={`/properties/${property.id}`} className="text-xs text-gray-500 hover:underline">{property.name}</Link>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={clsx('badge', overdue ? 'bg-red-100 text-red-700' : today ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500')}>
            {overdue ? `${daysDiff(reminder.dueDate)}d overdue` : formatDate(reminder.dueDate)}
          </span>
          <span className={clsx('badge', TYPE_COLORS[reminder.type] || 'bg-gray-100 text-gray-600')}>{reminder.type}</span>
          {reminder.priority === 'high' && <span className="badge bg-red-100 text-red-700">high</span>}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { contacts, companies, properties, reminders, completeReminder, getContact, getCompany, getProperty } = useCRM()

  const pending = reminders.filter(r => r.status !== 'done')
  const overdue = pending.filter(r => isOverdue(r.dueDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const today   = pending.filter(r => isDueToday(r.dueDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const week    = pending.filter(r => {
    const d = parseISO(r.dueDate)
    return isAfter(d, new Date()) && isBefore(d, addDays(new Date(), 7))
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  // contacts not reached in 30 days
  const stale = contacts.filter(c => {
    if (!c.lastContacted) return true
    return daysDiff(c.lastContacted) > 30
  }).slice(0, 5)

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your CRE outreach at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon={Bell}     label="Pending follow-ups" value={pending.length}    to="/reminders"  color="bg-brand-500" />
        <StatCard icon={Users}    label="Contacts"           value={contacts.length}   to="/contacts"   color="bg-blue-500" />
        <StatCard icon={Building2} label="Companies"         value={companies.length}  to="/companies"  color="bg-violet-500" />
        <StatCard icon={MapPin}   label="Properties"         value={properties.length} to="/properties" color="bg-teal-500" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: reminders */}
        <div className="col-span-2 space-y-6">
          {/* Overdue */}
          {overdue.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={15} className="text-red-500" />
                <h2 className="text-sm font-semibold text-gray-800">Overdue ({overdue.length})</h2>
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
              <h2 className="text-sm font-semibold text-gray-800">
                Today {today.length > 0 && <span className="text-gray-400 font-normal">({today.length})</span>}
              </h2>
            </div>
            {today.length === 0 ? (
              <div className="card p-6 text-center">
                <CheckCircle2 size={22} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Nothing due today</p>
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
                <h2 className="text-sm font-semibold text-gray-800">Next 7 days ({week.length})</h2>
                <Link to="/reminders" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
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

        {/* Right: stale contacts */}
        <div>
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Needs Attention</h2>
            <p className="text-xs text-gray-400 mb-3">Not contacted in 30+ days</p>
            {stale.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">All contacts are fresh</p>
            ) : (
              <div className="space-y-3">
                {stale.map(c => (
                  <Link key={c.id} to={`/contacts/${c.id}`} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-brand-700">
                        {c.firstName[0]}{c.lastName[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 truncate">{fullName(c)}</p>
                      <p className="text-xs text-gray-400">
                        {c.lastContacted ? `${daysDiff(c.lastContacted)}d ago` : 'Never contacted'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Link to="/contacts" className="flex items-center gap-1 mt-4 text-xs text-brand-600 hover:underline">
              All contacts <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
