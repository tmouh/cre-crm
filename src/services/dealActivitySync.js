/**
 * Deal Activity Sync Orchestrator
 *
 * Scans both Sent Items (outbound) and Inbox (inbound) for emails that qualify
 * as deal-related activity under the two-gate rule:
 *
 *   Gate 1 — A deal's address or name appears in the email subject/body.
 *   Gate 2 — A contact linked to that deal is identified in the email:
 *             • Outbound: contact email in To field (CC excluded)
 *             • Inbound:  contact email matches the From field
 *             • Fallback: contact's full name appears in subject/body
 *
 * Both gates must pass for the same deal. Runs after every Microsoft sync cycle.
 * Always best-effort — errors are caught and logged, never re-thrown.
 */

import { getSentMessages, getInboxMessages, getMessageAttachmentsWithSource } from './microsoft'
import { db } from '../lib/supabase'
import { scoreEmail } from '../lib/dealActivityScoring'

// Track message IDs processed in this browser session to avoid re-scoring
// on rapid back-to-back sync cycles. Cleared on page reload (intentional).
const processedMessageIds = new Set()

/**
 * Main sync entry point. Called after each Microsoft sync completes.
 * @param {object} crmData - { contacts, companies, properties, addDealActivity, updateDealActivity }
 */
export async function syncDealActivities(crmData) {
  const { contacts, companies, properties } = crmData

  // Skip if CRM data isn't loaded yet
  if (!contacts?.length && !companies?.length) return

  try {
    const [sentMessages, inboxMessages] = await Promise.all([
      getSentMessages(50, 2),
      getInboxMessages(50, 2),
    ])

    // Process outbound first so threads started by us are seeded before
    // inbound replies from the same 48-hour window update them.
    await processBatch(sentMessages,  'outbound', crmData)
    await processBatch(inboxMessages, 'inbound',  crmData)
  } catch (err) {
    console.warn('[DealActivitySync] sync error:', err?.message)
  }
}

/**
 * Score and upsert a batch of messages in the given direction.
 */
async function processBatch(messages, direction, crmData) {
  const { addDealActivity, updateDealActivity } = crmData

  for (const message of messages) {
    const conversationId = message.conversationId
    if (!conversationId) continue

    // Skip if already processed in this browser session
    if (processedMessageIds.has(message.id)) continue
    processedMessageIds.add(message.id)

    // ── Check for existing thread record ────────────────────────────────────
    const existing = await db.dealActivities.getByConversationId(conversationId)

    if (existing) {
      // Thread is known — update counts only; never touch dismissed or confirmed.
      if (existing.status !== 'dismissed') {
        const timestamp = direction === 'inbound'
          ? (message.receivedDateTime || new Date().toISOString())
          : (message.sentDateTime     || new Date().toISOString())

        await updateDealActivity(existing.id, {
          messageCount:  (existing.messageCount  || 1) + 1,
          outboundCount: direction === 'outbound' ? (existing.outboundCount || 0) + 1 : existing.outboundCount,
          inboundCount:  direction === 'inbound'  ? (existing.inboundCount  || 0) + 1 : existing.inboundCount,
          lastMessageAt: timestamp,
          lastDirection: direction,
        }).catch(() => {})
      }
      continue
    }

    // ── New thread — run the scoring pipeline ───────────────────────────────
    let attachments = []
    if (message.hasAttachments) {
      attachments = await getMessageAttachmentsWithSource(message.id).catch(() => [])
    }

    const result = scoreEmail(message, attachments, crmData, direction)

    // Tier 3 → excluded entirely
    if (result.tier === 3) continue

    const timestamp = direction === 'inbound'
      ? (message.receivedDateTime || new Date().toISOString())
      : (message.sentDateTime     || new Date().toISOString())

    // Tier 1 → auto  |  Tier 2 → needs_review
    await addDealActivity({
      conversationId,
      subject:              message.subject || '(no subject)',
      contactId:            result.contactId,
      companyId:            result.companyId,
      propertyId:           result.propertyId,
      candidatePropertyIds: result.candidatePropertyIds,
      status:               result.tier === 1 ? 'auto' : 'needs_review',
      confidence:           result.confidence,
      relevanceSignals:     result.signals,
      messageCount:         1,
      outboundCount:        direction === 'outbound' ? 1 : 0,
      inboundCount:         direction === 'inbound'  ? 1 : 0,
      firstMessageAt:       timestamp,
      lastMessageAt:        timestamp,
      lastDirection:        direction,
    }).catch(err => {
      // Unique violation = another session beat us to it, safe to ignore
      if (!err?.message?.includes('unique') && !err?.message?.includes('duplicate')) {
        console.warn(`[DealActivitySync] ${direction} insert failed:`, err?.message)
      }
    })
  }
}

/**
 * Called when an inbound webhook notification arrives for an already-qualified thread.
 * @param {string} conversationId
 * @param {Function} updateDealActivity - from CRMContext
 */
export async function recordInboundThreadReply(conversationId, updateDealActivity) {
  try {
    const existing = await db.dealActivities.getByConversationId(conversationId)
    if (!existing || existing.status === 'dismissed') return
    await updateDealActivity(existing.id, {
      messageCount: (existing.messageCount || 1) + 1,
      inboundCount: (existing.inboundCount || 0) + 1,
      lastMessageAt: new Date().toISOString(),
      lastDirection: 'inbound',
    })
  } catch {
    // Best-effort
  }
}
