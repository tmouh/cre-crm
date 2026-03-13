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
} from '../services/microsoft'

const MicrosoftContext = createContext(null)

export function MicrosoftProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [profile, setProfile] = useState(null)
  const [capabilities, setCapabilities] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
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

      setSyncState({ lastSync: new Date().toISOString(), syncing: false, error: null })
    } catch (err) {
      setSyncState(prev => ({ ...prev, syncing: false, error: err.message }))
    }
  }, [isConnected, capabilities])

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

  const connect = useCallback(async (fullScopes = false) => {
    await signInMicrosoft(fullScopes)
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
