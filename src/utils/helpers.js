import { format, isToday, isTomorrow, isYesterday, isPast, parseISO, differenceInDays } from 'date-fns'

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  return format(d, 'MMM d, yyyy h:mm a')
}

export function formatShortDate(iso) {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  return format(d, 'MMM d')
}

export function isOverdue(iso) {
  if (!iso) return false
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  return isPast(d) && !isToday(d)
}

export function isDueToday(iso) {
  if (!iso) return false
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  return isToday(d)
}

export function daysDiff(iso) {
  if (!iso) return null
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  return differenceInDays(new Date(), d)
}

export const PROPERTY_TYPES = ['office', 'industrial', 'retail', 'multifamily', 'land', 'mixed-use', 'hotel', 'other']
export const PROPERTY_STATUSES = ['available', 'leased', 'under-contract', 'sold', 'off-market', 'pending']

export const DEAL_TYPES = [
  'acquisition', 'note-acquisition', 'recapitalization', 'sale',
  'equity-raise', 'preferred-equity', 'mezzanine',
  'senior-debt', 'bridge-financing', 'construction-financing'
]

export const DEAL_STATUSES = [
  'prospect', 'engaged', 'under-loi', 'under-contract',
  'due-diligence', 'closed', 'dead'
]

export const DEAL_STATUS_COLORS = {
  prospect:         'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  engaged:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'under-loi':      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'under-contract': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  'due-diligence':  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  closed:           'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  dead:             'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
}

export const DEAL_TYPE_COLORS = {
  acquisition:              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'note-acquisition':       'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  recapitalization:         'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  sale:                     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'equity-raise':           'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'preferred-equity':       'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  mezzanine:                'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'senior-debt':            'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'bridge-financing':       'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  'construction-financing': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
}

export function formatDealType(t) {
  const labels = {
    'acquisition': 'Acquisition', 'note-acquisition': 'Note Acquisition',
    'recapitalization': 'Recapitalization', 'sale': 'Sale',
    'equity-raise': 'Equity Raise', 'preferred-equity': 'Preferred Equity',
    'mezzanine': 'Mezzanine', 'senior-debt': 'Senior Debt',
    'bridge-financing': 'Bridge Financing', 'construction-financing': 'Construction Financing',
  }
  return labels[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ') : '')
}

export function formatDealStatus(s) {
  const labels = {
    'prospect': 'Prospect', 'engaged': 'Engaged', 'under-loi': 'Under LOI',
    'under-contract': 'Under Contract', 'due-diligence': 'Due Diligence',
    'closed': 'Closed', 'dead': 'Dead',
  }
  return labels[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ') : '')
}
export const COMPANY_TYPES = ['owner', 'tenant', 'investor', 'developer', 'broker', 'lender', 'other']

export const CONTACT_FUNCTIONS = [
  'lp-investor', 'broker', 'developer', 'lender', 'owner-operator',
  'tenant', 'attorney', 'accountant', 'property-manager', 'other',
]

export function formatContactFunction(f) {
  const labels = {
    'lp-investor': 'LP Investor', 'broker': 'Broker', 'developer': 'Developer',
    'lender': 'Lender', 'owner-operator': 'Owner / Operator', 'tenant': 'Tenant',
    'attorney': 'Attorney', 'accountant': 'Accountant',
    'property-manager': 'Property Manager', 'other': 'Other',
  }
  return labels[f] || (f ? f.charAt(0).toUpperCase() + f.slice(1).replace(/-/g, ' ') : '')
}
export const REMINDER_TYPES = ['call', 'email', 'meeting', 'tour', 'proposal', 'follow-up', 'other']
export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'tour', 'proposal', 'other']
export const PRIORITIES = ['high', 'medium', 'low']

export const STATUS_COLORS = {
  available:       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  leased:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'under-contract':'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  sold:            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'off-market':    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  pending:         'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

export const PRIORITY_COLORS = {
  high:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  low:    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export const TYPE_COLORS = {
  call:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  email:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  meeting:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  tour:     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  proposal: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  note:     'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'follow-up': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  other:    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export const COMPANY_TYPE_COLORS = {
  owner:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  tenant:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  investor:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  developer: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  broker:    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  lender:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  other:     'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export function fullName(contact) {
  if (!contact) return 'Unknown'
  return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown'
}

export function initials(contact) {
  if (!contact) return '?'
  return `${(contact.firstName || '')[0] || ''}${(contact.lastName || '')[0] || ''}`.toUpperCase()
}

export function companyInitials(company) {
  if (!company || !company.name) return '?'
  return company.name.split(' ').slice(0, 2).map(w => w[0]).filter(Boolean).join('').toUpperCase() || '?'
}

export const ASSET_TYPES = ['office', 'industrial', 'retail', 'multifamily', 'land', 'mixed-use', 'hotel', 'self-storage', 'medical', 'data-center', 'other']

export const CAPITAL_TYPES = ['core', 'core-plus', 'value-add', 'opportunistic', 'development', 'debt', 'other']

export const INVESTOR_STATUSES = ['contacted', 'reviewing', 'interested', 'site-visit', 'bidding', 'passed', 'awarded']

export const INVESTOR_STATUS_COLORS = {
  contacted:   'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  reviewing:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  interested:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'site-visit':'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  bidding:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  passed:      'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  awarded:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

export function formatAssetType(t) {
  if (!t) return ''
  const labels = {
    'office': 'Office', 'industrial': 'Industrial', 'retail': 'Retail',
    'multifamily': 'Multifamily', 'land': 'Land', 'mixed-use': 'Mixed-Use',
    'hotel': 'Hotel', 'self-storage': 'Self-Storage', 'medical': 'Medical',
    'data-center': 'Data Center', 'other': 'Other',
  }
  return labels[t] || t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ')
}

export function formatCapitalType(t) {
  if (!t) return ''
  const labels = {
    'core': 'Core', 'core-plus': 'Core+', 'value-add': 'Value-Add',
    'opportunistic': 'Opportunistic', 'development': 'Development',
    'debt': 'Debt', 'other': 'Other',
  }
  return labels[t] || t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ')
}

export function formatInvestorStatus(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
}

export function formatCurrency(val) {
  if (val == null || val === '') return '—'
  const num = Number(val)
  if (isNaN(num)) return '—'
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`
  return `$${num.toLocaleString()}`
}

export function formatPercent(val) {
  if (val == null || val === '') return '—'
  const num = Number(val)
  if (isNaN(num)) return '—'
  return `${num.toFixed(2)}%`
}

export function formatPSF(val) {
  if (val == null || val === '') return '—'
  return `$${Number(val).toFixed(0)}/SF`
}

export const SNOOZE_OPTIONS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
]

export function priorityWeight(p) {
  return p === 'high' ? 3 : p === 'medium' ? 2 : 1
}

export function relativeTimeLabel(iso) {
  if (!iso) return ''
  const d = typeof iso === 'string' ? parseISO(iso) : iso
  const diff = differenceInDays(d, new Date())
  if (diff < -1) return `Overdue by ${Math.abs(diff)} days`
  if (diff === -1) return 'Overdue by 1 day'
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `Due in ${diff} days`
}
