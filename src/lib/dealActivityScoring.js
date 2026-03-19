/**
 * Deal Activity Scoring Pipeline
 *
 * An email qualifies as a deal activity if EITHER condition is met:
 *
 *   Condition A — Email has a file attachment that exists in an OM or UW folder
 *                 in the user's SharePoint/OneDrive. The attachment objects passed
 *                 in must already have `inDealFolder: true` resolved by the caller
 *                 (dealActivitySync.js) via a SharePoint search.
 *
 *   Condition B — A direct recipient (outbound: To field) or sender (inbound: From
 *                 field) is a CRM contact linked to a deal with an active status.
 *                 CC is excluded.
 *
 * No address matching, keyword matching, or name-in-body checks.
 * All qualifying emails are Tier 1 (auto). No Tier 2 (needs_review).
 */

const ACTIVE_STATUSES = new Set([
  'prospect', 'engaged', 'under-loi', 'under-contract', 'due-diligence',
])

// SharePoint folder path segments that qualify (OM and UW only)
const DEAL_FOLDER_PATTERNS = ['/om/', '/uw/']

/**
 * Check whether a SharePoint parentReference path is inside an OM or UW folder.
 * @param {string} path - e.g. "/drives/xxx/root:/Deals/OM"
 */
export function isInDealFolder(path = '') {
  const lower = path.toLowerCase()
  return DEAL_FOLDER_PATTERNS.some(pat => lower.includes(pat))
}

/**
 * Score an email (inbound or outbound) against CRM deals.
 *
 * @param {object} message     - Graph message object
 * @param {Array}  attachments - Attachment objects; qualifying ones have `inDealFolder: true`
 * @param {object} crmData     - { contacts, companies, properties }
 * @param {string} direction   - 'outbound' | 'inbound'
 *
 * @returns {{ tier, confidence, score, signals, contactId, companyId, propertyId, candidatePropertyIds }}
 */
export function scoreEmail(message, attachments = [], crmData, direction = 'outbound') {
  const { contacts = [], properties = [] } = crmData

  // ── Build lookups ─────────────────────────────────────────────────────────
  const contactsByEmail = {}
  const contactsById    = {}
  for (const c of contacts) {
    contactsById[c.id] = c
    const emails = [...new Set([c.email, c.email2, c.email3, c.email4, c.email5, c.email6, ...(c.personalEmails || []), ...(c.sharedEmails || [])].filter(Boolean))]
    for (const em of emails) contactsByEmail[em.toLowerCase()] = c
  }

  const activeProperties = properties.filter(
    p => ACTIVE_STATUSES.has(p.status) && !p.deletedAt,
  )

  // ── Condition A: file attachment from an OM or UW folder ──────────────────
  const dealFolderAtts = (attachments || []).filter(a => a.inDealFolder)
  const hasDealFolderAtt = dealFolderAtts.length > 0

  // ── Condition B: direct recipient/sender linked to an active deal ──────────
  let relevantEmails = []
  if (direction === 'outbound') {
    relevantEmails = (message.toRecipients || [])
      .map(r => r.emailAddress?.address?.toLowerCase())
      .filter(Boolean)
  } else {
    const sender = message.from?.emailAddress?.address?.toLowerCase()
    if (sender) relevantEmails = [sender]
  }

  let matchedContact = null
  let matchedDeal    = null

  for (const email of relevantEmails) {
    const contact = contactsByEmail[email]
    if (!contact) continue
    const deal = activeProperties.find(d => (d.contactIds || []).includes(contact.id))
    if (deal) {
      matchedContact = contact
      matchedDeal    = deal
      break
    }
  }

  const hasActiveDealContact = matchedContact !== null

  // ── Gate ──────────────────────────────────────────────────────────────────
  if (!hasDealFolderAtt && !hasActiveDealContact) {
    return {
      tier: 3, confidence: 'none', score: 0, signals: [],
      contactId: null, companyId: null, propertyId: null, candidatePropertyIds: [],
    }
  }

  // ── Build signals ─────────────────────────────────────────────────────────
  const signals = []

  if (hasDealFolderAtt) {
    signals.push({
      type:   'deal_folder_attachment',
      detail: dealFolderAtts.map(a => a.name || ''),
    })
  }
  if (hasActiveDealContact) {
    signals.push({
      type:   'active_deal_contact',
      detail: [`${matchedContact.firstName || ''} ${matchedContact.lastName || ''}`.trim()],
    })
  }

  // ── Resolve identifiers ───────────────────────────────────────────────────
  let contactId = null
  let companyId = null
  let propertyId = null
  const candidatePropertyIds = []

  if (matchedContact) {
    contactId  = matchedContact.id
    companyId  = matchedContact.companyId || null
    propertyId = matchedDeal?.id || null
  } else {
    // No active-deal contact; still tag a CRM contact from recipients if present
    for (const email of relevantEmails) {
      const contact = contactsByEmail[email]
      if (contact) {
        contactId = contact.id
        companyId = contact.companyId || null
        break
      }
    }
  }

  return {
    tier:       1,
    confidence: hasDealFolderAtt ? 'high' : 'medium',
    score:      hasDealFolderAtt ? 95 : 75,
    signals,
    contactId,
    companyId,
    propertyId,
    candidatePropertyIds,
  }
}
