import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, ChevronRight, Mail, Users, RefreshCw, Search, Lock } from 'lucide-react'
import clsx from 'clsx'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCRM } from '../context/CRMContext'
import { useAuth } from '../context/AuthContext'
import { signInMicrosoft, getMicrosoftAccount, getOutlookContacts, getEmailsForContact, getLinkedInMap } from '../lib/graphClient'

const STEP = {
  CHOOSE:    'choose',
  CONNECT:   'connect',
  FETCHING:  'fetching',
  PREVIEW:   'preview',
  IMPORTING: 'importing',
  DONE:      'done',
}

const ROW_HEIGHT = 40

export default function OutlookImport({ onClose }) {
  const { contacts, companies, addContact, addCompany, addActivity } = useCRM()
  const { user } = useAuth()

  const [step, setStep]           = useState(STEP.CHOOSE)
  const [importVisibility, setImportVisibility] = useState('shared')
  const [msAccount, setMsAccount] = useState(null)
  const [outlookContacts, setOutlookContacts] = useState([])
  const [selected, setSelected]   = useState(new Set())
  const [importEmails, setImportEmails] = useState(true)
  const [progress, setProgress]   = useState({ current: 0, total: 0, label: '' })
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const [previewSearch, setPreviewSearch] = useState('')

  const scrollRef = useRef(null)

  // If already signed in, populate msAccount state but don't auto-fetch
  // (user must first choose Personal vs Shared on the CHOOSE step)
  useEffect(() => {
    getMicrosoftAccount()
      .then(acc => { if (acc) setMsAccount(acc) })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-build lookup maps from existing data
  const existingByEmail = Object.fromEntries(
    contacts.filter(c => c.email).map(c => [c.email.toLowerCase(), c.id])
  )
  const existingCompanyByName = Object.fromEntries(
    companies.map(c => [c.name.toLowerCase(), c.id])
  )

  // Filtered contacts for preview (search)
  const filteredContacts = useMemo(() => {
    if (!previewSearch.trim()) return outlookContacts
    const q = previewSearch.toLowerCase()
    return outlookContacts.filter(c => {
      const name = (c.displayName || `${c.givenName || ''} ${c.surname || ''}`).toLowerCase()
      const email = (c.emailAddresses?.[0]?.address || '').toLowerCase()
      const company = (c.companyName || '').toLowerCase()
      return name.includes(q) || email.includes(q) || company.includes(q)
    })
  }, [outlookContacts, previewSearch])

  const virtualizer = useVirtualizer({
    count: filteredContacts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  })

  async function handleConnect() {
    setError('')
    try {
      // If already signed in, just fetch contacts directly
      const acc = await getMicrosoftAccount()
      if (acc) {
        setMsAccount(acc)
        await doFetch()
        return
      }
      // Not signed in — redirect to Microsoft (page navigates away)
      await signInMicrosoft()
    } catch (e) {
      setError(e.message || 'Microsoft sign-in failed.')
    }
  }

  async function doFetch() {
    setStep(STEP.FETCHING)
    setError('')
    try {
      const raw = await getOutlookContacts()
      // Only include contacts that have at least a name
      const valid = raw.filter(c => c.displayName || c.givenName || c.surname)
      setOutlookContacts(valid)
      // Pre-select only contacts not already in the DB (matched by email)
      const newIds = new Set(
        valid
          .filter(c => {
            const email = c.emailAddresses?.[0]?.address?.toLowerCase()
            return !email || !existingByEmail[email]
          })
          .map(c => c.id)
      )
      setSelected(newIds)
      setStep(STEP.PREVIEW)
    } catch (e) {
      setError(e.message || 'Failed to fetch Outlook contacts.')
      setStep(STEP.CONNECT)
    }
  }

  function selectAllVisible() {
    setSelected(prev => {
      const next = new Set(prev)
      for (const c of filteredContacts) next.add(c.id)
      return next
    })
  }

  function deselectAllVisible() {
    setSelected(prev => {
      const next = new Set(prev)
      for (const c of filteredContacts) next.delete(c.id)
      return next
    })
  }

  function selectOnlyNew() {
    const newIds = new Set(
      outlookContacts
        .filter(c => {
          const email = c.emailAddresses?.[0]?.address?.toLowerCase()
          return !email || !existingByEmail[email]
        })
        .map(c => c.id)
    )
    setSelected(newIds)
  }

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleImport() {
    setStep(STEP.IMPORTING)
    setError('')

    const toImport = outlookContacts.filter(c => selected.has(c.id))
    let contactsCreated = 0
    let companiesCreated = 0
    let activitiesCreated = 0

    // Local company name map that grows as we create new companies
    const companyMap = { ...existingCompanyByName }

    setProgress({ current: 0, total: toImport.length, label: 'Looking up LinkedIn profiles...' })
    const linkedInMap = await getLinkedInMap()

    for (let i = 0; i < toImport.length; i++) {
      const oc = toImport[i]
      const email = oc.emailAddresses?.[0]?.address || ''
      const displayName = oc.displayName || `${oc.givenName || ''} ${oc.surname || ''}`.trim()

      setProgress({ current: i + 1, total: toImport.length, label: `Importing ${displayName}...` })

      // Skip if already exists in Vanadium CRM by email
      if (email && existingByEmail[email.toLowerCase()]) continue

      // Resolve or create company (only after we know we'll import this contact)
      let companyId = ''
      if (oc.companyName?.trim()) {
        const key = oc.companyName.trim().toLowerCase()
        if (companyMap[key]) {
          companyId = companyMap[key]
        } else {
          try {
            const newCo = await addCompany({ name: oc.companyName.trim(), type: 'other' })
            companyMap[key] = newCo.id
            companyId = newCo.id
            companiesCreated++
          } catch { /* skip on error */ }
        }
      }

      // Look up LinkedIn URL from People API
      const linkedIn = email
        ? (linkedInMap.get(email.toLowerCase()) || '').replace(/^https?:\/\/(www\.)?/, '')
        : ''

      // Create the contact
      let newContact = null
      try {
        newContact = await addContact({
          firstName: oc.givenName  || displayName.split(' ')[0] || '',
          lastName:  oc.surname    || displayName.split(' ').slice(1).join(' ') || '',
          title:     oc.jobTitle   || '',
          companyId: companyId || undefined,
          email,
          phone:  oc.businessPhones?.[0] || '',
          mobile: oc.mobilePhone || '',
          linkedIn,
          notes:  oc.personalNotes || '',
          tags:   (oc.categories || []).map(c => c.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean),
          ownerIds: user ? [user.id] : [],
          visibility: importVisibility,
          outlookContactId: oc.id,    // link to the source Outlook contact
          _skipOutlookPush: true,     // data came FROM Outlook — no push needed
        })
        contactsCreated++
      } catch {
        continue // Skip this contact on failure and keep going
      }

      // Optionally import email history as activity records
      if (importEmails && email && newContact) {
        setProgress({
          current: i + 1,
          total: toImport.length,
          label: `Fetching emails for ${displayName}...`,
        })
        const emails = await getEmailsForContact(email, 90)
        for (const msg of emails) {
          try {
            const date = msg.receivedDateTime
              ? new Date(msg.receivedDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : ''
            const desc = [
              date && `[${date}]`,
              msg.subject || '(no subject)',
              msg.bodyPreview ? `— ${msg.bodyPreview}` : '',
            ].filter(Boolean).join(' ').slice(0, 500)

            await addActivity({
              type:      'email',
              description: desc,
              contactId: newContact.id,
              companyId: companyId || undefined,
            })
            activitiesCreated++
          } catch { /* skip individual email on error */ }
        }
      }
    }

    setResult({ contactsCreated, companiesCreated, activitiesCreated })
    setStep(STEP.DONE)
  }

  const pct = progress.total ? Math.round((progress.current / progress.total) * 100) : 0

  // Count how many of the visible (filtered) contacts are selected
  const visibleSelectedCount = filteredContacts.filter(c => selected.has(c.id)).length

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Microsoft-style icon */}
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <svg viewBox="0 0 21 21" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
                <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Import from Outlook</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* CHOOSE — Personal vs Shared */}
          {step === STEP.CHOOSE && (
            <div className="flex flex-col gap-4 py-4">
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Import Outlook contacts as…</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose where imported contacts will appear.</p>
              </div>

              <div className="space-y-3">
                {/* Personal option */}
                <button
                  type="button"
                  onClick={() => setImportVisibility('private')}
                  className={clsx(
                    'w-full flex items-start gap-4 p-4 border-2 transition-colors text-left',
                    importVisibility === 'private'
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
                      : 'border-[var(--border)] hover:border-slate-400 dark:hover:border-slate-500'
                  )}
                >
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', importVisibility === 'private' ? 'bg-brand-100 dark:bg-brand-900/40' : 'bg-slate-100 dark:bg-slate-700')}>
                    <Lock size={18} className={importVisibility === 'private' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Personal</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Private to you only. Appears in <strong>My Contacts</strong>. Not visible to your team.</p>
                  </div>
                  <div className={clsx('w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ml-auto flex items-center justify-center', importVisibility === 'private' ? 'border-brand-500 bg-brand-500' : 'border-slate-300 dark:border-slate-600')}>
                    {importVisibility === 'private' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>

                {/* Shared option */}
                <button
                  type="button"
                  onClick={() => setImportVisibility('shared')}
                  className={clsx(
                    'w-full flex items-start gap-4 p-4 border-2 transition-colors text-left',
                    importVisibility === 'shared'
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-600'
                      : 'border-[var(--border)] hover:border-slate-400 dark:hover:border-slate-500'
                  )}
                >
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', importVisibility === 'shared' ? 'bg-brand-100 dark:bg-brand-900/40' : 'bg-slate-100 dark:bg-slate-700')}>
                    <Users size={18} className={importVisibility === 'shared' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Shared <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 ml-1">(default)</span></p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Visible to all team members. Appears in both <strong>My Contacts</strong> and <strong>CRM Contacts</strong>.</p>
                  </div>
                  <div className={clsx('w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ml-auto flex items-center justify-center', importVisibility === 'shared' ? 'border-brand-500 bg-brand-500' : 'border-slate-300 dark:border-slate-600')}>
                    {importVisibility === 'shared' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setStep(STEP.CONNECT)}
                  className="v-btn-primary flex items-center gap-2"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* CONNECT */}
          {step === STEP.CONNECT && (
            <div className="flex flex-col items-center text-center py-8 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Users size={30} className="text-blue-500 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Connect your Microsoft account</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Sign in with your Vanadium Microsoft 365 account to pull Outlook contacts and optionally import email history as activity records.
                </p>
              </div>

              {msAccount && (
                <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-full">
                  Signed in as <strong>{msAccount.username}</strong>
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 w-full text-left">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                {msAccount && (
                  <button onClick={doFetch} className="v-btn-secondary flex items-center gap-2">
                    <RefreshCw size={14} /> Fetch Contacts
                  </button>
                )}
                <button onClick={handleConnect} className="v-btn-primary flex items-center gap-2">
                  <Mail size={14} />
                  {msAccount ? 'Re-authenticate' : 'Sign in with Microsoft'}
                </button>
              </div>
            </div>
          )}

          {/* FETCHING */}
          {step === STEP.FETCHING && (
            <div className="flex flex-col items-center py-14 gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 size={32} className="animate-spin text-blue-400" />
              <p className="text-sm">Fetching your Outlook contacts…</p>
            </div>
          )}

          {/* PREVIEW */}
          {step === STEP.PREVIEW && (
            <div className="space-y-3">
              {/* Summary + search */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={previewSearch}
                    onChange={e => setPreviewSearch(e.target.value)}
                    placeholder="Search by name, email, or company…"
                    className="v-input pl-8 py-1.5 text-sm w-full"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap flex-shrink-0">
                  {filteredContacts.length !== outlookContacts.length
                    ? `${filteredContacts.length} of ${outlookContacts.length}`
                    : outlookContacts.length}{' '}
                  contacts · <strong className="text-green-600 dark:text-green-400">{selected.size}</strong> selected
                </p>
              </div>

              {/* Bulk selection buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={selectOnlyNew} className="text-xs px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30 transition-colors">
                  Select only new
                </button>
                <button onClick={selectAllVisible} className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors">
                  Select all{previewSearch ? ' visible' : ''}
                </button>
                <button onClick={deselectAllVisible} className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors">
                  Deselect all{previewSearch ? ' visible' : ''}
                </button>
              </div>

              {/* Email history toggle */}
              <label className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={importEmails}
                  onChange={e => setImportEmails(e.target.checked)}
                  className="rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Import email history (last 90 days)</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Adds recent emails as activity records on each imported contact
                  </p>
                </div>
                <Mail size={16} className="text-blue-400 flex-shrink-0" />
              </label>

              {/* Virtualized contact list */}
              <div className="border border-[var(--border)] overflow-hidden">
                {/* Sticky header */}
                <div className="grid grid-cols-[32px_1fr_1fr_1fr_60px] gap-1 bg-slate-50 dark:bg-slate-700/50 border-b border-[var(--border)] px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <div>
                    <input
                      type="checkbox"
                      checked={filteredContacts.length > 0 && visibleSelectedCount === filteredContacts.length}
                      onChange={() => visibleSelectedCount === filteredContacts.length ? deselectAllVisible() : selectAllVisible()}
                      className="rounded"
                    />
                  </div>
                  <div>Name</div>
                  <div>Email</div>
                  <div>Company</div>
                  <div>Status</div>
                </div>

                {/* Scrollable virtual body */}
                <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 400 }}>
                  <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                    {virtualizer.getVirtualItems().map(vRow => {
                      const c = filteredContacts[vRow.index]
                      const email = c.emailAddresses?.[0]?.address || ''
                      const exists = email && existingByEmail[email.toLowerCase()]
                      const name = c.displayName || `${c.givenName || ''} ${c.surname || ''}`.trim()
                      const cats = c.categories || []
                      return (
                        <div
                          key={c.id}
                          className={clsx(
                            'grid grid-cols-[32px_1fr_1fr_1fr_60px] gap-1 px-3 items-center border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer',
                            !selected.has(c.id) && 'opacity-40'
                          )}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: ROW_HEIGHT,
                            transform: `translateY(${vRow.start}px)`,
                          }}
                          onClick={() => toggle(c.id)}
                        >
                          <div onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(c.id)}
                              onChange={() => toggle(c.id)}
                              className="rounded"
                            />
                          </div>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={name}>
                            {name || '—'}
                            {cats.length > 0 && (
                              <span className="ml-1.5 text-[10px] text-purple-500 dark:text-purple-400 font-normal">{cats.join(', ')}</span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate" title={email}>{email || '—'}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate" title={c.companyName}>{c.companyName || '—'}</div>
                          <div>
                            {exists
                              ? <span className="v-badge bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 text-[10px]">Exists</span>
                              : <span className="v-badge bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300 text-[10px]">New</span>
                            }
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* IMPORTING */}
          {step === STEP.IMPORTING && (
            <div className="flex flex-col items-center py-10 gap-5">
              <Loader2 size={32} className="animate-spin text-blue-400" />
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate pr-2">{progress.label}</span>
                  <span className="flex-shrink-0">{pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                  {progress.current} / {progress.total} contacts
                </p>
              </div>
            </div>
          )}

          {/* DONE */}
          {step === STEP.DONE && result && (
            <div className="flex flex-col items-center py-8 gap-5 text-center">
              <CheckCircle2 size={44} className="text-green-500" />
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Import complete</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{result.contactsCreated}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Contacts added</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{result.companiesCreated}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Companies added</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{result.activitiesCreated}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Emails logged</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {(step === STEP.PREVIEW || step === STEP.DONE) && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex gap-2 flex-shrink-0">
            {step === STEP.PREVIEW && (
              <>
                <button
                  onClick={handleImport}
                  disabled={selected.size === 0}
                  className="v-btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Import {selected.size} contact{selected.size !== 1 ? 's' : ''}
                  <ChevronRight size={15} />
                </button>
                <button onClick={onClose} className="v-btn-secondary">Cancel</button>
              </>
            )}
            {step === STEP.DONE && (
              <button onClick={onClose} className="v-btn-primary flex-1">Done</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
