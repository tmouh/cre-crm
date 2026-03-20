import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  getMicrosoftAccount,
  getMicrosoftProfile,
  signInMicrosoft,
  signOutMicrosoft,
  checkCapabilities,
  getRecentEmails,
  getUpcomingEvents,
  getRecentFiles,
  createGraphSubscription,
  renewGraphSubscription,
  listGraphSubscriptions,
  updateOutlookContact,
  createOutlookContact,
  deleteOutlookContact,
  getOutlookContact,
  getModifiedOutlookContacts,
} from '../services/microsoft'
import { db, supabase } from '../lib/supabase'
import { useCRM } from './CRMContext'
import { syncDealActivities } from '../services/dealActivitySync'
import { syncMeetingTranscripts } from '../services/meetingTranscriptSync'

const MicrosoftContext = createContext(null)

const CONTACT_SYNC_KEY = 'ms_last_contact_sync'

/**
 * Poll Outlook for contacts modified since the last sync and apply any
 * changes to matching CRM records. Uses localStorage to track the last
 * checked timestamp so only genuinely changed contacts are processed.
 * On first run, sets the baseline to now and skips (no back-fill).
 */
async function syncOutlookContactsToCrm({ contacts: crmContacts, updateContact: uc }) {
  const stored = localStorage.getItem(CONTACT_SYNC_KEY)
  const now    = new Date().toISOString()

  if (!stored) {
    localStorage.setItem(CONTACT_SYNC_KEY, now)
    return
  }

  try {
    const modified = await getModifiedOutlookContacts(stored)
    if (!modified.length) {
      localStorage.setItem(CONTACT_SYNC_KEY, now)
      return
    }

    let updated = 0
    for (const outlookContact of modified) {
      const crmContact = crmContacts.find(c => c.outlookContactId === outlookContact.id)
      if (!crmContact) continue

      const patch = outlookToCrmPatch(outlookContact)
      if (!Object.keys(patch).length) continue

      await uc(crmContact.id, patch, { skipOutlookPush: true })
      updated++
    }

    if (updated > 0) {
      console.log(`[OutlookSync] pulled ${updated} contact update(s) from Outlook`)
    }
    localStorage.setItem(CONTACT_SYNC_KEY, now)
  } catch (err) {
    console.warn('[OutlookSync] poll error:', err?.message)
    // Don't update the timestamp on error so next sync retries the same window
  }
}

// Maps Outlook contact fields → CRM patch (direction: Outlook → CRM)
function outlookToCrmPatch(c) {
  const patch = {}
  if (c.givenName        !== undefined) patch.firstName     = c.givenName        || ''
  if (c.surname          !== undefined) patch.lastName      = c.surname          || ''
  if (c.middleName       !== undefined) patch.middleName    = c.middleName       || ''
  if (c.generation       !== undefined) patch.suffix        = c.generation       || ''
  if (c.nickName         !== undefined) patch.nickname      = c.nickName         || ''
  if (c.jobTitle         !== undefined) patch.title         = c.jobTitle         || ''
  if (c.personalNotes    !== undefined) patch.notes         = c.personalNotes    || ''
  if (c.mobilePhone      !== undefined) patch.mobile        = c.mobilePhone      || ''
  if (c.emailAddresses   !== undefined) {
    patch.email          = c.emailAddresses?.[0]?.address || ''
    patch.email2         = c.emailAddresses?.[1]?.address || ''
    patch.email3         = c.emailAddresses?.[2]?.address || ''
  }
  if (c.businessPhones   !== undefined) {
    patch.phone          = c.businessPhones?.[0] || ''
    patch.businessPhone2 = c.businessPhones?.[1] || ''
  }
  if (c.homePhones       !== undefined) {
    patch.homePhone      = c.homePhones?.[0] || ''
    patch.homePhone2     = c.homePhones?.[1] || ''
  }
  if (c.categories       !== undefined) patch.tags          = c.categories       || []
  if (c.birthday         !== undefined) patch.birthday      = c.birthday         || ''
  if (c.businessHomePage !== undefined) patch.webPage       = c.businessHomePage  || ''
  if (c.businessAddress  !== undefined) {
    patch.businessStreet     = c.businessAddress?.street          || ''
    patch.businessCity       = c.businessAddress?.city            || ''
    patch.businessState      = c.businessAddress?.state           || ''
    patch.businessPostalCode = c.businessAddress?.postalCode      || ''
    patch.businessCountry    = c.businessAddress?.countryOrRegion || ''
  }
  if (c.homeAddress      !== undefined) {
    patch.homeStreet     = c.homeAddress?.street          || ''
    patch.homeCity       = c.homeAddress?.city            || ''
    patch.homeState      = c.homeAddress?.state           || ''
    patch.homePostalCode = c.homeAddress?.postalCode      || ''
    patch.homeCountry    = c.homeAddress?.countryOrRegion || ''
  }
  if (c.otherAddress     !== undefined) {
    patch.otherStreet     = c.otherAddress?.street          || ''
    patch.otherCity       = c.otherAddress?.city            || ''
    patch.otherState      = c.otherAddress?.state           || ''
    patch.otherPostalCode = c.otherAddress?.postalCode      || ''
    patch.otherCountry    = c.otherAddress?.countryOrRegion || ''
  }
  return patch
}

