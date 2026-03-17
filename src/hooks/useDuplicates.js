/**
 * Proactive duplicate detection across contacts and companies.
 * Returns pairs of potential duplicates with match reason and confidence.
 */
import { useMemo } from 'react'
import { useCRM } from '../context/CRMContext'
import { fullName } from '../utils/helpers'

// Normalize a string for comparison — lowercase, strip punctuation, collapse spaces
function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

// Strip common company suffixes so "Acme LLC" == "Acme"
const SUFFIXES = /\b(llc|lp|inc|corp|co|ltd|group|partners|capital|advisors|fund|trust|management|real estate|realty|properties|property)\b\.?/gi
function normCompany(s) {
  return norm((s || '').replace(SUFFIXES, '')).replace(/\s+/g, ' ').trim()
}

// Levenshtein distance, capped at maxDist for performance
function lev(a, b, maxDist = 4) {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = i
    for (let j = 1; j <= b.length; j++) {
      const cur = Math.min(dp[j] + 1, prev + 1, dp[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      dp[j - 1] = prev
      prev = cur
    }
    dp[b.length] = prev
  }
  return dp[b.length]
}

function fuzzyMatch(a, b, threshold = 2) {
  const na = norm(a), nb = norm(b)
  if (!na || !nb) return false
  if (na === nb) return true
  return lev(na, nb, threshold) <= threshold
}

export function useDuplicates() {
  const { contacts, companies } = useCRM()

  const contactDuplicates = useMemo(() => {
    const pairs = []
    const seen = new Set()

    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const a = contacts[i], b = contacts[j]
        const key = [a.id, b.id].sort().join('-')
        if (seen.has(key)) continue

        const reasons = []
        let confidence = 0

        // Exact email match
        if (a.email && b.email && norm(a.email) === norm(b.email)) {
          reasons.push('Same email')
          confidence = Math.max(confidence, 95)
        }

        // Same last name + similar first name
        const lastMatch = a.lastName && b.lastName && norm(a.lastName) === norm(b.lastName)
        const firstMatch = a.firstName && b.firstName && fuzzyMatch(a.firstName, b.firstName, 2)
        if (lastMatch && firstMatch) {
          reasons.push('Same name')
          confidence = Math.max(confidence, 85)
        } else if (lastMatch && a.firstName && b.firstName && norm(a.firstName)[0] === norm(b.firstName)[0]) {
          reasons.push('Same last name, similar first name')
          confidence = Math.max(confidence, 60)
        }

        // Same phone
        const phoneA = (a.phone || a.mobile || '').replace(/\D/g, '')
        const phoneB = (b.phone || b.mobile || '').replace(/\D/g, '')
        if (phoneA.length >= 7 && phoneA === phoneB) {
          reasons.push('Same phone')
          confidence = Math.max(confidence, 80)
        }

        if (reasons.length > 0 && confidence >= 85) {
          seen.add(key)
          pairs.push({ id: key, entityType: 'contact', a, b, reasons, confidence })
        }
      }
    }
    return pairs.sort((x, y) => y.confidence - x.confidence)
  }, [contacts])

  const companyDuplicates = useMemo(() => {
    const pairs = []
    const seen = new Set()

    for (let i = 0; i < companies.length; i++) {
      for (let j = i + 1; j < companies.length; j++) {
        const a = companies[i], b = companies[j]
        const key = [a.id, b.id].sort().join('-')
        if (seen.has(key)) continue

        const reasons = []
        let confidence = 0

        // Normalized name match (strips LLC, Inc, etc.)
        const na = normCompany(a.name), nb = normCompany(b.name)
        if (na && nb) {
          if (na === nb) {
            reasons.push('Same name')
            confidence = Math.max(confidence, 90)
          } else if (fuzzyMatch(na, nb, 2)) {
            reasons.push('Similar name')
            confidence = Math.max(confidence, 65)
          }
        }

        // Same email domain (company-level)
        const domainA = (a.email || '').split('@')[1]?.toLowerCase()
        const domainB = (b.email || '').split('@')[1]?.toLowerCase()
        if (domainA && domainB && domainA === domainB) {
          reasons.push('Same email domain')
          confidence = Math.max(confidence, 70)
        }

        // Same website
        const siteA = norm(a.website || '').replace(/^(www\.|https?:\/\/)/, '')
        const siteB = norm(b.website || '').replace(/^(www\.|https?:\/\/)/, '')
        if (siteA && siteB && siteA === siteB) {
          reasons.push('Same website')
          confidence = Math.max(confidence, 85)
        }

        if (reasons.length > 0 && confidence >= 85) {
          seen.add(key)
          pairs.push({ id: key, entityType: 'company', a, b, reasons, confidence })
        }
      }
    }
    return pairs.sort((x, y) => y.confidence - x.confidence)
  }, [companies])

  return {
    contactDuplicates,
    companyDuplicates,
    totalCount: contactDuplicates.length + companyDuplicates.length,
  }
}
