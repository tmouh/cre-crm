/**
 * Deal Activity Sync Orchestrator
 *
 * Scans Sent Items (outbound) and Inbox (inbound) for emails that qualify
 * as deal-related activity under two conditions:
 *
 *   Condition A — Email has an OM/UW folder attachment (SharePoint) or a file
 *                 with an OM/UW-style filename.
 *   Condition B — A direct recipient (outbound) or sender (inbound) is a CRM
 *                 contact linked to a deal with an active status.
 *
 * No back-searching: a cutoff timestamp is persisted in localStorage so only
 * emails arriving after the previous sync are scored. On first run, the cutoff
 * is set to "now" and no historical email is processed.
 *
 * Runs after every Microsoft sync cycle. Always best-effort.
 */

import { getSentMessages, getInboxMessages, getMessageAttachmentsWithSource } from './microsoft'
import { db } from '../lib/supabase'
import { scoreEmail } from '../lib/dealActivityScoring'

const LAST_SCORED_KEY = 'ms_last_activity_scored'

// Track message IDs processed in this browser session to avoid re-scoring
// on rapid back-to-back sync cycles within the same page load.
const processedMessageIds = new Set()

/**
 * Main sync entry point. Called after each Microsoft sync completes.
 * @param {object} crmData - { contacts, companies, properties, addDealActivity, updateDealActivity }
 */
export async function syncDealActivities(crmData) {
  const { contacts, companies, properties } = crmData

  // Skip if CRM data isn't loaded yet
  if (!contacts?.length && !companies?.length) return

  // ── Cutoff: never score emails older than the last run ───────────────────
  const stored = localStorage.getItem(LAST_SCORED_KEY)
  const now    = new Date()

  if (!stored) {
    // First run — establish baseline at "now" so we don't back-search
    localStorage.setItem(LAST_SCORED_KEY, now.toISOString())
    return
  }

  const cutoff = new Date(stored)
  // Advance the cutoff before fetching so a concurrent session doesn't overlap
  localStorage.setItem(LAST_SCORED_KEY, now.toISOString())

  try {
    const [sentMessages, inboxMessages] = await Promise.all([
      getSentMessages(50, 2),
      getInboxMessages(50, 2),
    ])

    // Filter to only messages newer than the cutoff
    const isNew = (msg) => {
      const ts = msg.sentDateTime || msg.receivedDateTime
      return ts ? new Date(ts) > cutoff : false
    }

    // Process outbound first so threads started by us are seeded before
    // inbound replies from the same window update them.
    await processBatch(sentMessages.filter(isNew),  'outbound', crmData)
    await processBatch(inboxMessages.filter(isNew), 'inbound',  crmData)
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

    // ── New thread — fetch attachments and run scoring ───────────────────────
    let attachments = []
    if (message.hasAttachments) {
      attachments = await getMessageAttachmentsWithSource(message.id).catch(() => [])
    }

    const result = scoreEmail(message, attachments, crmData, direction)

    // Tier 3 → excluded
    if (result.tier === 3) continue

    const timestamp = direction === 'inbound'
      ? (message.receivedDateTime || new Date().toISOString())
      : (message.sentDateTime     || new Date().toISOString())

    await addDealActivity({
      conversationId,
      subject:              message.subject || '(no subject)',
      contactId:            result.contactId,
      companyId:            result.companyId,
      propertyId:           result.propertyId,
      candidatePropertyIds: result.candidatePropertyIds,
      status:               'auto',
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
