const KEYS = {
  contacts:   'cre_contacts',
  companies:  'cre_companies',
  properties: 'cre_properties',
  reminders:  'cre_reminders',
  activities: 'cre_activities',
  seeded:     'cre_seeded',
}

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export const storage = {
  // contacts
  getContacts:    () => load(KEYS.contacts) || [],
  setContacts:    (v) => save(KEYS.contacts, v),
  // companies
  getCompanies:   () => load(KEYS.companies) || [],
  setCompanies:   (v) => save(KEYS.companies, v),
  // properties
  getProperties:  () => load(KEYS.properties) || [],
  setProperties:  (v) => save(KEYS.properties, v),
  // reminders
  getReminders:   () => load(KEYS.reminders) || [],
  setReminders:   (v) => save(KEYS.reminders, v),
  // activities
  getActivities:  () => load(KEYS.activities) || [],
  setActivities:  (v) => save(KEYS.activities, v),
  // seed flag
  isSeeded:       () => !!load(KEYS.seeded),
  markSeeded:     () => save(KEYS.seeded, true),
}
