import { useState } from 'react'
import {
  Mail, Calendar, FileText, Clock, Users,
} from 'lucide-react'
import clsx from 'clsx'
import { useMicrosoft } from '../context/MicrosoftContext'
import { formatDate, formatDateTime } from '../utils/helpers'

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Inbox() {
  const { isConnected, recentEmails, upcomingEvents } = useMicrosoft()

  const [activeTab, setActiveTab] = useState('emails')

  const tabs = [
    ...(isConnected ? [
      { id: 'emails',   label: 'Emails',   icon: Mail     },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
    ] : []),
  ]

  // If not connected, show connect prompt
  if (!isConnected) {
    return (
      <div className="h-full flex flex-col animate-fade-in">
        <div className="flex-1 flex items-center justify-center px-6 py-4">
          <div className="text-center">
            <Mail size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Connect Microsoft 365</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Connect your Microsoft account to see emails and calendar events here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Tabs toolbar */}
      <div className="os-toolbar flex-shrink-0 border-b-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border-b-2 -mb-[1.5px] transition-colors relative',
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            )}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">

        {/* ── Emails tab ── */}
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

        {/* ── Calendar tab ── */}
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
