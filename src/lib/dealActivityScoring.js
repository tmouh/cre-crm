/**
 * Deal Activity Scoring Pipeline
 *
 * Hard gate rule — an email only qualifies if ALL of the following are true
 * for the SAME active deal:
 *
 *   1. The deal's address OR name appears in the email subject/body.
 *   2. A deal contact's email is in the To field (outbound) or From field
 *      (inbound) — CC recipients are NEVER counted — OR the contact's full
 *      name appears in the subject/body.
 *
 * Gate 2 strength determines the tier:
 *   Strong (email match)  → Tier 1 (auto)
 *   Weak   (name in body) → Tier 2 (needs_review)
 *   SharePoint deal folder attachment → always Tier 1, high confidence
 *
 * Tier 3 = excluded entirely.
 */

const ACTIVE_STATUSES = new Set([
  'prospect', 'engaged', 'under-loi', 'under-contract', 'due-diligence',
])

// Path segments in SharePoint/OneDrive URLs that signal deal-related files.
const DEAL_FOLDER_PATTERNS = [
  '/om/',
  '/uw/',
  '/loi/',
  '/psa/',
  '/dd/',
  '/offering/',
  '/underwriting/',
  '/due-diligence/',
  '/due_diligence/',
  '/diligence/',
  '/closing/',
  '/financials/',
  '/pro-forma/',
  '/proforma/',
  '/term-sheet/',
  '/termsheet/',
  '/acquisition/',
  '/deal-docs/',
  '/deal_docs/',
  '/investment/',
]

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

  // ── Build contact lookups ─────────────────────────────────────────────────
  const contactsById    = {}
  const contactsByEmail = {}
  for (const c of contacts) {
    contactsById[c.id] = c
    if (c.email) contactsByEmail[c.email.toLowerCase()] = c
  }

  // Only score against active, non-deleted deals
  const activeProperties = properties.filter(
    p => ACTIVE_STATUSES.has(p.status) && !p.deletedAt,
  )

  // ── Search text for address/name matching ─────────────────────────────────
  const searchText = `${message.subject || ''} ${message.bodyPreview || ''}`.toLowerCase()

  // ── Relevant sender/recipient emails ──────────────────────────────────────
  // Outbound: To field only — CC is deliberately excluded per business rule
  // Inbound:  From field only (the client who sent the email)
  let relevantEmails = []
  if (direction === 'outbound') {
    relevantEmails = (message.toRecipients || [])
      .map(r => r.emailAddress?.address?.toLowerCase())
      .filter(Boolean)
  } else {
    const senderEmail = message.from?.emailAddress?.address?.toLowerCase()
    if (senderEmail) relevantEmails = [senderEmail]
  }

  // ── SharePoint deal-folder attachment detection ───────────────────────────
  const dealFolderAtts = (attachments || []).filter(att => {
    if (!att.sourceUrl) return false
    const url = att.sourceUrl.toLowerCase()
    return DEAL_FOLDER_PATTERNS.some(pat => url.includes(pat))
  })
  const hasSharePoint = dealFolderAtts.length > 0

  // ── Per-deal gate check ───────────────────────────────────────────────────
  const matchedDeals = []

  for (const deal of activeProperties) {
    // GATE 1: Deal address or name in email subject/body
    const streetPart = (deal.address || '').split(',')[0].trim()
    const namePart   = (deal.name || '').trim()

    const addrFound = streetPart.length >= 6 && searchText.includes(streetPart.toLowerCase())
    const nameFound = namePart.length   >= 6 && searchText.includes(namePart.toLowerCase())

    if (!addrFound && !nameFound) continue

    // GATE 2: A contact directly linked to this deal is identified in the email
    const dealContacts = (deal.contactIds || [])
      .map(id => contactsById[id])
      .filter(Boolean)

    let matchedContact = null
    let strongMatch    = false // email found in To (outbound) or From (inbound)

    // Strong check first: email address match
    for (const c of dealContacts) {
      if (c.email && relevantEmails.includes(c.email.toLowerCase())) {
        matchedContact = c
        strongMatch    = true
        break
      }
    }

    // Weak check: contact's full name appears in subject/body
    if (!matchedContact) {
      for (const c of dealContacts) {
        const name = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase()
        if (name.length >= 4 && searchText.includes(name)) {
          matchedContact = c
          break
        }
      }
    }

    // Both gates must pass
    if (!matchedContact) continue

    matchedDeals.push({ deal, matchedContact, strongMatch })
  }

  // ── No qualifying deal found ──────────────────────────────────────────────
  if (matchedDeals.length === 0) {
    return {
      tier: 3, confidence: 'none', score: 0, signals: [],
      contactId: null, companyId: null, propertyId: null, candidatePropertyIds: [],
    }
  }

  // ── Build signals ─────────────────────────────────────────────────────────
  const signals = []
  const primary = matchedDeals[0]

  signals.push({
    type:   'address_match',
    detail: [primary.deal.name || primary.deal.address],
  })

  signals.push({
    type:   primary.strongMatch ? 'recipient_match' : 'name_match',
    detail: [`${primary.matchedContact.firstName || ''} ${primary.matchedContact.lastName || ''}`.trim()],
  })

  if (hasSharePoint) {
    signals.push({
      type:   'sharepoint_deal_folder',
      detail: dealFolderAtts.map(a => a.name || a.sourceUrl || ''),
    })
  }

  // ── Tier determination ────────────────────────────────────────────────────
  // Strong (email match) or SharePoint → Tier 1 auto
  // Weak (name only in body) → Tier 2 needs_review
  let tier, confidence, score

  if (primary.strongMatch || hasSharePoint) {
    tier       = 1
    confidence = hasSharePoint ? 'high' : 'medium'
    score      = hasSharePoint ? 95 : 75
  } else {
    tier       = 2
    confidence = 'low'
    score      = 45
  }

  // ── Deal resolution ───────────────────────────────────────────────────────
  const contactId = primary.matchedContact.id
  const companyId = primary.matchedContact.companyId || null

  let propertyId           = null
  let candidatePropertyIds = []

  if (matchedDeals.length === 1) {
    propertyId = matchedDeals[0].deal.id
  } else {
    candidatePropertyIds = matchedDeals.map(m => m.deal.id)
  }

  return { tier, confidence, score, signals, contactId, companyId, propertyId, candidatePropertyIds }
}
