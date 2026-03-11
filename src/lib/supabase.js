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

// Strip undefined fields before sending to Supabase
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

function row(data)  { return toCamel(data) }
function rows(data) { return (data || []).map(toCamel) }

// ─── Generic table helper ──────────────────────────────────────────────────────
function table(name) {
  return {
    getAll: async (order = 'created_at') => {
      const { data, error } = await supabase.from(name).select('*').order(order)
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
        .from(name).update(clean(toSnake(patch))).eq('id', id).select().single()
      if (error) throw error
      return row(data)
    },
    delete: async (id) => {
      const { error } = await supabase.from(name).delete().eq('id', id)
      if (error) throw error
    },
  }
}

// ─── db API (mirrors old storage.js interface, but async) ─────────────────────
export const db = {
  companies:   table('companies'),
  contacts:    table('contacts'),
  properties:  table('properties'),
  reminders:   table('reminders'),
  activities:  table('activities'),
  teamMembers: table('team_members'),
  config: {
    isSeeded: async () => {
      const { data, error } = await supabase
        .from('app_config').select('value').eq('key', 'seeded').single()
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

  // 3. Properties
  const { data: props, error: pe } = await supabase.from('properties').insert([
    { name: '1440 Broadway', address: '1440 Broadway, New York, NY 10018', type: 'office', subtype: 'Class A', size: 185000, size_unit: 'SF', status: 'available', asking_rent: 72, rent_unit: '/SF/yr', owner_company_id: meridian, contact_ids: [james], floor: '14-22', notes: 'Full floors available. LEED Gold certified.', tags: ['nyc','class-a','leed'], created_at: iso(subDays(now, 80)) },
    { name: 'Greenfield Logistics Center — Edison', address: '100 Industrial Blvd, Edison, NJ 08817', type: 'industrial', subtype: 'Distribution', size: 320000, size_unit: 'SF', status: 'available', asking_rent: 14.5, rent_unit: '/SF/yr', owner_company_id: greenfield, contact_ids: [sarah], floor: '1', notes: "36' clear height. 80 dock doors.", tags: ['nj','industrial','logistics'], created_at: iso(subDays(now, 55)) },
    { name: 'Apex Retail — Hoboken', address: '234 Washington St, Hoboken, NJ 07030', type: 'retail', subtype: 'End-cap', size: 4200, size_unit: 'SF', status: 'leased', asking_rent: 85, rent_unit: '/SF/yr', tenant_company_id: apex, contact_ids: [marcus], floor: '1', notes: 'Signed 10-yr lease.', tags: ['nj','retail','signed'], created_at: iso(subDays(now, 40)) },
    { name: 'Seaport Land Site', address: '22 Channel St, Boston, MA 02210', type: 'land', subtype: 'Infill', size: 1.8, size_unit: 'AC', status: 'under-contract', tenant_company_id: harbor, contact_ids: [priya, greg], notes: 'LOI signed. Zoned for 200-unit multifamily.', tags: ['boston','land','multifamily'], created_at: iso(subDays(now, 25)) },
  ]).select()
  if (pe) throw pe

  const broadway   = props.find(p => p.name === '1440 Broadway').id
  const edisonDC   = props.find(p => p.name.includes('Edison')).id
  const seaport    = props.find(p => p.name === 'Seaport Land Site').id

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
