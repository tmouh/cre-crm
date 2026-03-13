import { useState, useEffect } from 'react'
import { Paperclip, Loader2, Download, AlertCircle, FileText, Image, File, ExternalLink } from 'lucide-react'
import { getMicrosoftAccount, getAttachmentsForContact, downloadAttachment, signInMicrosoft } from '../lib/graphClient'

const INITIAL_SHOW = 5

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function FileIcon({ contentType }) {
  if (contentType?.startsWith('image/')) return <Image size={14} className="text-purple-400" />
  if (contentType?.includes('pdf')) return <FileText size={14} className="text-red-400" />
  return <File size={14} className="text-slate-400" />
}

export default function OutlookAttachments({ email }) {
  const [account, setAccount] = useState(null)
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(null)
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
    getAttachmentsForContact(email, 90)
      .then(atts => setAttachments(atts))
      .catch(e => setError(e.message || 'Failed to fetch attachments'))
      .finally(() => setLoading(false))
  }, [account, email])

  async function handleDownload(att) {
    setDownloading(att.id)
    try {
      const url = await downloadAttachment(att.messageId, att.id)
      const a = document.createElement('a')
      a.href = url
      a.download = att.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silent fail
    } finally {
      setDownloading(null)
    }
  }

  async function handleConnect() {
    try {
      await signInMicrosoft()
    } catch (e) {
      setError(e.message || 'Sign-in failed')
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="os-zone-header">
        <div className="flex items-center gap-1.5">
          <Paperclip size={12} className="text-slate-400 dark:text-slate-500" />
          <span className="os-zone-title">Outlook Attachments</span>
          {attachments.length > 0 && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({attachments.length})</span>
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
            <Paperclip size={22} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No email address on this contact</p>
          </div>
        ) : !account ? (
          <div className="px-5 py-8 text-center">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 21 21" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Connect Microsoft to see attachments</p>
            <button onClick={handleConnect} className="v-btn-secondary text-[11px]">
              <Paperclip size={13} /> Sign in with Microsoft
            </button>
          </div>
        ) : loading ? (
          <div className="px-5 py-8 text-center">
            <Loader2 size={20} className="animate-spin text-amber-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Fetching attachments...</p>
          </div>
        ) : error ? (
          <div className="px-5 py-6 text-center">
            <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          </div>
        ) : attachments.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Paperclip size={22} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No attachments in the last 90 days</p>
          </div>
        ) : (
          <>
            {(showAll ? attachments : attachments.slice(0, INITIAL_SHOW)).map(att => (
              <div key={`${att.messageId}-${att.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 dark:hover:bg-surface-100 transition-colors">
                <FileIcon contentType={att.contentType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{att.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatSize(att.size)}</span>
                    {att.subject && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{att.subject}</span>
                      </>
                    )}
                    {att.date && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatDate(att.date)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={att.webLink || `https://outlook.office.com/mail/search/id/${att.messageId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
                    title="Open in Outlook"
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    onClick={() => handleDownload(att)}
                    disabled={downloading === att.id}
                    className="p-1.5 text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400 transition-colors"
                  >
                    {downloading === att.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Download size={14} />
                    }
                  </button>
                </div>
              </div>
            ))}
            {attachments.length > INITIAL_SHOW && (
              <div className="px-5 py-2.5 text-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                >
                  {showAll ? `Show less` : `Show more (${attachments.length - INITIAL_SHOW} more)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
