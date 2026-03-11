import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { storage } from '../utils/storage'
import { uid } from '../utils/helpers'
import {
  SEED_COMPANIES, SEED_CONTACTS, SEED_PROPERTIES, SEED_REMINDERS, SEED_ACTIVITIES
} from '../utils/seed'

const CRMContext = createContext(null)

export function CRMProvider({ children }) {
  const [contacts,   setContactsState]   = useState([])
  const [companies,  setCompaniesState]  = useState([])
  const [properties, setPropertiesState] = useState([])
  const [reminders,  setRemindersState]  = useState([])
  const [activities, setActivitiesState] = useState([])

  // load from storage on mount, seed if first run
  useEffect(() => {
    if (!storage.isSeeded()) {
      storage.setCompanies(SEED_COMPANIES)
      storage.setContacts(SEED_CONTACTS)
      storage.setProperties(SEED_PROPERTIES)
      storage.setReminders(SEED_REMINDERS)
      storage.setActivities(SEED_ACTIVITIES)
      storage.markSeeded()
    }
    setContactsState(storage.getContacts())
    setCompaniesState(storage.getCompanies())
    setPropertiesState(storage.getProperties())
    setRemindersState(storage.getReminders())
    setActivitiesState(storage.getActivities())
  }, [])

  // ---- helpers ----
  function persist(setter, storeFn, data) {
    setter(data)
    storeFn(data)
  }

  // ---- CONTACTS ----
  const addContact = useCallback((contact) => {
    const rec = { ...contact, id: uid(), createdAt: new Date().toISOString(), lastContacted: null }
    const next = [...storage.getContacts(), rec]
    persist(setContactsState, storage.setContacts, next)
    return rec
  }, [])

  const updateContact = useCallback((id, patch) => {
    const next = storage.getContacts().map(c => c.id === id ? { ...c, ...patch } : c)
    persist(setContactsState, storage.setContacts, next)
  }, [])

  const deleteContact = useCallback((id) => {
    const next = storage.getContacts().filter(c => c.id !== id)
    persist(setContactsState, storage.setContacts, next)
  }, [])

  // ---- COMPANIES ----
  const addCompany = useCallback((company) => {
    const rec = { ...company, id: uid(), createdAt: new Date().toISOString() }
    const next = [...storage.getCompanies(), rec]
    persist(setCompaniesState, storage.setCompanies, next)
    return rec
  }, [])

  const updateCompany = useCallback((id, patch) => {
    const next = storage.getCompanies().map(c => c.id === id ? { ...c, ...patch } : c)
    persist(setCompaniesState, storage.setCompanies, next)
  }, [])

  const deleteCompany = useCallback((id) => {
    const next = storage.getCompanies().filter(c => c.id !== id)
    persist(setCompaniesState, storage.setCompanies, next)
  }, [])

  // ---- PROPERTIES ----
  const addProperty = useCallback((property) => {
    const rec = { ...property, id: uid(), createdAt: new Date().toISOString() }
    const next = [...storage.getProperties(), rec]
    persist(setPropertiesState, storage.setProperties, next)
    return rec
  }, [])

  const updateProperty = useCallback((id, patch) => {
    const next = storage.getProperties().map(p => p.id === id ? { ...p, ...patch } : p)
    persist(setPropertiesState, storage.setProperties, next)
  }, [])

  const deleteProperty = useCallback((id) => {
    const next = storage.getProperties().filter(p => p.id !== id)
    persist(setPropertiesState, storage.setProperties, next)
  }, [])

  // ---- REMINDERS ----
  const addReminder = useCallback((reminder) => {
    const rec = { ...reminder, id: uid(), createdAt: new Date().toISOString(), status: reminder.status || 'pending' }
    const next = [...storage.getReminders(), rec]
    persist(setRemindersState, storage.setReminders, next)
    return rec
  }, [])

  const updateReminder = useCallback((id, patch) => {
    const next = storage.getReminders().map(r => r.id === id ? { ...r, ...patch } : r)
    persist(setRemindersState, storage.setReminders, next)
  }, [])

  const completeReminder = useCallback((id) => {
    const next = storage.getReminders().map(r => r.id === id ? { ...r, status: 'done', completedAt: new Date().toISOString() } : r)
    persist(setRemindersState, storage.setReminders, next)
  }, [])

  const deleteReminder = useCallback((id) => {
    const next = storage.getReminders().filter(r => r.id !== id)
    persist(setRemindersState, storage.setReminders, next)
  }, [])

  // ---- ACTIVITIES ----
  const addActivity = useCallback((activity) => {
    const rec = { ...activity, id: uid(), createdAt: new Date().toISOString() }
    const next = [...storage.getActivities(), rec]
    persist(setActivitiesState, storage.setActivities, next)
    // update lastContacted on contact
    if (activity.contactId) {
      const updatedContacts = storage.getContacts().map(c =>
        c.id === activity.contactId ? { ...c, lastContacted: rec.createdAt } : c
      )
      persist(setContactsState, storage.setContacts, updatedContacts)
    }
    return rec
  }, [])

  const deleteActivity = useCallback((id) => {
    const next = storage.getActivities().filter(a => a.id !== id)
    persist(setActivitiesState, storage.setActivities, next)
  }, [])

  // ---- lookups ----
  const getContact    = useCallback((id) => contacts.find(c => c.id === id),    [contacts])
  const getCompany    = useCallback((id) => companies.find(c => c.id === id),   [companies])
  const getProperty   = useCallback((id) => properties.find(p => p.id === id),  [properties])

  const activitiesFor = useCallback((field, id) =>
    activities.filter(a => a[field] === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [activities])

  const remindersFor = useCallback((field, id) =>
    reminders.filter(r => r[field] === id && r.status !== 'done'),
  [reminders])

  return (
    <CRMContext.Provider value={{
      contacts, companies, properties, reminders, activities,
      addContact, updateContact, deleteContact,
      addCompany, updateCompany, deleteCompany,
      addProperty, updateProperty, deleteProperty,
      addReminder, updateReminder, completeReminder, deleteReminder,
      addActivity, deleteActivity,
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
