import { createClient } from '@supabase/supabase-js'
import { subDays, addDays } from 'date-fns'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ─── camelCase ↔ snake_case transforms ────────────────────────────────────────
function toSnakeKey(k) {
  return k.replace(/([A-Z])/g, '_$1').toLowerCase()
}
function toCamelKey(k) {
  return k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}
function toSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(toSnake)
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [toSnakeKey(k), v]))
}
function toCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(toCamel)
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [toCamelKey(k), v]))
}

// Strip undefined and empty-string fields before sending to Supabase
// (empty strings break UUID and numeric columns)
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''))
}

// For updates: convert empty strings to null (lets Supabase clear columns) but strip undefined
function cleanForUpdate(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v === '' ? null : v])
  )
}

function row(data)  { return toCamel(data) }
function rows(data) { return (data || []).map(toCamel) }

// ─── Generic table helper ──────────────────────────────────────────────────────
function table(name, { trackDeleted = false } = {}) {
  return {
    getAll: async (order = 'created_at') => {
      let query = supabase.from(name).select('*')
      if (trackDeleted) query = query.is('deleted_at', null)
      const { data, error } = await query.order(order)
      if (error) throw error
      return rows(data)
    },
    insert: async (obj) => {
      const { data, error } = await supabase
        .from(name).insert(clean(toSnake(obj))).select().single()
      if (error) throw error
      return row(data)
    },
    update: async (id, patch) => {
      const { data, error } = await supabase
        .from(name).update(cleanForUpdate(toSnake(patch))).eq('id', id).select().single()
      if (error) throw error
      return row(data)
    },
    delete: async (id) => {
      const { error } = await supabase.from(name).delete().eq('id', id)
      if (error) throw error
    },
    softDelete: async (id) => {
      const { data, error } = await supabase
        .from(name).update({ deleted_at: new Date().toISOString() }).eq('id', id).select().single()
      if (error) throw error
      return row(data)
    },
    restore: async (id) => {
      const { data, error } = await supabase
        .from(name).update({ deleted_at: null }).eq('id', id).select().single()
      if (error) throw error
      return row(data)
    },
    getDeleted: async (days = 15) => {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from(name).select('*').not('deleted_at', 'is', null).gte('deleted_at', cutoff)
        .order('deleted_at', { ascending: false })
      if (error) throw error
      return rows(data)
    },
  }
}

