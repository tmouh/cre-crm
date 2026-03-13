/**
 * Deal Activity Scoring Pipeline
 *
 * Evaluates whether an outbound email is deal-related enough to enter
 * the shared Activity Log as a deal_activity record.
 *
 * Tier 1 (score ≥ 70 OR SharePoint deal folder hit) → auto-include
 * Tier 2 (score 30–69) → needs_review
 * Tier 3 (score < 30) → exclude
 */

const ACTIVE_STATUSES = new Set([
  'prospect', 'engaged', 'under-loi', 'under-contract', 'due-diligence',
])

// Path segments in SharePoint/OneDrive URLs that signal deal-related files.
// Checked as lowercase substrings: /om/, /uw/, /loi/, etc.
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

// Keywords in subject/body indicating deal communication.
// Require at least 2 hits to avoid false positives from single common words.
const DEAL_KEYWORDS = [
  'loi',
  'letter of intent',
  'psa',
  'purchase and sale',
  'due diligence',
  'term sheet',
  'closing',
  'appraisal',
  'inspection report',
  'acquisition',
  'underwriting',
  'offering memo',
  'offering memorandum',
  'noi',
  'cap rate',
  'pro forma',
  'proforma',
  'rent roll',
  'site plan',
  'floor plan',
  'refinanc',
  'senior debt',
  'equity raise',
  'construction loan',
  'mezzanine',
  'escrow',
  'title report',
  'survey',
  'zoning',
]

/**
 * Score an outbound email against CRM data.
 *
 * @param {object} message      - Graph message object:
 *                                { subject, toRecipients, ccRecipients, bodyPreview, hasAttachments, sentDateTime }
 * @param {Array}  attachments  - Attachment objects, may include { sourceUrl, name } for referenceAttachments
 * @param {object} crmData      - { contacts, companies, properties }
 *
 * @returns {{
 *   tier: 1|2|3,
 *   confidence: 'high'|'medium'|'low'|'none',
 *   score: number,
 *   signals: Array<{ type, detail }>,
 *   contactId: string|null,
 *   companyId: string|null,
 *   propertyId: string|null,
 *   candidatePropertyIds: string[],
 * }}
 */
export function scoreEmail(message, attachments = [], crmData) {
  const { contacts = [], properties = [] } = crmData
  const signals = []
  let score = 0

  // ── Build lookup: email → contact ────────────────────────────────────────
  const contactsByEmail = {}
  for (const c of contacts) {
    if (c.email) contactsByEmail[c.email.toLowerCase()] = c
  }

  // Only score against active, non-deleted deals
  const activeProperties = properties.filter(
    p => ACTIVE_STATUSES.has(p.status) && !p.deletedAt,
  )

  // ── Signal: Recipient is a known CRM contact ──────────────────────────────
  const recipientEmails = [
    ...(message.toRecipients || []).map(r => r.emailAddress?.address?.toLowerCase()).filter(Boolean),
    ...(message.ccRecipients || []).map(r => r.emailAddress?.address?.toLowerCase()).filter(Boolean),
  ]

  const matchedContacts = recipientEmails
    .map(email => contactsByEmail[email])
    .filter(Boolean)
    .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i) // dedupe

  if (matchedContacts.length > 0) {
    score += 40
    signals.push({
      type: 'recipient_match',
      detail: matchedContacts.map(c => `${c.firstName || ''} ${c.lastName || ''}`.trim()),
    })
  }

  // ── Signal: Matched contacts are linked to active deals ───────────────────
  const matchedProperties = []

  for (const contact of matchedContacts) {
    // Contact is directly in a deal's contactIds array
    for (const p of activeProperties) {
      if ((p.contactIds || []).includes(contact.id)) {
        if (!matchedProperties.find(x => x.id === p.id)) matchedProperties.push(p)
      }
    }
    // Contact's company is linked to a deal as owner/tenant/lender
    if (contact.companyId) {
      for (const p of activeProperties) {
        const dealCompanyIds = [p.ownerCompanyId, p.tenantCompanyId, p.lenderCompanyId].filter(Boolean)
        if (dealCompanyIds.includes(contact.companyId)) {
          if (!matchedProperties.find(x => x.id === p.id)) matchedProperties.push(p)
        }
      }
    }
  }

  if (matchedProperties.length > 0) {
    score += 35
    signals.push({
      type: 'active_deal_match',
      detail: matchedProperties.map(p => p.name || p.address || ''),
    })
  }

  // ── Signal: Property address or name found in subject/body ────────────────
  const searchText = `${message.subject || ''} ${message.bodyPreview || ''}`.toLowerCase()

  for (const p of activeProperties) {
    // Skip if already matched via contact/company
    if (matchedProperties.find(x => x.id === p.id)) continue

    const streetPart = (p.address || '').split(',')[0].trim()
    const namePart = (p.name || '').trim()

    const addrMatch = streetPart.length >= 8 && searchText.includes(streetPart.toLowerCase())
    const nameMatch = namePart.length >= 8 && searchText.includes(namePart.toLowerCase())

    if (addrMatch || nameMatch) {
      matchedProperties.push(p)
      score += 20
      signals.push({
        type: 'address_match',
        detail: [addrMatch ? streetPart : namePart],
      })
    }
  }

  // ── Signal: Deal keywords in subject/body ────────────────────────────────
  const foundKeywords = DEAL_KEYWORDS.filter(kw => searchText.includes(kw))
  if (foundKeywords.length >= 2) {
    score += 10
    signals.push({ type: 'deal_keywords', detail: foundKeywords })
  }

  // ── Signal: SharePoint reference attachment from a deal folder ────────────
  // referenceAttachments have a sourceUrl containing the OneDrive/SharePoint path.
  // Paths like /OM/, /UW/, /Underwriting/, etc. are definitive deal signals.
  const dealFolderAtts = attachments.filter(att => {
    if (!att.sourceUrl) return false
    const url = att.sourceUrl.toLowerCase()
    return DEAL_FOLDER_PATTERNS.some(pattern => url.includes(pattern))
  })

  if (dealFolderAtts.length > 0) {
    score += 55 // Strong enough to reach Tier 1 on its own
    signals.push({
      type: 'sharepoint_deal_folder',
      detail: dealFolderAtts.map(a => a.name || a.sourceUrl || ''),
    })
  }

  // ── Determine tier ────────────────────────────────────────────────────────
  let tier, confidence

  if (score >= 70) {
    tier = 1
    confidence = score >= 90 ? 'high' : 'medium'
  } else if (score >= 30) {
    tier = 2
    confidence = 'low'
  } else {
    tier = 3
    confidence = 'none'
  }

  // ── Determine best contact/company/property associations ─────────────────
  const contactId = matchedContacts[0]?.id || null
  const companyId = matchedContacts[0]?.companyId || null

  let propertyId = null
  let candidatePropertyIds = []

  if (matchedProperties.length === 1) {
    propertyId = matchedProperties[0].id
  } else if (matchedProperties.length > 1) {
    // Multiple candidates — don't guess, surface for review
    candidatePropertyIds = matchedProperties.map(p => p.id)
  }

  return {
    tier,
    confidence,
    score,
    signals,
    contactId,
    companyId,
    propertyId,
    candidatePropertyIds,
  }
}