export function MicrosoftProvider({ children }) {
  // CRMProvider wraps MicrosoftProvider in App.jsx, so useCRM() is safe here.
  const { contacts, companies, properties, addDealActivity, updateDealActivity, addMeetingTranscript, updateMeetingTranscript, registerOutlookPush, registerOutlookDelete, updateContact, deleteContact } = useCRM()

  // Keep a ref so the sync callback always sees fresh CRM data without
  // needing contacts/companies/properties in its dependency array.
  const crmDataRef = useRef({ contacts, companies, properties, addDealActivity, updateDealActivity, addMeetingTranscript, updateMeetingTranscript, updateContact, deleteContact })
  useEffect(() => {
    crmDataRef.current = { contacts, companies, properties, addDealActivity, updateDealActivity, addMeetingTranscript, updateMeetingTranscript, updateContact, deleteContact }
  }, [contacts, companies, properties, addDealActivity, updateDealActivity, addMeetingTranscript, updateMeetingTranscript, updateContact, deleteContact])

  const [account, setAccount] = useState(null)
  const [profile, setProfile] = useState(null)
  const [capabilities, setCapabilities] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectError, setConnectError] = useState(null)
  const [syncState, setSyncState] = useState({
    lastSync: null,
    syncing: false,
    error: null,
  })

  // Cached data
  const [recentEmails, setRecentEmails] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [recentFiles, setRecentFiles] = useState([])

  const syncIntervalRef = useRef(null)

  // ─── Outlook contact write-back (CRM → Outlook) ──────────────────────────
  // Register a push callback with CRMContext so that every contact save
  // automatically propagates to Outlook (fire-and-forget; never blocks CRM).
  useEffect(() => {
    registerOutlookPush(async (contact) => {
      if (contact._skipOutlookPush) return  // came from Outlook — skip to avoid loop
      try {
        const { companies: co, updateContact: uc } = crmDataRef.current
        const companyName = contact.companyId
          ? co.find(c => c.id === contact.companyId)?.name
          : undefined
        if (!contact.outlookContactId) {
          // No Outlook link yet — create in Outlook and write back the ID
          console.log('[OutlookPush] creating new Outlook contact for', contact.firstName, contact.lastName)
          const result = await createOutlookContact(contact, companyName)
          if (result?.id) await uc(contact.id, { outlookContactId: result.id }, { skipOutlookPush: true })
        } else {
          // Existing Outlook-linked contact — PATCH it
          console.log('[OutlookPush] patching outlook contact', contact.outlookContactId)
          await updateOutlookContact(contact.outlookContactId, contact, companyName)
        }
      } catch (err) { console.error('[OutlookPush] failed:', err?.message || err) }
    })
  }, [registerOutlookPush]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Outlook contact delete (CRM → Outlook) ───────────────────────────────
  useEffect(() => {
    registerOutlookDelete(async (outlookId) => {
      try {
        console.log('[OutlookPush] deleting Outlook contact', outlookId)
        await deleteOutlookContact(outlookId)
      } catch (err) { console.error('[OutlookPush] delete failed:', err?.message || err) }
    })
  }, [registerOutlookDelete]) // eslint-disable-line react-hooks/exhaustive-deps

  // Check connection status on mount
  useEffect(() => {
    async function init() {
      try {
        const acct = await getMicrosoftAccount()
        if (acct) {
          setAccount(acct)
          setIsConnected(true)

          // Load profile and capabilities in parallel
          const [prof, caps] = await Promise.allSettled([
            getMicrosoftProfile(),
            checkCapabilities(),
          ])
          if (prof.status === 'fulfilled') setProfile(prof.value)
          if (caps.status === 'fulfilled') setCapabilities(caps.value)

          // Persist connection info to Supabase
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const profileData = prof.status === 'fulfilled' ? prof.value : null
            db.microsoftConnections.upsert({
              userId: user.id,
              msUserId: acct.localAccountId || acct.homeAccountId,
              msEmail: acct.username,
              msDisplayName: profileData?.displayName || acct.name || '',
              tenantId: acct.tenantId || '',
              connectedAt: new Date().toISOString(),
              lastSyncedAt: new Date().toISOString(),
            }).catch(() => {})
          }
        }
      } catch {
        // Not connected
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  // Sync function — fetches latest data from Microsoft
  const sync = useCallback(async () => {
    if (!isConnected) return
    setSyncState(prev => ({ ...prev, syncing: true, error: null }))
    try {
      const [emails, events, files] = await Promise.allSettled([
        capabilities?.mail ? getRecentEmails(30) : Promise.resolve([]),
        capabilities?.calendar ? getUpcomingEvents(14) : Promise.resolve([]),
        capabilities?.files ? getRecentFiles(20) : Promise.resolve([]),
      ])

      if (emails.status === 'fulfilled') setRecentEmails(emails.value)
      if (events.status === 'fulfilled') setUpcomingEvents(events.value)
      if (files.status === 'fulfilled') setRecentFiles(files.value)

      const now = new Date().toISOString()
      setSyncState({ lastSync: now, syncing: false, error: null })
      // Update lastSyncedAt in Supabase
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) db.microsoftConnections.upsert({ userId: user.id, lastSyncedAt: now }).catch(() => {})
      })
      // Run deal activity scoring on recent sent messages (best-effort, non-blocking)
      if (capabilities?.mail) {
        syncDealActivities(crmDataRef.current).catch(() => {})
      }
      // Sync Teams meeting transcripts (best-effort, non-blocking)
      if (capabilities?.meetings && capabilities?.transcripts) {
        syncMeetingTranscripts(crmDataRef.current).catch(() => {})
      }
      // Poll for Outlook contact changes and push into CRM (best-effort, non-blocking)
      if (capabilities?.contacts) {
        syncOutlookContactsToCrm(crmDataRef.current).catch(() => {})
      }
      // Prune old data once per day to stay within Supabase free tier limits
      const lastCleanup = localStorage.getItem('ms_last_cleanup')
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      if (!lastCleanup || Number(lastCleanup) < oneDayAgo) {
        localStorage.setItem('ms_last_cleanup', String(Date.now()))
        db.webhookNotifications.deleteOld(7).catch(() => {})
        db.emailInteractions.deleteOld(90).catch(() => {})
      }
    } catch (err) {
      setSyncState(prev => ({ ...prev, syncing: false, error: err.message }))
    }
  }, [isConnected, capabilities]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync when connected and capabilities are known
  useEffect(() => {
    if (isConnected && capabilities) {
      sync()
    }
  }, [isConnected, capabilities]) // eslint-disable-line

  // Periodic sync every 5 minutes
  useEffect(() => {
    if (!isConnected) return
    syncIntervalRef.current = setInterval(() => sync(), 5 * 60 * 1000)
    return () => clearInterval(syncIntervalRef.current)
  }, [isConnected, sync])

  // Auto-create Graph webhook subscriptions when connected
  useEffect(() => {
    if (!isConnected || !capabilities) return
    async function ensureSubscriptions() {
      try {
        const existing = await listGraphSubscriptions()
        const existingResources = new Set((existing || []).map(s => s.resource))
        const desired = []
        if (capabilities.mail && !existingResources.has('me/messages'))
          desired.push({ resource: 'me/messages', changeType: 'created,updated' })
        if (capabilities.calendar && !existingResources.has('me/events'))
          desired.push({ resource: 'me/events', changeType: 'created,updated,deleted' })
        if (capabilities.contacts && !existingResources.has('me/contacts'))
          desired.push({ resource: 'me/contacts', changeType: 'created,updated,deleted' })

        for (const sub of desired) {
          try {
            const result = await createGraphSubscription(sub.resource, sub.changeType)
            if (result?.id) {
              await db.graphSubscriptions.upsert({
                msSubscriptionId: result.id,
                resource: sub.resource,
                changeType: sub.changeType,
                expiresAt: result.expirationDateTime,
                notificationUrl: result.notificationUrl,
              }).catch(() => {})
            }
          } catch {
            // Subscription creation can fail if webhook URL isn't reachable yet
          }
        }

        // Renew any subscriptions expiring within 12 hours
        for (const s of existing || []) {
          const expiresAt = new Date(s.expirationDateTime)
          if (expiresAt.getTime() - Date.now() < 12 * 60 * 60 * 1000) {
            try {
              const renewed = await renewGraphSubscription(s.id)
              if (renewed?.id) {
                await db.graphSubscriptions.upsert({
                  msSubscriptionId: renewed.id,
                  resource: s.resource,
                  expiresAt: renewed.expirationDateTime,
                }).catch(() => {})
              }
            } catch { /* subscription may have already expired */ }
          }
        }
      } catch {
        // Graph subscriptions are best-effort
      }
    }
    ensureSubscriptions()
    // Re-check subscriptions every 6 hours
    const interval = setInterval(ensureSubscriptions, 6 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [isConnected, capabilities]) // eslint-disable-line

  // Poll for unprocessed webhook notifications and trigger sync
  useEffect(() => {
    if (!isConnected) return
    async function pollNotifications() {
      try {
        const pending = await db.webhookNotifications.getUnprocessed(20)
        if (pending.length === 0) return
        await db.webhookNotifications.markProcessed(pending.map(n => n.id))

        // Split contact notifications from everything else
        const contactNotifs = pending.filter(n => /\/contacts\//i.test(n.resource || ''))
        const otherNotifs   = pending.filter(n => !/\/contacts\//i.test(n.resource || ''))

        // ── Outlook → CRM contact sync ──────────────────────────────────────
        if (contactNotifs.length > 0) {
          const { contacts: crmContacts, updateContact: uc, deleteContact: dc } = crmDataRef.current
          const seen = new Set()
          for (const n of contactNotifs) {
            const match = (n.resource || '').match(/\/contacts\/([^/?]+)/i)
            if (!match) continue
            const outlookId = match[1]
            if (seen.has(outlookId)) continue
            seen.add(outlookId)
            const crmContact = crmContacts.find(c => c.outlookContactId === outlookId)
            if (!crmContact) continue  // not tracked in CRM, skip

            if (n.change_type === 'deleted') {
              // Outlook-side delete → soft-delete CRM contact, skip Outlook push to avoid loop
              try {
                console.log('[OutlookSync] soft-deleting CRM contact from Outlook deletion:', crmContact.firstName, crmContact.lastName)
                await dc(crmContact.id, { skipOutlookDelete: true })
              } catch (err) { console.warn('[OutlookSync] delete failed for', outlookId, err?.message) }
              continue
            }

            try {
              const outlookContact = await getOutlookContact(outlookId)
              if (!outlookContact) continue
              const patch = outlookToCrmPatch(outlookContact)
              if (Object.keys(patch).length > 0) {
                console.log('[OutlookSync] updating CRM contact from Outlook:', crmContact.firstName, crmContact.lastName)
                await uc(crmContact.id, patch, { skipOutlookPush: true })
              }
            } catch (err) { console.warn('[OutlookSync] failed for', outlookId, err?.message) }
          }
        }

        // Trigger general data refresh for mail/calendar notifications
        if (otherNotifs.length > 0) sync()
      } catch { /* polling is best-effort */ }
    }
    // Poll every 30 seconds for near-real-time updates
    const interval = setInterval(pollNotifications, 30 * 1000)
    // Initial check
    pollNotifications()
    return () => clearInterval(interval)
  }, [isConnected, sync])

  const connect = useCallback(async (fullScopes = false) => {
    setConnectError(null)
    try {
      await signInMicrosoft(fullScopes)
      // If incremental consent was handled via popup (no redirect), re-check capabilities
      // so the Settings page updates immediately without a page reload.
      if (fullScopes) {
        const caps = await checkCapabilities()
        setCapabilities(caps)
      }
    } catch (err) {
      // user_cancelled = they closed the popup intentionally, no error needed
      if (err?.errorCode === 'user_cancelled') return
      // popup_window_error = browser blocked the popup
      if (err?.errorCode === 'popup_window_error' || err?.message?.includes('popup')) {
        setConnectError('Popup was blocked. Please allow popups for this site, then try again.')
        return
      }
      setConnectError(err?.message || 'Failed to connect. Please try again.')
    }
  }, [])

  const disconnect = useCallback(async () => {
    await signOutMicrosoft()
    setAccount(null)
    setProfile(null)
    setCapabilities(null)
    setIsConnected(false)
    setRecentEmails([])
    setUpcomingEvents([])
    setRecentFiles([])
  }, [])

  return (
    <MicrosoftContext.Provider value={{
      // Connection state
      account,
      profile,
      capabilities,
      isConnected,
      isLoading,

      // Actions
      connect,
      disconnect,
      sync,
      connectError,
      clearConnectError: () => setConnectError(null),

      // Sync state
      syncState,

      // Cached data
      recentEmails,
      upcomingEvents,
      recentFiles,
    }}>
      {children}
    </MicrosoftContext.Provider>
  )
}

export function useMicrosoft() {
  const ctx = useContext(MicrosoftContext)
  if (!ctx) throw new Error('useMicrosoft must be used within MicrosoftProvider')
  return ctx
}
