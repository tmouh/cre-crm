import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { db, seedDatabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const CRMContext = createContext(null)

// Returns the most recent contact date from activities + completed reminders
function calcLastContacted(contactId, activitiesList, remindersList) {
  const dates = [
    ...activitiesList.filter(a => a.contactId === contactId).map(a => a.date || a.createdAt).filter(Boolean),
    ...remindersList.filter(r => r.contactId === contactId && r.status === 'done' && (r.completedAt || r.dueDate)).map(r => r.completedAt || r.dueDate),
  ].filter(Boolean).sort().reverse()
  return dates[0] || null
}

export function CRMProvider({ children }) {
  // Safe to call here — CRMProvider is always a child of AuthProvider in App.jsx
  const { user } = useAuth()

  const [contacts,       setContacts]       = useState([])
  const [companies,      setCompanies]      = useState([])
  const [properties,     setProperties]     = useState([])
  const [reminders,      setReminders]      = useState([])
  const [activities,     setActivities]     = useState([])
  const [teamMembers,    setTeamMembers]    = useState([])
  const [comps,          setComps]          = useState([])
  const [investors,      setInvestors]      = useState([])
  const [dealInvestors,  setDealInvestors]  = useState([])
  const [automations,    setAutomations]    = useState([])
  const [dealActivities,      setDealActivities]      = useState([])
  const [meetingTranscripts,  setMeetingTranscripts]  = useState([])
  const [customOptions,       setCustomOptions]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)

  const [deletedContacts,   setDeletedContacts]   = useState([])
  const [deletedCompanies,  setDeletedCompanies]  = useState([])
  const [deletedProperties, setDeletedProperties] = useState([])
  const [deletedReminders,  setDeletedReminders]  = useState([])

  // ─── Undo stack ────────────────────────────────────────────────────────────
  const [undoStack, setUndoStack] = useState([])

  // ─── Outlook push ref ─────────────────────────────────────────────────────
  // MicrosoftContext registers a push callback here on mount so that contact
  // saves automatically propagate to Outlook without creating a circular dep.
  const outlookPushRef = useRef(null)
  const registerOutlookPush = useCallback((fn) => { outlookPushRef.current = fn }, [])
  const outlookDeleteRef = useRef(null)
  const registerOutlookDelete = useCallback((fn) => { outlookDeleteRef.current = fn }, [])

  // ─── Initial load + seed ───────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true)
      setError(null)
      try {
        const seeded = await db.config.isSeeded()
        if (!seeded) {
          await seedDatabase()
          await db.config.markSeeded()
        }
        const [co, ct, pr, re, ac, tm, delCo, delCt, delPr, delRe, cp, inv, di, auto, da, mt, custOpts] = await Promise.all([
          db.companies.getAll(),
          db.contacts.getAll(),
          db.properties.getAll(),
          db.reminders.getAll(),
          db.activities.getAll(),
          db.teamMembers.getAll(),
          db.companies.getDeleted(),
          db.contacts.getDeleted(),
          db.properties.getDeleted(),
          db.reminders.getDeleted(),
          db.comps.getAll().catch(() => []),
          db.investors.getAll().catch(() => []),
          db.dealInvestors.getAll().catch(() => []),
          db.automations.getAll().catch(() => []),
          db.dealActivities.getAll().catch(() => []),
          db.meetingTranscripts.getAll().catch(() => []),
          db.customOptions.getAll().catch(() => []),
        ])
        setCompanies(co)
        setContacts(ct)
        setProperties(pr)
        setReminders(re)
        setActivities(ac)
        setTeamMembers(tm)
        setDeletedCompanies(delCo)
        setDeletedContacts(delCt)
        setDeletedProperties(delPr)
        setDeletedReminders(delRe)
        setComps(cp)
        setInvestors(inv)
        setDealInvestors(di)
        setAutomations(auto)
        setDealActivities(da)
        setMeetingTranscripts(mt)
        setCustomOptions(custOpts)
      } catch (err) {
        setError(err.message || 'Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // ─── CONTACTS ─────────────────────────────────────────────────────────────
  const addContact = useCallback(async (contact) => {
    const withOwner = { ...contact, ownerIds: [...new Set([...(contact.ownerIds || []), ...(user ? [user.id] : [])])] }
    const rec = await db.contacts.insert(withOwner)
    setContacts(prev => [...prev, rec])
    if (outlookPushRef.current) {
      outlookPushRef.current({ ...rec, _isNew: true, _skipOutlookPush: contact._skipOutlookPush }).catch(() => {})
    }
    return rec
  }, [user])

  const updateContact = useCallback(async (id, patch, options = {}) => {
    const rec = await db.contacts.update(id, patch)
    setContacts(prev => prev.map(c => c.id === id ? rec : c))
    if (outlookPushRef.current && !options.skipOutlookPush) {
      if (rec.outlookContactId) {
        outlookPushRef.current({ ...rec, _isUpdate: true }).catch(() => {})
      } else {
        // No Outlook ID — treat as new so it gets created in Outlook and ID written back
        outlookPushRef.current({ ...rec, _isNew: true }).catch(() => {})
      }
    }
    return rec
  }, [])

  const deleteContact = useCallback(async (id, options = {}) => {
    const item = contacts.find(c => c.id === id)
    const rec = await db.contacts.softDelete(id)
    setContacts(prev => prev.filter(c => c.id !== id))
    setDeletedContacts(prev => [rec, ...prev])
    setUndoStack(prev => [{ type: 'contact', id, label: item ? `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Contact' : 'Contact' }, ...prev.slice(0, 9)])
    if (outlookDeleteRef.current && item?.outlookContactId && !options.skipOutlookDelete) {
      outlookDeleteRef.current(item.outlookContactId).catch(() => {})
    }
  }, [contacts])

  const restoreContact = useCallback(async (id) => {
    const rec = await db.contacts.restore(id)
    setDeletedContacts(prev => prev.filter(c => c.id !== id))
    setContacts(prev => [...prev, rec])
  }, [])

  const purgeContact = useCallback(async (id) => {
    await db.contacts.delete(id)
    setDeletedContacts(prev => prev.filter(c => c.id !== id))
  }, [])

  // ─── COMPANIES ────────────────────────────────────────────────────────────
  const addCompany = useCallback(async (company) => {
    const rec = await db.companies.insert(company)
    setCompanies(prev => [...prev, rec])
    return rec
  }, [])

  const updateCompany = useCallback(async (id, patch) => {
    const rec = await db.companies.update(id, patch)
    setCompanies(prev => prev.map(c => c.id === id ? rec : c))
  }, [])

  const deleteCompany = useCallback(async (id) => {
    const item = companies.find(c => c.id === id)
    const rec = await db.companies.softDelete(id)
    setCompanies(prev => prev.filter(c => c.id !== id))
    setDeletedCompanies(prev => [rec, ...prev])
    setUndoStack(prev => [{ type: 'company', id, label: item?.name || 'Company' }, ...prev.slice(0, 9)])
  }, [companies])

  const restoreCompany = useCallback(async (id) => {
    const rec = await db.companies.restore(id)
    setDeletedCompanies(prev => prev.filter(c => c.id !== id))
    setCompanies(prev => [...prev, rec])
  }, [])

  const purgeCompany = useCallback(async (id) => {
    await db.companies.delete(id)
    setDeletedCompanies(prev => prev.filter(c => c.id !== id))
  }, [])

  // ─── PROPERTIES ───────────────────────────────────────────────────────────
  const addProperty = useCallback(async (property) => {
    const rec = await db.properties.insert(property)
    setProperties(prev => [...prev, rec])
    return rec
  }, [])

  const updateProperty = useCallback(async (id, patch) => {
    const rec = await db.properties.update(id, patch)
    setProperties(prev => prev.map(p => p.id === id ? rec : p))
  }, [])

  const deleteProperty = useCallback(async (id) => {
    const item = properties.find(p => p.id === id)
    const rec = await db.properties.softDelete(id)
    setProperties(prev => prev.filter(p => p.id !== id))
    setDeletedProperties(prev => [rec, ...prev])
    setUndoStack(prev => [{ type: 'property', id, label: item?.name || item?.address || 'Deal' }, ...prev.slice(0, 9)])
  }, [properties])

  const restoreProperty = useCallback(async (id) => {
    const rec = await db.properties.restore(id)
    setDeletedProperties(prev => prev.filter(p => p.id !== id))
    setProperties(prev => [...prev, rec])
  }, [])

  const purgeProperty = useCallback(async (id) => {
    await db.properties.delete(id)
    setDeletedProperties(prev => prev.filter(p => p.id !== id))
  }, [])

  // ─── REMINDERS ────────────────────────────────────────────────────────────
  const addReminder = useCallback(async (reminder) => {
    const rec = await db.reminders.insert({ ...reminder, status: reminder.status || 'pending' })
    setReminders(prev => [...prev, rec])
    return rec
  }, [])

  const updateReminder = useCallback(async (id, patch) => {
    const rec = await db.reminders.update(id, patch)
    setReminders(prev => prev.map(r => r.id === id ? rec : r))
  }, [])

  const completeReminder = useCallback(async (id) => {
    const now = new Date().toISOString()
    const rec = await db.reminders.update(id, { status: 'done', completedAt: now })
    setReminders(prev => prev.map(r => r.id === id ? rec : r))
    // Update last touch on the linked contact (only if more recent)
    if (rec.contactId) {
      const contact = contacts.find(c => c.id === rec.contactId)
      if (!contact?.lastContacted || now > contact.lastContacted) {
        await db.contacts.update(rec.contactId, { lastContacted: now })
        setContacts(prev => prev.map(c =>
          c.id === rec.contactId ? { ...c, lastContacted: now } : c
        ))
      }
    }
  }, [contacts])

  const uncompleteReminder = useCallback(async (id) => {
    const rec = await db.reminders.update(id, { status: 'pending', completedAt: null })
    const newReminders = reminders.map(r => r.id === id ? rec : r)
    setReminders(newReminders)
    if (rec.contactId) {
      const maxDate = calcLastContacted(rec.contactId, activities, newReminders)
      await db.contacts.update(rec.contactId, { lastContacted: maxDate })
      setContacts(prev => prev.map(c =>
        c.id === rec.contactId ? { ...c, lastContacted: maxDate } : c
      ))
    }
  }, [reminders, activities])

  const deleteReminder = useCallback(async (id) => {
    const item = reminders.find(r => r.id === id)
    const rec = await db.reminders.softDelete(id)
    setReminders(prev => prev.filter(r => r.id !== id))
    setDeletedReminders(prev => [rec, ...prev])
    setUndoStack(prev => [{ type: 'reminder', id, label: item?.title || item?.type || 'Reminder' }, ...prev.slice(0, 9)])
  }, [reminders])

  const restoreReminder = useCallback(async (id) => {
    const rec = await db.reminders.restore(id)
    setDeletedReminders(prev => prev.filter(r => r.id !== id))
    setReminders(prev => [...prev, rec])
  }, [])

  const purgeReminder = useCallback(async (id) => {
    await db.reminders.delete(id)
    setDeletedReminders(prev => prev.filter(r => r.id !== id))
  }, [])

  // ─── ACTIVITIES ───────────────────────────────────────────────────────────
  const addActivity = useCallback(async (activity) => {
    const rec = await db.activities.insert(activity)
    const newActivities = [...activities, rec]
    setActivities(newActivities)
    if (activity.contactId) {
      const maxDate = calcLastContacted(activity.contactId, newActivities, reminders)
      await db.contacts.update(activity.contactId, { lastContacted: maxDate })
      setContacts(prev => prev.map(c =>
        c.id === activity.contactId ? { ...c, lastContacted: maxDate } : c
      ))
    }
    return rec
  }, [activities, reminders])

  const updateActivity = useCallback(async (id, patch) => {
    const old = activities.find(a => a.id === id)
    const rec = await db.activities.update(id, patch)
    const newActivities = activities.map(a => a.id === id ? rec : a)
    setActivities(newActivities)
    const contactId = old?.contactId || rec.contactId
    if (contactId) {
      const maxDate = calcLastContacted(contactId, newActivities, reminders)
      await db.contacts.update(contactId, { lastContacted: maxDate })
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, lastContacted: maxDate } : c))
    }
  }, [activities, reminders])

  const deleteActivity = useCallback(async (id) => {
    const old = activities.find(a => a.id === id)
    await db.activities.delete(id)
    const newActivities = activities.filter(a => a.id !== id)
    setActivities(newActivities)
    if (old?.contactId) {
      const maxDate = calcLastContacted(old.contactId, newActivities, reminders)
      await db.contacts.update(old.contactId, { lastContacted: maxDate })
      setContacts(prev => prev.map(c => c.id === old.contactId ? { ...c, lastContacted: maxDate } : c))
    }
    if (old) {
      const { id: _id, createdAt: _ca, ...activityData } = old
      setUndoStack(prev => [{ type: 'activity', data: activityData, label: old.type ? `${old.type} log` : 'Activity' }, ...prev.slice(0, 9)])
    }
  }, [activities, reminders])

  // ─── Undo last delete ──────────────────────────────────────────────────────
  const undoLastDelete = useCallback(async () => {
    const last = undoStack[0]
    if (!last) return
    setUndoStack(prev => prev.slice(1))
    try {
      switch (last.type) {
        case 'contact': {
          const rec = await db.contacts.restore(last.id)
          setDeletedContacts(prev => prev.filter(c => c.id !== last.id))
          setContacts(prev => [...prev, rec])
          break
        }
        case 'company': {
          const rec = await db.companies.restore(last.id)
          setDeletedCompanies(prev => prev.filter(c => c.id !== last.id))
          setCompanies(prev => [...prev, rec])
          break
        }
        case 'property': {
          const rec = await db.properties.restore(last.id)
          setDeletedProperties(prev => prev.filter(p => p.id !== last.id))
          setProperties(prev => [...prev, rec])
          break
        }
        case 'reminder': {
          const rec = await db.reminders.restore(last.id)
          setDeletedReminders(prev => prev.filter(r => r.id !== last.id))
          setReminders(prev => [...prev, rec])
          break
        }
        case 'activity': {
          const rec = await db.activities.insert(last.data)
          const newActivities = [...activities, rec]
          setActivities(newActivities)
          if (last.data.contactId) {
            const maxDate = calcLastContacted(last.data.contactId, newActivities, reminders)
            await db.contacts.update(last.data.contactId, { lastContacted: maxDate })
            setContacts(prev => prev.map(c => c.id === last.data.contactId ? { ...c, lastContacted: maxDate } : c))
          }
          break
        }
        default: break
      }
    } catch (err) {
      console.error('Undo failed:', err)
    }
  }, [undoStack, activities, reminders])

  const dismissUndo = useCallback(() => {
    setUndoStack(prev => prev.slice(1))
  }, [])

  // ─── COMPS ──────────────────────────────────────────────────────────────
  const addComp = useCallback(async (comp) => {
    const rec = await db.comps.insert(comp)
    setComps(prev => [...prev, rec])
    return rec
  }, [])

  const updateComp = useCallback(async (id, patch) => {
    const rec = await db.comps.update(id, patch)
    setComps(prev => prev.map(c => c.id === id ? rec : c))
  }, [])

  const deleteComp = useCallback(async (id) => {
    await db.comps.softDelete(id)
    setComps(prev => prev.filter(c => c.id !== id))
  }, [])

  // ─── INVESTOR COMPANIES (derived from companies with type='investor') ─────
  const investorCompanies = useMemo(() =>
    companies.filter(c => c.type === 'investor'),
    [companies]
  )

  // ─── PERSONAL vs SHARED derived views ────────────────────────────────────
  // sharedContacts: visibility='shared', scoped to sharedWith (null=all team)
  const sharedContacts = useMemo(() => {
    if (!user) return contacts.filter(c => (c.visibility || 'shared') === 'shared')
    return contacts.filter(c =>
      (c.visibility || 'shared') === 'shared' &&
      (!c.sharedWith || c.sharedWith.length === 0 || c.sharedWith.includes(user.id))
    )
  }, [contacts, user])

  // personalContacts: contacts the current user owns, plus ownerless contacts (visible to all)
  const personalContacts = useMemo(() => {
    if (!user) return []
    return contacts.filter(c => (c.ownerIds || []).length === 0 || (c.ownerIds || []).includes(user.id))
  }, [contacts, user])

  const sharedCompanies = useMemo(() => {
    if (!user) return companies.filter(c => (c.visibility || 'shared') === 'shared')
    return companies.filter(c =>
      (c.visibility || 'shared') === 'shared' &&
      (!c.sharedWith || c.sharedWith.length === 0 || c.sharedWith.includes(user.id))
    )
  }, [companies, user])

  const personalCompanies = useMemo(() => {
    if (!user) return []
    return companies.filter(c => (c.ownerIds || []).includes(user.id))
  }, [companies, user])

  // Share contacts: set visibility='shared', optionally limit to specific users
  const shareContacts = useCallback(async (ids, sharedWith) => {
    for (const id of ids) {
      const rec = await db.contacts.update(id, { visibility: 'shared', sharedWith: sharedWith || null })
      setContacts(prev => prev.map(c => c.id === id ? rec : c))
    }
  }, [])

  // Make contacts private again
  const makeContactsPrivate = useCallback(async (ids) => {
    for (const id of ids) {
      const rec = await db.contacts.update(id, { visibility: 'private', sharedWith: null })
      setContacts(prev => prev.map(c => c.id === id ? rec : c))
    }
  }, [])

  const shareCompanies = useCallback(async (ids, sharedWith) => {
    for (const id of ids) {
      const rec = await db.companies.update(id, { visibility: 'shared', sharedWith: sharedWith || null })
      setCompanies(prev => prev.map(c => c.id === id ? rec : c))
    }
  }, [])

  const makeCompaniesPrivate = useCallback(async (ids) => {
    for (const id of ids) {
      const rec = await db.companies.update(id, { visibility: 'private', sharedWith: null })
      setCompanies(prev => prev.map(c => c.id === id ? rec : c))
    }
  }, [])

  // ─── DEAL INVESTORS ────────────────────────────────────────────────────
  const addDealInvestor = useCallback(async (di) => {
    const rec = await db.dealInvestors.insert(di)
    setDealInvestors(prev => [...prev, rec])
    return rec
  }, [])

  const updateDealInvestor = useCallback(async (id, patch) => {
    const rec = await db.dealInvestors.update(id, patch)
    setDealInvestors(prev => prev.map(d => d.id === id ? rec : d))
  }, [])

  const deleteDealInvestor = useCallback(async (id) => {
    await db.dealInvestors.delete(id)
    setDealInvestors(prev => prev.filter(d => d.id !== id))
  }, [])

  // ─── AUTOMATIONS ───────────────────────────────────────────────────────
  const addAutomation = useCallback(async (auto) => {
    const rec = await db.automations.insert(auto)
    setAutomations(prev => [...prev, rec])
    return rec
  }, [])

  const updateAutomation = useCallback(async (id, patch) => {
    const rec = await db.automations.update(id, patch)
    setAutomations(prev => prev.map(a => a.id === id ? rec : a))
  }, [])

  const deleteAutomation = useCallback(async (id) => {
    await db.automations.delete(id)
    setAutomations(prev => prev.filter(a => a.id !== id))
  }, [])

  // ─── Stage change handler (wraps updateProperty with history tracking) ──
  const updatePropertyWithStage = useCallback(async (id, patch) => {
    const existing = properties.find(p => p.id === id)
    if (existing && patch.status && patch.status !== existing.status) {
      const now = new Date().toISOString()
      const history = existing.stageHistory || []
      patch.stageHistory = [...history, { from: existing.status, to: patch.status, at: now }]
      patch.stageChangedAt = now

      // Run automations for stage change
      const matchingAutos = automations.filter(a =>
        a.enabled && a.triggerType === 'stage-change' && a.triggerValue === patch.status
      )
      for (const auto of matchingAutos) {
        if (auto.actionType === 'create-reminder') {
          const config = auto.actionConfig || {}
          await addReminder({
            title: config.title || `Follow up: ${patch.status}`,
            type: config.reminderType || 'call',
            priority: config.priority || 'medium',
            dueDate: new Date(Date.now() + (config.daysFromNow || 1) * 86400000).toISOString(),
            propertyId: id,
            contactId: (existing.contactIds || [])[0] || null,
          })
        }
      }
    }
    return updateProperty(id, patch)
  }, [properties, automations, updateProperty, addReminder])

  // ─── DEAL ACTIVITIES ───────────────────────────────────────────────────
  const addDealActivity = useCallback(async (da) => {
    const rec = await db.dealActivities.insert(da)
    setDealActivities(prev => [rec, ...prev])
    return rec
  }, [])

  const updateDealActivity = useCallback(async (id, patch) => {
    const rec = await db.dealActivities.update(id, patch)
    setDealActivities(prev => prev.map(d => d.id === id ? rec : d))
    return rec
  }, [])

  // ─── MEETING TRANSCRIPTS ─────────────────────────────────────────────────
  const addMeetingTranscript = useCallback(async (mt) => {
    const rec = await db.meetingTranscripts.insert(mt)
    setMeetingTranscripts(prev => [rec, ...prev])
    return rec
  }, [])

  const updateMeetingTranscript = useCallback(async (id, patch) => {
    const rec = await db.meetingTranscripts.update(id, patch)
    setMeetingTranscripts(prev => prev.map(m => m.id === id ? rec : m))
    return rec
  }, [])

  const meetingTranscriptsFor = useCallback((contactId) =>
    meetingTranscripts
      .filter(m => m.attendeeContactIds?.includes(contactId))
      .sort((a, b) => (b.startAt || '').localeCompare(a.startAt || '')),
  [meetingTranscripts])

  // ─── Lookups (synchronous — read from in-memory state) ────────────────────
  const getContact  = useCallback((id) => contacts.find(c => c.id === id),   [contacts])
  const getCompany  = useCallback((id) => companies.find(c => c.id === id),  [companies])
  const getProperty = useCallback((id) => properties.find(p => p.id === id), [properties])

  const activitiesFor = useCallback((field, id) =>
    activities.filter(a => a[field] === id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
  [activities])

  const remindersFor = useCallback((field, id) =>
    reminders.filter(r => r[field] === id && r.status !== 'done'),
  [reminders])

  const dealActivitiesFor = useCallback((field, id) =>
    dealActivities
      .filter(d => d.status !== 'dismissed' && d[field] === id)
      .sort((a, b) => (b.lastMessageAt || b.createdAt || '').localeCompare(a.lastMessageAt || a.createdAt || '')),
  [dealActivities])

  const addCustomOption = useCallback(async (field, value) => {
    const rec = await db.customOptions.insert(field, value)
    setCustomOptions(prev => [...prev, rec])
    return rec
  }, [])

  return (
    <CRMContext.Provider value={{
      contacts, companies, properties, reminders, activities, teamMembers,
      comps, investors, investorCompanies, dealInvestors, automations,
      dealActivities, meetingTranscripts,
      // Personal vs Shared derived views
      sharedContacts, personalContacts, sharedCompanies, personalCompanies,
      shareContacts, makeContactsPrivate, shareCompanies, makeCompaniesPrivate,
      loading, error,
      deletedContacts, deletedCompanies, deletedProperties, deletedReminders,
      addContact, updateContact, deleteContact, restoreContact, purgeContact,
      addCompany, updateCompany, deleteCompany, restoreCompany, purgeCompany,
      addProperty, updateProperty, updatePropertyWithStage, deleteProperty, restoreProperty, purgeProperty,
      addReminder, updateReminder, completeReminder, uncompleteReminder, deleteReminder, restoreReminder, purgeReminder,
      addActivity, updateActivity, deleteActivity,
      addComp, updateComp, deleteComp,
      addDealInvestor, updateDealInvestor, deleteDealInvestor,
      addAutomation, updateAutomation, deleteAutomation,
      addDealActivity, updateDealActivity,
      addMeetingTranscript, updateMeetingTranscript, meetingTranscriptsFor,
      customOptions, addCustomOption,
      undoStack, undoLastDelete, dismissUndo,
      getContact, getCompany, getProperty,
      activitiesFor, remindersFor, dealActivitiesFor,
      registerOutlookPush,
      registerOutlookDelete,
    }}>
      {children}
    </CRMContext.Provider>
  )
}

export function useCRM() {
  const ctx = useContext(CRMContext)
  if (!ctx) throw new Error('useCRM must be used within CRMProvider')
  return ctx
}