// ─── db API (mirrors old storage.js interface, but async) ─────────────────────
export const db = {
  companies:     table('companies',      { trackDeleted: true }),
  contacts:      table('contacts',       { trackDeleted: true }),
  properties:    table('properties',     { trackDeleted: true }),
  reminders:     table('reminders',      { trackDeleted: true }),
  activities:    table('activities'),
  teamMembers:   table('team_members'),
  comps:         table('comps',          { trackDeleted: true }),
  investors:     table('investors',      { trackDeleted: true }),
  dealInvestors: table('deal_investors'),
  automations:   table('automations'),

  // ─── Microsoft integration tables ─────────────────────────────────────────
  emailInteractions: {
    forContact: async (contactId) => {
      const { data, error } = await supabase
        .from('email_interactions')
        .select('*')
        .eq('contact_id', contactId)
        .order('received_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return rows(data)
    },
    getAll: async () => {
      const { data, error } = await supabase
        .from('email_interactions')
        .select('*')
        .order('received_at', { ascending: false })
      if (error) throw error
      return rows(data)
    },
    getRecent: async (daysBack = 90) => {
      const since = new Date()
      since.setDate(since.getDate() - daysBack)
      const { data, error } = await supabase
        .from('email_interactions')
        .select('contact_id, received_at')
        .gte('received_at', since.toISOString())
        .order('received_at', { ascending: false })
        .limit(10000)
      if (error) throw error
      return rows(data)
    },
    upsertBatch: async (items) => {
      if (!items.length) return
      const { error } = await supabase
        .from('email_interactions')
        .upsert(items.map(i => clean(toSnake(i))), { onConflict: 'ms_message_id', ignoreDuplicates: true })
      if (error) throw error
    },
  },

  calendarInteractions: {
    forContact: async (contactId) => {
      const { data, error } = await supabase
        .from('calendar_interactions')
        .select('*')
        .eq('contact_id', contactId)
        .order('start_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return rows(data)
    },
    upsertBatch: async (items) => {
      if (!items.length) return
      const { error } = await supabase
        .from('calendar_interactions')
        .upsert(items.map(i => clean(toSnake(i))), { onConflict: 'ms_event_id', ignoreDuplicates: true })
      if (error) throw error
    },
  },

  microsoftConnections: {
    upsert: async (data) => {
      const { error } = await supabase
        .from('microsoft_connections')
        .upsert(clean(toSnake(data)), { onConflict: 'user_id' })
      if (error) throw error
    },
    get: async () => {
      const { data, error } = await supabase
        .from('microsoft_connections')
        .select('*')
        .maybeSingle()
      if (error) throw error
      return data ? toCamel(data) : null
    },
  },

  graphSubscriptions: {
    upsert: async (data) => {
      const { error } = await supabase
        .from('graph_subscriptions')
        .upsert(clean(toSnake(data)), { onConflict: 'ms_subscription_id' })
      if (error) throw error
    },
    getActive: async () => {
      const { data, error } = await supabase
        .from('graph_subscriptions')
        .select('*')
        .gt('expires_at', new Date().toISOString())
      if (error) throw error
      return rows(data)
    },
    delete: async (msSubscriptionId) => {
      const { error } = await supabase
        .from('graph_subscriptions')
        .delete()
        .eq('ms_subscription_id', msSubscriptionId)
      if (error) throw error
    },
  },

  webhookNotifications: {
    getUnprocessed: async (limit = 50) => {
      const { data, error } = await supabase
        .from('webhook_notifications')
        .select('*')
        .eq('processed', false)
        .order('received_at', { ascending: true })
        .limit(limit)
      if (error) throw error
      return rows(data)
    },
    markProcessed: async (ids) => {
      if (!ids.length) return
      const { error } = await supabase
        .from('webhook_notifications')
        .update({ processed: true })
        .in('id', ids)
      if (error) throw error
    },
  },

  // ─── Deal activities (smart email-to-activity layer) ────────────────────
  dealActivities: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('deal_activities')
        .select('*')
        .neq('status', 'dismissed')
        .order('last_message_at', { ascending: false })
      if (error) throw error
      return rows(data)
    },
    forContact: async (contactId) => {
      const { data, error } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('contact_id', contactId)
        .neq('status', 'dismissed')
        .order('last_message_at', { ascending: false })
      if (error) throw error
      return rows(data)
    },
    forCompany: async (companyId) => {
      const { data, error } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('company_id', companyId)
        .neq('status', 'dismissed')
        .order('last_message_at', { ascending: false })
      if (error) throw error
      return rows(data)
    },
    forProperty: async (propertyId) => {
      const { data, error } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('property_id', propertyId)
        .neq('status', 'dismissed')
        .order('last_message_at', { ascending: false })
      if (error) throw error
      return rows(data)
    },
    getByConversationId: async (conversationId) => {
      const { data, error } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle()
      if (error) throw error
      return data ? toCamel(data) : null
    },
    insert: async (obj) => {
      const { data, error } = await supabase
        .from('deal_activities')
        .insert(clean(toSnake(obj)))
        .select()
        .single()
      if (error) throw error
      return toCamel(data)
    },
    update: async (id, patch) => {
      const { data, error } = await supabase
        .from('deal_activities')
        .update(cleanForUpdate(toSnake(patch)))
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return toCamel(data)
    },
    getNeedsReview: async () => {
      const { data, error } = await supabase
        .from('deal_activities')
        .select('*')
        .eq('status', 'needs_review')
        .order('last_message_at', { ascending: false })
      if (error) throw error
      return rows(data)
    },
  },

  config: {
    isSeeded: async () => {
      const { data, error } = await supabase
        .from('app_config').select('value').eq('key', 'seeded').maybeSingle()
      if (error) throw error
      return data?.value === true
    },
    markSeeded: async () => {
      const { error } = await supabase
        .from('app_config').update({ value: true }).eq('key', 'seeded')
      if (error) throw error
    },
  },
}

// ─── Seed data ─────────────────────────────────────────────────────────────────
const now = new Date()
const iso  = (d) => d.toISOString()

