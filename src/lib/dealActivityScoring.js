/**
 * Deal Activity Scoring Pipeline
 *
 * An email qualifies as a deal activity if EITHER condition is met:
 *
 *   Condition A — File attachment from an OM or UW folder in SharePoint
 *                 (sourceUrl contains /om/ or /uw/), OR a regular attachment
 *                 whose filename matches OM/UW naming patterns.
 *
 *   Condition B — A sender or direct recipient email matches a CRM contact
 *                 who is linked to a deal with an active status.
 *
 * No address matching, keyword matching, or name-in-body checks.
 * Tier 2 (needs_review) is not used — emails either auto-qualify or are excluded.
 */

const ACTIVE_STATUSES = new Set([
  'prospect', 'engaged', 'under-loi', 'under-contract', 'due-diligence',
])

// SharePoint folder path segments that qualify (OM / UW only per business rule)
const DEAL_FOLDER_PATTERNS = ['/om/', '/uw/']

// Filename patterns for regular (non-SharePoint-reference) attachments
// Matches filenames that clearly represent OM or UW documents
const OM_UW_FILENAME_RE = /\b(om|uw|offering\s*mem(o|orandum)|underwriting|offering\s*circular)\b/i

/**
 * Score an email (inbound or outbound) against CRM deals.
 *
 * @param {object} message     - Graph message object
 * @param {Array}  attachments - Attachment objects (may include sourceUrl for SharePoint refs)
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
    if (c.email) contactsByEmail[c.email.toLowerCase()] = c
  }

  const activeProperties = properties.filter(
    p => ACTIVE_STATUSES.has(p.status) && !p.deletedAt,
  )

  // ── Condition A: OM / UW attachment ──────────────────────────────────────
  // A1 — SharePoint reference attachment from an OM or UW folder
  const dealFolderAtts = (attachments || []).filter(att => {
    if (!att.sourceUrl) return false
    const url = att.sourceUrl.toLowerCase()
    return DEAL_FOLDER_PATTERNS.some(pat => url.includes(pat))
  })

  // A2 — Regular attachment whose filename matches OM/UW patterns
  const namedDealAtts = (attachments || []).filter(att => {
    if (att.sourceUrl) return false  // already handled by A1
    return att.name && OM_UW_FILENAME_RE.test(att.name)
  })

  const hasDealFolderAtt = dealFolderAtts.length > 0 || namedDealAtts.length > 0

  // ── Condition B: Contact linked to an active deal ─────────────────────────
  // Outbound: To field only (CC excluded). Inbound: From field only.
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

  // ── Gate: must pass at least one condition ────────────────────────────────
  if (!hasDealFolderAtt && !hasActiveDealContact) {
    return {
      tier: 3, confidence: 'none', score: 0, signals: [],
      contactId: null, companyId: null, propertyId: null, candidatePropertyIds: [],
    }
  }

  // ── Build signals ─────────────────────────────────────────────────────────
  const signals = []

  if (dealFolderAtts.length > 0) {
    signals.push({
      type:   'deal_folder_attachment',
      detail: dealFolderAtts.map(a => a.name || a.sourceUrl || ''),
    })
  }
  if (namedDealAtts.length > 0) {
    signals.push({
      type:   'om_uw_attachment',
      detail: namedDealAtts.map(a => a.name || ''),
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
  } else if (hasDealFolderAtt) {
    // No active-deal contact matched — still try to tag a CRM contact from recipients
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
