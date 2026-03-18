/**
 * Intelligence hooks for relationship health, deal momentum,
 * staleness detection, and suggested follow-ups.
 */

import { useMemo, useState, useEffect } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { useCRM } from '../context/CRMContext'
import { db } from '../lib/supabase'

const TODAY = () => new Date()

/**
 * Calculate relationship health score (0-100) for a contact.
 * Factors: recency of last touch, frequency of activity, depth (types of interaction), email volume.
 */
function contactHealthScore(contact, contactActivities, contactReminders, contactEmails) {
  if (contact.healthOverride != null) return contact.healthOverride
  const now = TODAY()
  let score = 50 // baseline

  // Recency (last contact)
  if (contact.lastContacted) {
    const days = differenceInDays(now, parseISO(contact.lastContacted))
    if (days <= 7) score += 30
    else if (days <= 14) score += 25
    else if (days <= 30) score += 15
    else if (days <= 60) score += 5
    else if (days <= 90) score -= 10
    else score -= 25
  } else {
    score -= 20 // never contacted
  }

  // Activity frequency (last 90 days) — pre-filtered by caller
  const recentActivities = (contactActivities || []).filter(a =>
    a.createdAt && differenceInDays(now, parseISO(a.createdAt)) <= 90
  )
  if (recentActivities.length >= 10) score += 15
  else if (recentActivities.length >= 5) score += 10
  else if (recentActivities.length >= 2) score += 5
  else if (recentActivities.length === 0) score -= 10

  // Depth: variety of interaction types
  const types = new Set(recentActivities.map(a => a.type))
  score += Math.min(types.size * 3, 12)

  // Pending tasks (positive signal — means we're engaged)
  const pendingReminders = (contactReminders || []).filter(r => r.status === 'pending')
  if (pendingReminders.length > 0) score += 5

  // Email interactions from Outlook (already limited to recent by getRecent)
  const emailCount = (contactEmails || []).length
  if (emailCount >= 10) score += 12
  else if (emailCount >= 5) score += 8
  else if (emailCount >= 1) score += 4

  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate deal momentum score (0-100).
 * Factors: stage progression speed, recent activity, staleness.
 */
function dealMomentumScore(deal, activities, reminders) {
  if (deal.momentumOverride != null) return deal.momentumOverride
  const now = TODAY()
  let score = 50

  // Stage — later stages are higher momentum
  const stageScores = {
    prospect: 0, engaged: 10, 'under-loi': 20, 'under-contract': 30,
    'due-diligence': 35, closed: 50, dead: -30,
  }
  score += stageScores[deal.status] || 0

  // Recent stage change
  if (deal.stageChangedAt) {
    const days = differenceInDays(now, parseISO(deal.stageChangedAt))
    if (days <= 7) score += 15
    else if (days <= 14) score += 10
    else if (days <= 30) score += 5
    else if (days > 60) score -= 15
  }

  // Recent activity
  const recentActivities = activities.filter(a =>
    a.propertyId === deal.id &&
    a.createdAt &&
    differenceInDays(now, parseISO(a.createdAt)) <= 30
  )
  if (recentActivities.length >= 5) score += 15
  else if (recentActivities.length >= 2) score += 8
  else if (recentActivities.length === 0) score -= 10

  // Pending tasks
  const pendingReminders = reminders.filter(r => r.propertyId === deal.id && r.status === 'pending')
  if (pendingReminders.length > 0) score += 5

  return Math.max(0, Math.min(100, score))
}

function healthLabel(score) {
  if (score >= 75) return 'strong'
  if (score >= 50) return 'healthy'
  if (score >= 25) return 'cooling'
  return 'cold'
}

function momentumLabel(score) {
  if (score >= 75) return 'hot'
  if (score >= 50) return 'active'
  if (score >= 25) return 'slow'
  return 'stalled'
}

export function useIntelligence() {
  const { contacts, companies, properties, activities, reminders } = useCRM()
  const [emailInteractions, setEmailInteractions] = useState([])

  useEffect(() => {
    db.emailInteractions.getRecent(90)
      .then(setEmailInteractions)
      .catch(() => {})
  }, [])

  const contactHealth = useMemo(() => {
    // Build O(1) lookup maps so scoring is O(n) total instead of O(n²)
    const actsByContact = new Map()
    for (const a of activities) {
      if (!a.contactId) continue
      if (!actsByContact.has(a.contactId)) actsByContact.set(a.contactId, [])
      actsByContact.get(a.contactId).push(a)
    }
    const remindersByContact = new Map()
    for (const r of reminders) {
      if (!r.contactId) continue
      if (!remindersByContact.has(r.contactId)) remindersByContact.set(r.contactId, [])
      remindersByContact.get(r.contactId).push(r)
    }
    const emailsByContact = new Map()
    for (const e of emailInteractions) {
      if (!e.contactId) continue
      if (!emailsByContact.has(e.contactId)) emailsByContact.set(e.contactId, [])
      emailsByContact.get(e.contactId).push(e)
    }

    return contacts.map(c => {
      const hs = contactHealthScore(
        c,
        actsByContact.get(c.id),
        remindersByContact.get(c.id),
        emailsByContact.get(c.id),
      )
      return { ...c, healthScore: hs, healthLabel: healthLabel(hs) }
    })
  }, [contacts, activities, reminders, emailInteractions])

  const dealMomentum = useMemo(() => {
    return properties
      .filter(p => p.status !== 'closed' && p.status !== 'dead')
      .map(d => ({
        ...d,
        momentumScore: dealMomentumScore(d, activities, reminders),
      })).map(d => ({
        ...d,
        momentumLabel: momentumLabel(d.momentumScore),
      }))
  }, [properties, activities, reminders])

  const staleContacts = useMemo(() => {
    return contactHealth
      .filter(c => c.healthLabel === 'cold' || c.healthLabel === 'cooling')
      .sort((a, b) => a.healthScore - b.healthScore)
  }, [contactHealth])

  const hotDeals = useMemo(() => {
    return dealMomentum
      .filter(d => d.momentumLabel === 'hot' || d.momentumLabel === 'active')
      .sort((a, b) => b.momentumScore - a.momentumScore)
  }, [dealMomentum])

  const stalledDeals = useMemo(() => {
    return dealMomentum
      .filter(d => d.momentumLabel === 'stalled' || d.momentumLabel === 'slow')
      .sort((a, b) => a.momentumScore - b.momentumScore)
  }, [dealMomentum])

  const suggestedFollowUps = useMemo(() => {
    const now = TODAY()
    const suggestions = []

    // Contacts going stale (30-90 days without contact)
    contacts.forEach(c => {
      if (!c.lastContacted) return
      const days = differenceInDays(now, parseISO(c.lastContacted))
      if (days >= 30 && days < 90) {
        const hasPending = reminders.some(r => r.contactId === c.id && r.status === 'pending')
        if (!hasPending) {
          suggestions.push({
            type: 'stale-contact',
            entity: c,
            entityType: 'contact',
            reason: `No contact in ${days} days`,
            priority: days >= 60 ? 'high' : 'medium',
          })
        }
      }
    })

    // Deals without recent activity
    properties.filter(p => p.status !== 'closed' && p.status !== 'dead').forEach(d => {
      const recentAct = activities.filter(a =>
        a.propertyId === d.id &&
        a.createdAt &&
        differenceInDays(now, parseISO(a.createdAt)) <= 14
      )
      if (recentAct.length === 0) {
        const hasPending = reminders.some(r => r.propertyId === d.id && r.status === 'pending')
        if (!hasPending) {
          suggestions.push({
            type: 'inactive-deal',
            entity: d,
            entityType: 'deal',
            reason: 'No recent activity',
            priority: ['under-loi', 'under-contract', 'due-diligence'].includes(d.status) ? 'high' : 'medium',
          })
        }
      }
    })

    return suggestions.sort((a, b) => {
      const pw = { high: 3, medium: 2, low: 1 }
      return (pw[b.priority] || 0) - (pw[a.priority] || 0)
    })
  }, [contacts, properties, activities, reminders])

  // Pipeline analytics
  const pipelineStats = useMemo(() => {
    const activeDeals = properties.filter(p => p.status !== 'closed' && p.status !== 'dead')
    const totalValue = activeDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0)
    const byStage = {}
    activeDeals.forEach(d => {
      if (!byStage[d.status]) byStage[d.status] = { count: 0, value: 0 }
      byStage[d.status].count++
      byStage[d.status].value += Number(d.dealValue) || 0
    })
    return { activeDeals: activeDeals.length, totalValue, byStage }
  }, [properties])

  // Communication analytics
  const communicationStats = useMemo(() => {
    const now = TODAY()
    const last30 = activities.filter(a =>
      a.createdAt && differenceInDays(now, parseISO(a.createdAt)) <= 30
    )
    const emailLast30 = emailInteractions.filter(e =>
      e.receivedAt && differenceInDays(now, parseISO(e.receivedAt)) <= 30
    )
    const byType = {}
    last30.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + 1
    })
    if (emailLast30.length > 0) {
      byType['outlook-email'] = emailLast30.length
    }
    return { totalLast30: last30.length + emailLast30.length, byType }
  }, [activities, emailInteractions])

  return {
    contactHealth,
    dealMomentum,
    staleContacts,
    hotDeals,
    stalledDeals,
    suggestedFollowUps,
    pipelineStats,
    communicationStats,
  }
}
