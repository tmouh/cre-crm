/**
 * Deal Activity Sync Orchestrator
 *
 * Fetches recent outbound sent messages, scores them with the deal activity
 * scoring pipeline, and creates or updates deal_activity records in Supabase.
 *
 * Called after each Microsoft sync cycle (every 5 min, or on webhook trigger).
 * Always best-effort — errors are caught and logged, never re-thrown.
 */

import { getSentMessages, getMessageAttachmentsWithSource } from './microsoft'
import { db } from '../lib/supabase'
import { scoreEmail } from '../lib/dealActivityScoring'

// Track message IDs scored in this browser session to avoid re-processing
// on rapid sync cycles. Cleared on page reload (intentional).
const processedMessageIds = new Set()

/**
 * Main sync entry point. Call after each Microsoft sync completes.
 *
 * @param {object} crmData - { contacts, companies, properties, addDealActivity, updateDealActivity }
 */
export async function syncDealActivities(crmData) {
  const { contacts, companies, properties, addDealActivity, updateDealActivity } = crmData

  // Skip if CRM data isn't loaded yet
  if (!contacts?.length && !companies?.length) return

  try {
    // Fetch sent messages from the last 48 hours
    const sentMessages = await getSentMessages(50, 2)
    if (!sentMessages.length) return

    for (const message of sentMessages) {
      const conversationId = message.conversationId
      if (!conversationId) continue

      // Skip messages already processed in this session
      if (processedMessageIds.has(message.id)) continue
      processedMessageIds.add(message.id)

      // ── Check if this thread already has a deal_activity ─────────────────
      const existing = await db.dealActivities.getByConversationId(conversationId)

      if (existing) {
        // Thread is known — update counts and last-activity metadata only.
        // Never modify dismissed or manually-confirmed records.
        if (existing.status !== 'dismissed') {
          await updateDealActivity(existing.id, {
            messageCount: (existing.messageCount || 1) + 1,
            outboundCount: (existing.outboundCount || 0) + 1,
            lastMessageAt: message.sentDateTime || new Date().toISOString(),
            lastDirection: 'outbound',
          }).catch(() => {})
        }
        continue
      }

      // ── New thread — run the scoring pipeline ─────────────────────────────
      let attachments = []
      if (message.hasAttachments) {
        attachments = await getMessageAttachmentsWithSource(message.id)
      }

      const result = scoreEmail(
        message,
        attachments,
        { contacts, companies, properties },
      )

      // Tier 3 → skip entirely (personal / irrelevant)
      if (result.tier === 3) continue

      // Tier 1 → auto  |  Tier 2 → needs_review
      await addDealActivity({
        conversationId,
        subject: message.subject || '(no subject)',
        contactId: result.contactId,
        companyId: result.companyId,
        propertyId: result.propertyId,
        candidatePropertyIds: result.candidatePropertyIds,
        status: result.tier === 1 ? 'auto' : 'needs_review',
        confidence: result.confidence,
        relevanceSignals: result.signals,
        messageCount: 1,
        outboundCount: 1,
        inboundCount: 0,
        firstMessageAt: message.sentDateTime || new Date().toISOString(),
        lastMessageAt: message.sentDateTime || new Date().toISOString(),
        lastDirection: 'outbound',
      }).catch(err => {
        // Unique violation on conversation_id = another session beat us to it, safe to ignore
        if (!err?.message?.includes('unique') && !err?.message?.includes('duplicate')) {
          console.warn('[DealActivitySync] insert failed:', err.message)
        }
      })
    }
  } catch (err) {
    // Best-effort — never surface to UI
    console.warn('[DealActivitySync] sync error:', err.message)
  }
}

/**
 * Called when an inbound message arrives for an already-qualified thread.
 * Updates the deal_activity to reflect the reply.
 *
 * @param {string} conversationId
 * @param {object} updateDealActivity - from CRMContext
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
