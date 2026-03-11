import { subDays, addDays, subHours, format } from 'date-fns'

const now = new Date()
const iso = (d) => d.toISOString()

export const SEED_COMPANIES = [
  { id: 'c1', name: 'Meridian Capital Partners', type: 'investor', address: '200 Park Ave, New York, NY 10166', phone: '212-555-0100', email: 'info@meridiancap.com', website: 'meridiancap.com', notes: 'Active buyer in tri-state. Prefers Class A office.', tags: ['buyer', 'nyc', 'class-a'], createdAt: iso(subDays(now, 90)) },
  { id: 'c2', name: 'Greenfield Industrial Trust', type: 'owner', address: '1 Harbor Blvd, Weehawken, NJ 07086', phone: '201-555-0200', email: 'leasing@greenfieldtrust.com', website: 'greenfieldtrust.com', notes: 'Owns 4M SF of industrial in NJ/PA. Decision maker is VP of Real Estate.', tags: ['owner', 'industrial', 'nj'], createdAt: iso(subDays(now, 60)) },
  { id: 'c3', name: 'Apex Retail Group', type: 'tenant', address: '500 Fifth Ave, New York, NY 10110', phone: '212-555-0300', email: 'real.estate@apexretail.com', website: 'apexretail.com', notes: 'Expanding to 15 new locations in 2025. Need 3-5k SF end-caps.', tags: ['tenant', 'retail', 'expansion'], createdAt: iso(subDays(now, 45)) },
  { id: 'c4', name: 'Harbor View Development', type: 'developer', address: '88 Seaport Blvd, Boston, MA 02210', phone: '617-555-0400', email: 'acquisitions@harborview.com', website: 'harborviewdev.com', notes: 'Multifamily developer. Looking for infill land in Greater Boston.', tags: ['developer', 'multifamily', 'boston'], createdAt: iso(subDays(now, 30)) },
]

export const SEED_CONTACTS = [
  { id: 'ct1', firstName: 'James', lastName: 'Whitmore', title: 'Managing Director', companyId: 'c1', email: 'j.whitmore@meridiancap.com', phone: '212-555-0101', mobile: '917-555-0101', linkedIn: 'linkedin.com/in/jameswhitmore', tags: ['key-contact', 'decision-maker'], notes: 'Prefers calls before 10am. Met at ULI conference.', lastContacted: iso(subDays(now, 3)), createdAt: iso(subDays(now, 90)) },
  { id: 'ct2', firstName: 'Sarah', lastName: 'Chen', title: 'VP Real Estate', companyId: 'c2', email: 's.chen@greenfieldtrust.com', phone: '201-555-0201', mobile: '646-555-0201', linkedIn: '', tags: ['key-contact'], notes: 'Very responsive by email. Has final say on NJ deals.', lastContacted: iso(subDays(now, 12)), createdAt: iso(subDays(now, 60)) },
  { id: 'ct3', firstName: 'Marcus', lastName: 'DeRosa', title: 'Director of Leasing', companyId: 'c3', email: 'm.derosa@apexretail.com', phone: '212-555-0301', mobile: '646-555-0301', linkedIn: 'linkedin.com/in/marcusderosa', tags: ['decision-maker', 'retail'], notes: 'Meets Thursdays only. Very metrics-driven.', lastContacted: iso(subDays(now, 7)), createdAt: iso(subDays(now, 45)) },
  { id: 'ct4', firstName: 'Priya', lastName: 'Nair', title: 'Acquisitions Associate', companyId: 'c4', email: 'p.nair@harborview.com', phone: '617-555-0401', mobile: '617-555-0411', linkedIn: '', tags: ['warm-lead'], notes: 'Junior contact — escalate to Greg Holt for final decisions.', lastContacted: iso(subDays(now, 20)), createdAt: iso(subDays(now, 30)) },
  { id: 'ct5', firstName: 'Greg', lastName: 'Holt', title: 'Principal', companyId: 'c4', email: 'g.holt@harborview.com', phone: '617-555-0402', mobile: '617-555-0422', linkedIn: 'linkedin.com/in/gregholt', tags: ['decision-maker'], notes: 'Old school — prefers phone over email.', lastContacted: iso(subDays(now, 25)), createdAt: iso(subDays(now, 28)) },
]

