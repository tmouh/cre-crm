import { useState, useEffect } from 'react'
import { Mail, Loader2, ChevronDown, ChevronRight, AlertCircle, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { getMicrosoftAccount, getEmailsForContact, signInMicrosoft } from '../lib/graphClient'
import { db, supabase } from '../lib/supabase'
import { useCRM } from '../context/CRMContext'

// Strip raw long URLs from bodyPreview and decode HTML entities
function cleanBodyPreview(text) {
  if (!text) return ''
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/https?:\/\/\S{30,}/g, '[link]')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const INITIAL_SHOW = 5

function formatMessageDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function OutlookMessages({ email, contactId, viewingLabel = '' }) {
  const { getContact, updateContact } = useCRM()
  const [account, setAccount] = useState(null)
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    getMicrosoftAccount()
      .then(acc => { setAccount(acc); setChecked(true) })
      .catch(() => setChecked(true))
  }, [])

  useEffect(() => {
    if (!account || !email) return
    setLoading(true)
    setError('')
    getEmailsForContact(email, 90)
      .then(async msgs => {
        setMessages(msgs)
        if (msgs.length > 0 && contactId) {
          // Persist to Supabase for health scoring and offline access
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const msAccount = await import('../lib/msalConfig').then(mod => {
              try { return mod.msalInstance.getAllAccounts()[0]?.username?.toLowerCase() || '' } catch { return '' }
            })
            await db.emailInteractions.upsertBatch(msgs.map(m => ({
              userId: user.id,
              contactId,
              msMessageId: m.id,
              conversationId: m.conversationId || null,
              subject: m.subject || '',
              fromAddress: m.from?.emailAddress?.address || '',
              fromName: m.from?.emailAddress?.name || '',
              receivedAt: m.receivedDateTime,
              bodyPreview: (m.bodyPreview || '').slice(0, 500),
              webLink: m.webLink || '',
              isInbound: msAccount ? m.from?.emailAddress?.address?.toLowerCase() !== msAccount : true,
            }))).catch(() => {})

            // Update contact's lastContacted if newest email is more recent
            const latest = msgs.reduce((a, b) =>
              (a.receivedDateTime || '') > (b.receivedDateTime || '') ? a : b
            )
            if (latest.receivedDateTime) {
              const contact = getContact(contactId)
              const currentLast = contact?.lastContacted || ''
              if (latest.receivedDateTime > currentLast) {
                // Update both DB and in-memory CRMContext state
                await updateContact(contactId, { lastContacted: latest.receivedDateTime }).catch(() => {})
              }
            }
          }
        }
      })
      .catch(e => setError(e.message || 'Failed to fetch emails'))
      .finally(() => setLoading(false))
  }, [account, email, contactId])

  async function handleConnect() {
    try {
      await signInMicrosoft()
    } catch (e) {
      setError(e.message || 'Sign-in failed')
    }
  }

  const displayed = showAll ? messages : messages.slice(0, INITIAL_SHOW)

  return (
    <div className="card overflow-hidden">
      <div className="os-zone-header">
        <div className="flex items-center gap-1.5">
          <Mail size={12} className="text-slate-400 dark:text-slate-500" />
          <span className="os-zone-title">Outlook Messages{viewingLabel}</span>
          {messages.length > 0 && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({messages.length})</span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
        {!checked ? (
          <div className="px-5 py-8 text-center">
            <Loader2 size={20} className="animate-spin text-slate-300 dark:text-slate-600 mx-auto" />
          </div>
        ) : !email ? (
          <div className="px-5 py-8 text-center">
            <Mail size={22} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No email address on this contact</p>
          </div>
        ) : !account ? (
          <div className="px-5 py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 21 21" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Connect Microsoft to see email history</p>
            <button onClick={handleConnect} className="btn-secondary text-xs">
              <Mail size={13} /> Sign in with Microsoft
            </button>
          </div>
        ) : loading ? (
          <div className="px-5 py-8 text-center">
            <Loader2 size={20} className="animate-spin text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Fetching emails...</p>
          </div>
        ) : error ? (
          <div className="px-5 py-6 text-center">
            <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Mail size={22} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No emails in the last 90 days</p>
          </div>
        ) : (
          <>
            {displayed.map(msg => (
              <div key={msg.id} className="px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {expanded === msg.id
                      ? <ChevronDown size={13} className="text-slate-400" />
                      : <ChevronRight size={13} className="text-slate-400" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                        className={clsx('text-sm truncate text-left', expanded === msg.id ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300')}
                      >
                        {msg.subject || '(no subject)'}
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {formatMessageDate(msg.receivedDateTime)}
                        </span>
                        <a
                          href={msg.webLink || `https://outlook.office.com/mail/search/id/${msg.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
                          title="Open in Outlook"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || ''}
                    </p>
                    {expanded === msg.id && msg.bodyPreview && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 whitespace-pre-wrap leading-relaxed">
                        {cleanBodyPreview(msg.bodyPreview)}
                      </p>
                    )}
                    {expanded !== msg.id && msg.bodyPreview && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        {cleanBodyPreview(msg.bodyPreview)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {messages.length > INITIAL_SHOW && (
              <div className="px-5 py-2.5 text-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                >
                  {showAll ? `Show less` : `Show more (${messages.length - INITIAL_SHOW} more)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
