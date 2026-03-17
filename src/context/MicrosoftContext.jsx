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
} from '../services/microsoft'
import { db, supabase } from '../lib/supabase'
import { useCRM } from './CRMContext'
import { syncDealActivities } from '../services/dealActivitySync'

const MicrosoftContext = createContext(null)

export function MicrosoftProvider({ children }) {
  // CRMProvider wraps MicrosoftProvider in App.jsx, so useCRM() is safe here.
  const { contacts, companies, properties, addDealActivity, updateDealActivity } = useCRM()

  // Keep a ref so the sync callback always sees fresh CRM data without
  // needing contacts/companies/properties in its dependency array.
  const crmDataRef = useRef({ contacts, companies, properties, addDealActivity, updateDealActivity })
  useEffect(() => {
    crmDataRef.current = { contacts, companies, properties, addDealActivity, updateDealActivity }
  }, [contacts, companies, properties, addDealActivity, updateDealActivity])

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
        if (pending.length > 0) {
          await db.webhookNotifications.markProcessed(pending.map(n => n.id))
          // Trigger a data refresh
          sync()
        }
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