export const SEED_PROPERTIES = [
  { id: 'p1', name: '1440 Broadway', address: '1440 Broadway, New York, NY 10018', type: 'office', subtype: 'Class A', size: 185000, sizeUnit: 'SF', status: 'available', askingRent: 72, rentUnit: '/SF/yr', ownerCompanyId: 'c1', tenantCompanyId: null, contactIds: ['ct1'], floor: '14-22', notes: 'Full floors available. LEED Gold certified. Strong Times Square demand.', tags: ['nyc', 'class-a', 'leed'], createdAt: iso(subDays(now, 80)) },
  { id: 'p2', name: 'Greenfield Logistics Center — Edison', address: '100 Industrial Blvd, Edison, NJ 08817', type: 'industrial', subtype: 'Distribution', size: 320000, sizeUnit: 'SF', status: 'available', askingRent: 14.5, rentUnit: '/SF/yr', ownerCompanyId: 'c2', tenantCompanyId: null, contactIds: ['ct2'], floor: '1', notes: '36\' clear height. 80 dock doors. Easy I-287 access.', tags: ['nj', 'industrial', 'logistics'], createdAt: iso(subDays(now, 55)) },
  { id: 'p3', name: 'Apex Retail — Hoboken', address: '234 Washington St, Hoboken, NJ 07030', type: 'retail', subtype: 'End-cap', size: 4200, sizeUnit: 'SF', status: 'leased', askingRent: 85, rentUnit: '/SF/yr', ownerCompanyId: null, tenantCompanyId: 'c3', contactIds: ['ct3'], floor: '1', notes: 'Signed 10-yr lease. Opens Q2 2025. Grand opening outreach TBD.', tags: ['nj', 'retail', 'signed'], createdAt: iso(subDays(now, 40)) },
  { id: 'p4', name: 'Seaport Land Site', address: '22 Channel St, Boston, MA 02210', type: 'land', subtype: 'Infill', size: 1.8, sizeUnit: 'AC', status: 'under-contract', askingRent: null, rentUnit: null, ownerCompanyId: null, tenantCompanyId: 'c4', contactIds: ['ct4', 'ct5'], floor: null, notes: 'LOI signed. Zoned for 200-unit multifamily. Awaiting city approval.', tags: ['boston', 'land', 'multifamily'], createdAt: iso(subDays(now, 25)) },
]

export const SEED_REMINDERS = [
  { id: 'r1', title: 'Follow up on LOI status', type: 'call', dueDate: iso(addDays(now, 0)), contactId: 'ct1', companyId: 'c1', propertyId: 'p1', status: 'pending', priority: 'high', notes: 'James mentioned decision expected this week.', createdAt: iso(subDays(now, 2)) },
  { id: 'r2', title: 'Send updated availability flyer', type: 'email', dueDate: iso(addDays(now, 1)), contactId: 'ct2', companyId: 'c2', propertyId: 'p2', status: 'pending', priority: 'medium', notes: 'Sarah asked for revised SF breakdown after suite reconfiguration.', createdAt: iso(subDays(now, 1)) },
  { id: 'r3', title: 'Schedule site tour — Edison DC', type: 'meeting', dueDate: iso(addDays(now, 3)), contactId: 'ct2', companyId: 'c2', propertyId: 'p2', status: 'pending', priority: 'medium', notes: 'Confirm Thursday afternoon availability.', createdAt: iso(subDays(now, 1)) },
  { id: 'r4', title: 'Q2 check-in with Marcus', type: 'call', dueDate: iso(addDays(now, 7)), contactId: 'ct3', companyId: 'c3', propertyId: null, status: 'pending', priority: 'low', notes: 'Routine quarterly touch base on expansion pipeline.', createdAt: iso(subDays(now, 5)) },
  { id: 'r5', title: 'Confirm city approval timeline', type: 'call', dueDate: iso(subDays(now, 1)), contactId: 'ct5', companyId: 'c4', propertyId: 'p4', status: 'pending', priority: 'high', notes: 'Greg needs update before investor call.', createdAt: iso(subDays(now, 5)) },
  { id: 'r6', title: 'Send comp survey for Edison market', type: 'email', dueDate: iso(subDays(now, 3)), contactId: 'ct2', companyId: 'c2', propertyId: 'p2', status: 'done', priority: 'medium', notes: 'Done. Sarah appreciated the detail.', createdAt: iso(subDays(now, 10)) },
]

export const SEED_ACTIVITIES = [
  { id: 'a1', type: 'call', description: 'Spoke with James re: LOI on floors 14-16. Positive signal. He wants revised TI package by EOW.', contactId: 'ct1', companyId: 'c1', propertyId: 'p1', createdAt: iso(subDays(now, 3)) },
  { id: 'a2', type: 'email', description: 'Sent availability flyer and asking rent schedule to Sarah.', contactId: 'ct2', companyId: 'c2', propertyId: 'p2', createdAt: iso(subDays(now, 12)) },
  { id: 'a3', type: 'meeting', description: 'Met Marcus at ICSC. Discussed 3 new target markets. Sent follow-up email same day.', contactId: 'ct3', companyId: 'c3', propertyId: null, createdAt: iso(subDays(now, 7)) },
  { id: 'a4', type: 'note', description: 'LOI executed on Seaport Land Site. Harbor View targeting 8-week due diligence.', contactId: 'ct5', companyId: 'c4', propertyId: 'p4', createdAt: iso(subDays(now, 4)) },
  { id: 'a5', type: 'call', description: 'Left VM for Priya on site plan status. No callback yet.', contactId: 'ct4', companyId: 'c4', propertyId: 'p4', createdAt: iso(subDays(now, 2)) },
]
