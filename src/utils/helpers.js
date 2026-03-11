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
export const COMPANY_TYPES = ['owner', 'tenant', 'investor', 'developer', 'broker', 'lender', 'other']
export const REMINDER_TYPES = ['call', 'email', 'meeting', 'tour', 'proposal', 'follow-up', 'other']
export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'tour', 'proposal', 'other']
export const PRIORITIES = ['high', 'medium', 'low']

export const STATUS_COLORS = {
  available:       'bg-green-100 text-green-700',
  leased:          'bg-blue-100 text-blue-700',
  'under-contract':'bg-yellow-100 text-yellow-700',
  sold:            'bg-gray-100 text-gray-600',
  'off-market':    'bg-gray-100 text-gray-600',
  pending:         'bg-orange-100 text-orange-700',
}

export const PRIORITY_COLORS = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-gray-100 text-gray-600',
}

export const TYPE_COLORS = {
  call:     'bg-purple-100 text-purple-700',
  email:    'bg-blue-100 text-blue-700',
  meeting:  'bg-indigo-100 text-indigo-700',
  tour:     'bg-teal-100 text-teal-700',
  proposal: 'bg-orange-100 text-orange-700',
  note:     'bg-gray-100 text-gray-600',
  'follow-up': 'bg-pink-100 text-pink-700',
  other:    'bg-gray-100 text-gray-600',
}

export const COMPANY_TYPE_COLORS = {
  owner:     'bg-blue-100 text-blue-700',
  tenant:    'bg-green-100 text-green-700',
  investor:  'bg-purple-100 text-purple-700',
  developer: 'bg-orange-100 text-orange-700',
  broker:    'bg-teal-100 text-teal-700',
  lender:    'bg-yellow-100 text-yellow-700',
  other:     'bg-gray-100 text-gray-600',
}

export function fullName(contact) {
  if (!contact) return 'Unknown'
  return `${contact.firstName} ${contact.lastName}`
}

export function initials(contact) {
  if (!contact) return '?'
  return `${(contact.firstName || '')[0] || ''}${(contact.lastName || '')[0] || ''}`.toUpperCase()
}

export function companyInitials(company) {
  if (!company) return '?'
  return company.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
