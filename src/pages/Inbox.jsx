import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Mail, Phone, Calendar, FileText, MessageSquare,
  Filter, Clock, Users, Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { useMicrosoft } from '../context/MicrosoftContext'
import {
  fullName, formatDate, formatDateTime, TYPE_COLORS,
} from '../utils/helpers'

const ACTIVITY_ICONS = {
  call: Phone, email: Mail, meeting: Calendar, note: FileText,
  tour: MessageSquare, proposal: FileText, other: Activity,
}

const FILTERS = ['all', 'call', 'email', 'meeting', 'note', 'tour', 'proposal']

export default function Inbox() {
  const { activities, contacts, companies, properties, getContact, getCompany, getProperty, deleteActivity } = useCRM()
  const { isConnected, recentEmails, upcomingEvents } = useMicrosoft()
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('activity')

  const sortedActivities = useMemo(() => {
    let items = [...activities]
    if (activeFilter !== 'all') {
      items = items.filter(a => a.type === activeFilter)
    }
    return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [activities, activeFilter])

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Tabs toolbar */}
      <div className="os-toolbar flex-shrink-0 border-b-0">
        {[
          { id: 'activity', label: 'Activity', icon: Activity },
          ...(isConnected ? [
            { id: 'emails', label: 'Emails', icon: Mail },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
          ] : []),
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border-b-2 -mb-[1.5px] transition-colors',
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            )}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 max-w-[1000px]">

      {/* Activity Feed tab */}
      {activeTab === 'activity' && (
        <>
          {/* Type filter pills */}
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={clsx(
                  'v-btn text-2xs capitalize',
                  activeFilter === f
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-surface-100 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-200'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {sortedActivities.length === 0 ? (
            <div className="v-card p-8 text-center">
              <Activity size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedActivities.map(a => {
                const Icon = ACTIVITY_ICONS[a.type] || Activity
                const contact = a.contactId ? getContact(a.contactId) : null
                const company = a.companyId ? getCompany(a.companyId) : null
                const deal = a.propertyId ? getProperty(a.propertyId) : null

                return (
                  <div key={a.id} className="v-card p-3 flex gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors group">
                    <div className={clsx(
                      'w-6 h-6 flex items-center justify-center flex-shrink-0',
                      TYPE_COLORS[a.type] || TYPE_COLORS.other
                    )}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="v-badge capitalize">{a.type}</span>
                        <span className="text-2xs text-slate-400 dark:text-slate-500">
                          {formatDateTime(a.date || a.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{a.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {contact && (
                          <Link to={`/contacts/${contact.id}`} className="text-2xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                            <Users size={10} /> {fullName(contact)}
                          </Link>
                        )}
                        {company && (
                          <Link to={`/companies/${company.id}`} className="text-2xs text-slate-500 hover:text-brand-600 dark:text-slate-400">
                            {company.name}
                          </Link>
                        )}
                        {deal && (
                          <Link to={`/deals/${deal.id}`} className="text-2xs text-slate-500 hover:text-brand-600 dark:text-slate-400">
                            {deal.name || deal.address}
                          </Link>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteActivity(a.id)}
                      className="p-1 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 self-center"
                      title="Delete activity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Emails tab */}
      {activeTab === 'emails' && (
        <div className="space-y-1">
          {recentEmails.length === 0 ? (
            <div className="v-card p-8 text-center">
              <Mail size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500">No recent emails synced</p>
            </div>
          ) : recentEmails.map(email => (
            <a
              key={email.id}
              href={email.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="v-card p-3 block hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Mail size={14} className={clsx('mt-0.5 flex-shrink-0', email.isRead ? 'text-slate-300 dark:text-slate-600' : 'text-brand-500')} />
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-xs truncate', email.isRead ? 'text-slate-500 dark:text-slate-400' : 'font-semibold text-slate-800 dark:text-slate-200')}>
                    {email.subject || '(no subject)'}
                  </p>
                  <p className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {email.from?.emailAddress?.name || email.from?.emailAddress?.address} · {formatDate(email.receivedDateTime)}
                  </p>
                  {email.bodyPreview && (
                    <p className="text-2xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">{email.bodyPreview}</p>
                  )}
                </div>
                {email.hasAttachments && <FileText size={12} className="text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Calendar tab */}
      {activeTab === 'calendar' && (
        <div className="space-y-1">
          {upcomingEvents.length === 0 ? (
            <div className="v-card p-8 text-center">
              <Calendar size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 dark:text-slate-500">No upcoming events</p>
            </div>
          ) : upcomingEvents.map(evt => (
            <a
              key={evt.id}
              href={evt.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="v-card p-3 block hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Calendar size={14} className="text-brand-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{evt.subject}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-2xs text-slate-400 dark:text-slate-500">
                    <Clock size={10} />
                    {evt.start?.dateTime ? formatDateTime(evt.start.dateTime) : 'TBD'}
                    {evt.location?.displayName && <span>· {evt.location.displayName}</span>}
                  </div>
                  {evt.attendees?.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Users size={10} className="text-slate-400" />
                      <span className="text-2xs text-slate-400 dark:text-slate-500">
                        {evt.attendees.slice(0, 3).map(a => a.emailAddress?.name || a.emailAddress?.address).join(', ')}
                        {evt.attendees.length > 3 && ` +${evt.attendees.length - 3}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
