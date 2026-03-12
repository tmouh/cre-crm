import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { db, seedDatabase } from '../lib/supabase'

const CRMContext = createContext(null)

export function CRMProvider({ children }) {
  const [contacts,     setContacts]     = useState([])
  const [companies,    setCompanies]    = useState([])
  const [properties,   setProperties]   = useState([])
  const [reminders,    setReminders]    = useState([])
  const [activities,   setActivities]   = useState([])
  const [teamMembers,  setTeamMembers]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const [deletedContacts,   setDeletedContacts]   = useState([])
  const [deletedCompanies,  setDeletedCompanies]  = useState([])
  const [deletedProperties, setDeletedProperties] = useState([])
  const [deletedReminders,  setDeletedReminders]  = useState([])

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
        const [co, ct, pr, re, ac, tm, delCo, delCt, delPr, delRe] = await Promise.all([
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
    const rec = await db.contacts.insert(contact)
    setContacts(prev => [...prev, rec])
    return rec
  }, [])

  const updateContact = useCallback(async (id, patch) => {
    const rec = await db.contacts.update(id, patch)
    setContacts(prev => prev.map(c => c.id === id ? rec : c))
  }, [])

  const deleteContact = useCallback(async (id) => {
    const rec = await db.contacts.softDelete(id)
    setContacts(prev => prev.filter(c => c.id !== id))
    setDeletedContacts(prev => [rec, ...prev])
  }, [])

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
    const rec = await db.companies.softDelete(id)
    setCompanies(prev => prev.filter(c => c.id !== id))
    setDeletedCompanies(prev => [rec, ...prev])
  }, [])

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
    const rec = await db.properties.softDelete(id)
    setProperties(prev => prev.filter(p => p.id !== id))
    setDeletedProperties(prev => [rec, ...prev])
  }, [])

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
    const rec = await db.reminders.update(id, { status: 'done', completedAt: new Date().toISOString() })
    setReminders(prev => prev.map(r => r.id === id ? rec : r))
  }, [])

  const deleteReminder = useCallback(async (id) => {
    const rec = await db.reminders.softDelete(id)
    setReminders(prev => prev.filter(r => r.id !== id))
    setDeletedReminders(prev => [rec, ...prev])
  }, [])

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
    setActivities(prev => [...prev, rec])
    if (activity.contactId) {
      await db.contacts.update(activity.contactId, { lastContacted: rec.createdAt })
      setContacts(prev => prev.map(c =>
        c.id === activity.contactId ? { ...c, lastContacted: rec.createdAt } : c
      ))
    }
    return rec
  }, [])

  const updateActivity = useCallback(async (id, patch) => {
    const rec = await db.activities.update(id, patch)
    setActivities(prev => prev.map(a => a.id === id ? rec : a))
  }, [])

  const deleteActivity = useCallback(async (id) => {
    await db.activities.delete(id)
    setActivities(prev => prev.filter(a => a.id !== id))
  }, [])

  // ─── Lookups (synchronous — read from in-memory state) ────────────────────
  const getContact  = useCallback((id) => contacts.find(c => c.id === id),   [contacts])
  const getCompany  = useCallback((id) => companies.find(c => c.id === id),  [companies])
  const getProperty = useCallback((id) => properties.find(p => p.id === id), [properties])

  const activitiesFor = useCallback((field, id) =>
    activities.filter(a => a[field] === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [activities])

  const remindersFor = useCallback((field, id) =>
    reminders.filter(r => r[field] === id && r.status !== 'done'),
  [reminders])

  return (
    <CRMContext.Provider value={{
      contacts, companies, properties, reminders, activities, teamMembers,
      loading, error,
      deletedContacts, deletedCompanies, deletedProperties, deletedReminders,
      addContact, updateContact, deleteContact, restoreContact, purgeContact,
      addCompany, updateCompany, deleteCompany, restoreCompany, purgeCompany,
      addProperty, updateProperty, deleteProperty, restoreProperty, purgeProperty,
      addReminder, updateReminder, completeReminder, deleteReminder, restoreReminder, purgeReminder,
      addActivity, updateActivity, deleteActivity,
      getContact, getCompany, getProperty,
      activitiesFor, remindersFor,
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