export async function seedDatabase() {
  // 1. Companies
  const { data: companies, error: ce } = await supabase.from('companies').insert([
    { name: 'Meridian Capital Partners', type: 'investor', address: '200 Park Ave, New York, NY 10166', phone: '212-555-0100', email: 'info@meridiancap.com', website: 'meridiancap.com', notes: 'Active buyer in tri-state. Prefers Class A office.', tags: ['buyer','nyc','class-a'], created_at: iso(subDays(now, 90)) },
    { name: 'Greenfield Industrial Trust', type: 'owner', address: '1 Harbor Blvd, Weehawken, NJ 07086', phone: '201-555-0200', email: 'leasing@greenfieldtrust.com', website: 'greenfieldtrust.com', notes: 'Owns 4M SF of industrial in NJ/PA.', tags: ['owner','industrial','nj'], created_at: iso(subDays(now, 60)) },
    { name: 'Apex Retail Group', type: 'tenant', address: '500 Fifth Ave, New York, NY 10110', phone: '212-555-0300', email: 'real.estate@apexretail.com', website: 'apexretail.com', notes: 'Expanding to 15 new locations in 2025.', tags: ['tenant','retail','expansion'], created_at: iso(subDays(now, 45)) },
    { name: 'Harbor View Development', type: 'developer', address: '88 Seaport Blvd, Boston, MA 02210', phone: '617-555-0400', email: 'acquisitions@harborview.com', website: 'harborviewdev.com', notes: 'Multifamily developer. Looking for infill land in Greater Boston.', tags: ['developer','multifamily','boston'], created_at: iso(subDays(now, 30)) },
  ]).select()
  if (ce) throw ce

  const meridian   = companies.find(c => c.name === 'Meridian Capital Partners').id
  const greenfield = companies.find(c => c.name === 'Greenfield Industrial Trust').id
  const apex       = companies.find(c => c.name === 'Apex Retail Group').id
  const harbor     = companies.find(c => c.name === 'Harbor View Development').id

  // 2. Contacts
  const { data: contacts, error: cte } = await supabase.from('contacts').insert([
    { first_name: 'James', last_name: 'Whitmore', title: 'Managing Director', company_id: meridian, email: 'j.whitmore@meridiancap.com', phone: '212-555-0101', mobile: '917-555-0101', linked_in: 'linkedin.com/in/jameswhitmore', tags: ['key-contact','decision-maker'], notes: 'Prefers calls before 10am. Met at ULI conference.', last_contacted: iso(subDays(now, 3)), created_at: iso(subDays(now, 90)) },
    { first_name: 'Sarah', last_name: 'Chen', title: 'VP Real Estate', company_id: greenfield, email: 's.chen@greenfieldtrust.com', phone: '201-555-0201', mobile: '646-555-0201', linked_in: '', tags: ['key-contact'], notes: 'Very responsive by email. Has final say on NJ deals.', last_contacted: iso(subDays(now, 12)), created_at: iso(subDays(now, 60)) },
    { first_name: 'Marcus', last_name: 'DeRosa', title: 'Director of Leasing', company_id: apex, email: 'm.derosa@apexretail.com', phone: '212-555-0301', mobile: '646-555-0301', linked_in: 'linkedin.com/in/marcusderosa', tags: ['decision-maker','retail'], notes: 'Meets Thursdays only.', last_contacted: iso(subDays(now, 7)), created_at: iso(subDays(now, 45)) },
    { first_name: 'Priya', last_name: 'Nair', title: 'Acquisitions Associate', company_id: harbor, email: 'p.nair@harborview.com', phone: '617-555-0401', mobile: '617-555-0411', linked_in: '', tags: ['warm-lead'], notes: 'Junior contact — escalate to Greg Holt for final decisions.', last_contacted: iso(subDays(now, 20)), created_at: iso(subDays(now, 30)) },
    { first_name: 'Greg', last_name: 'Holt', title: 'Principal', company_id: harbor, email: 'g.holt@harborview.com', phone: '617-555-0402', mobile: '617-555-0422', linked_in: 'linkedin.com/in/gregholt', tags: ['decision-maker'], notes: 'Old school — prefers phone over email.', last_contacted: iso(subDays(now, 25)), created_at: iso(subDays(now, 28)) },
  ]).select()
  if (cte) throw cte

  const james  = contacts.find(c => c.last_name === 'Whitmore').id
  const sarah  = contacts.find(c => c.last_name === 'Chen').id
  const marcus = contacts.find(c => c.last_name === 'DeRosa').id
  const priya  = contacts.find(c => c.last_name === 'Nair').id
  const greg   = contacts.find(c => c.last_name === 'Holt').id

  // 3. Properties (Deals)
  const { data: props, error: pe } = await supabase.from('properties').insert([
    { name: '1440 Broadway Acquisition', address: '1440 Broadway, New York, NY 10018', deal_type: 'acquisition', size: 185000, size_unit: 'SF', status: 'under-loi', deal_value: 125000000, owner_company_id: meridian, contact_ids: [james], notes: 'Full floors available. LEED Gold certified. LOI submitted for floors 14-16.', tags: ['nyc','class-a','leed'], created_at: iso(subDays(now, 80)) },
    { name: 'Edison Logistics Refi', address: '100 Industrial Blvd, Edison, NJ 08817', deal_type: 'senior-debt', size: 320000, size_unit: 'SF', status: 'engaged', deal_value: 28000000, owner_company_id: greenfield, contact_ids: [sarah], notes: "36' clear height. 80 dock doors. Refinancing existing CMBS loan.", tags: ['nj','industrial','logistics'], created_at: iso(subDays(now, 55)) },
    { name: 'Apex Hoboken Sale', address: '234 Washington St, Hoboken, NJ 07030', deal_type: 'sale', size: 4200, size_unit: 'SF', status: 'prospect', deal_value: 3200000, tenant_company_id: apex, contact_ids: [marcus], notes: 'Exploring sale of leased asset. 10-yr NNN lease in place.', tags: ['nj','retail','nnn'], created_at: iso(subDays(now, 40)) },
    { name: 'Seaport Multifamily Dev', address: '22 Channel St, Boston, MA 02210', deal_type: 'construction-financing', size: 1.8, size_unit: 'AC', status: 'under-contract', deal_value: 65000000, tenant_company_id: harbor, contact_ids: [priya, greg], notes: 'LOI signed. Zoned for 200-unit multifamily. Seeking construction loan.', tags: ['boston','multifamily','development'], created_at: iso(subDays(now, 25)) },
  ]).select()
  if (pe) throw pe

  const broadway   = props.find(p => p.name.includes('1440 Broadway'))?.id
  const edisonDC   = props.find(p => p.name.includes('Edison'))?.id
  const seaport    = props.find(p => p.name.includes('Seaport'))?.id

  // 4. Reminders
  const { error: re } = await supabase.from('reminders').insert([
    { title: 'Follow up on LOI status', type: 'call', due_date: iso(addDays(now, 0)), contact_id: james, company_id: meridian, property_id: broadway, status: 'pending', priority: 'high', notes: 'James mentioned decision expected this week.', created_at: iso(subDays(now, 2)) },
    { title: 'Send updated availability flyer', type: 'email', due_date: iso(addDays(now, 1)), contact_id: sarah, company_id: greenfield, property_id: edisonDC, status: 'pending', priority: 'medium', notes: 'Sarah asked for revised SF breakdown.', created_at: iso(subDays(now, 1)) },
    { title: 'Schedule site tour — Edison DC', type: 'meeting', due_date: iso(addDays(now, 3)), contact_id: sarah, company_id: greenfield, property_id: edisonDC, status: 'pending', priority: 'medium', notes: 'Confirm Thursday afternoon availability.', created_at: iso(subDays(now, 1)) },
    { title: 'Q2 check-in with Marcus', type: 'call', due_date: iso(addDays(now, 7)), contact_id: marcus, company_id: apex, status: 'pending', priority: 'low', notes: 'Routine quarterly touch base.', created_at: iso(subDays(now, 5)) },
    { title: 'Confirm city approval timeline', type: 'call', due_date: iso(subDays(now, 1)), contact_id: greg, company_id: harbor, property_id: seaport, status: 'pending', priority: 'high', notes: 'Greg needs update before investor call.', created_at: iso(subDays(now, 5)) },
    { title: 'Send comp survey for Edison market', type: 'email', due_date: iso(subDays(now, 3)), contact_id: sarah, company_id: greenfield, property_id: edisonDC, status: 'done', priority: 'medium', notes: 'Done. Sarah appreciated the detail.', created_at: iso(subDays(now, 10)), completed_at: iso(subDays(now, 3)) },
  ])
  if (re) throw re

  // 5. Activities
  const { error: ae } = await supabase.from('activities').insert([
    { type: 'call', description: 'Spoke with James re: LOI on floors 14-16. Positive signal. He wants revised TI package by EOW.', contact_id: james, company_id: meridian, property_id: broadway, created_at: iso(subDays(now, 3)) },
    { type: 'email', description: 'Sent availability flyer and asking rent schedule to Sarah.', contact_id: sarah, company_id: greenfield, property_id: edisonDC, created_at: iso(subDays(now, 12)) },
    { type: 'meeting', description: 'Met Marcus at ICSC. Discussed 3 new target markets. Sent follow-up email same day.', contact_id: marcus, company_id: apex, created_at: iso(subDays(now, 7)) },
    { type: 'note', description: 'LOI executed on Seaport Land Site. Harbor View targeting 8-week due diligence.', contact_id: greg, company_id: harbor, property_id: seaport, created_at: iso(subDays(now, 4)) },
    { type: 'call', description: 'Left VM for Priya on site plan status. No callback yet.', contact_id: priya, company_id: harbor, property_id: seaport, created_at: iso(subDays(now, 2)) },
  ])
  if (ae) throw ae
}
