/**
 * Proactive duplicate detection across contacts and companies.
 *
 * Scoring is ADDITIVE — multiple weaker signals combine to push confidence
 * higher than any single signal alone, preventing both false positives (a
 * shared phone line surfacing strangers) and false negatives (two entries for
 * the same person that differ on every individual field but match on several).
 *
 * Threshold: 85. Only pairs at or above 85% confidence are returned.
 */
import { useMemo } from 'react'
import { useCRM } from '../context/CRMContext'

const THRESHOLD = 85

// ─── String helpers ────────────────────────────────────────────────────────────

function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

// Strip common company suffixes so "Acme LLC" == "Acme"
const SUFFIXES = /\b(llc|lp|inc|corp|co|ltd|group|partners|capital|advisors|fund|trust|management|real estate|realty|properties|property)\b\.?/gi
function normCompany(s) {
  return norm((s || '').replace(SUFFIXES, '')).replace(/\s+/g, ' ').trim()
}

// Normalize a URL to bare domain + path for comparison
function normSite(s) {
  return norm(s || '').replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
}

// Take last 10 digits of a phone string — handles +1 country code variants
// e.g. "+1 (212) 555-1234" and "212-555-1234" both → "2125551234"
function normPhone(s) {
  const digits = (s || '').replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
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

// Collect all phone values from a contact across old and new fields
function contactPhones(c) {
  return [
    c.phone,
    c.mobile,
    ...(c.personalPhones || []),
    ...(c.sharedCellPhones || []),
  ].map(normPhone).filter(p => p.length >= 10)
}

// True if any phone from set A matches any phone from set B
function anyPhoneMatch(a, b) {
  const setA = new Set(contactPhones(a))
  if (!setA.size) return false
  return contactPhones(b).some(p => setA.has(p))
}

// ─── Scoring tables ────────────────────────────────────────────────────────────
//
// CONTACTS
//   Same email (exact)              → immediate 95, no further scoring needed
//   Same last + fuzzy first (≤2)    → +75  (strong primary)
//   Same last + first initial only  → +40  (weak primary, needs support)
//   Any phone match (10-digit norm) → +30  (supporting)
//   Same companyId                  → +15  (supporting)
//   Cap at 94 (email is definitive)
//
// Key combos:
//   Full name alone             = 75   (not shown — common names)
//   Full name + company         = 90 ✓
//   Full name + phone           = 105 → 94 ✓
//   Last + initial + phone      = 70   (not shown)
//   Last + initial + phone + co = 85 ✓
//
// COMPANIES
//   Exact normalized name        → +85  (strong primary, standalone sufficient)
//   Fuzzy normalized name (≤2)   → +55  (medium primary, needs support)
//   Same website (normalized)    → +30  (supporting)
//   Same phone (10-digit norm)   → +25  (supporting)
//   Same email domain            → +15  (supporting — only meaningful with a name signal)
//   Cap at 95
//
// Key combos:
//   Exact name alone        = 85 ✓
//   Fuzzy name alone        = 55   (not shown)
//   Fuzzy name + website    = 85 ✓
//   Fuzzy name + phone      = 80   (not shown — could be regional offices)
//   Fuzzy name + both       = 110 → 95 ✓
//   Same website alone      = 30   (not shown)

// ─── Hook ─────────────────────────────────────────────────────────────────────

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
        let score = 0

        // 1. Email — definitive, skip remaining signals
        const emailsA = [a.email, ...(a.personalEmails || []), ...(a.sharedEmails || [])].filter(Boolean).map(e => norm(e)).filter(Boolean)
        const emailsB = [b.email, ...(b.personalEmails || []), ...(b.sharedEmails || [])].filter(Boolean).map(e => norm(e)).filter(Boolean)
        if (emailsA.length && emailsB.length && emailsA.some(ea => emailsB.includes(ea))) {
          reasons.push('Same email')
          score = 95
        }

        if (score < 95) {
          // 2. Name
          const lastA = norm(a.lastName), lastB = norm(b.lastName)
          const firstA = norm(a.firstName), firstB = norm(b.firstName)
          const lastExact = lastA && lastB && lastA === lastB

          if (lastExact && firstA && firstB && lev(firstA, firstB, 2) <= 2) {
            reasons.push('Same name')
            score += 75
          } else if (lastExact && firstA && firstB && firstA[0] === firstB[0]) {
            reasons.push('Similar name')
            score += 40
          }

          // 3. Phone (any field, 10-digit normalized)
          if (anyPhoneMatch(a, b)) {
            reasons.push('Same phone')
            score += 30
          }

          // 4. Same company (supporting)
          if (a.companyId && b.companyId && a.companyId === b.companyId) {
            reasons.push('Same company')
            score += 15
          }

          score = Math.min(94, score)
        }

        const confidence = score
        if (reasons.length > 0 && confidence >= THRESHOLD) {
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
        let score = 0

        // 1. Name
        const na = normCompany(a.name), nb = normCompany(b.name)
        if (na && nb) {
          if (na === nb) {
            reasons.push('Same name')
            score += 85
          } else if (lev(na, nb, 2) <= 2) {
            reasons.push('Similar name')
            score += 55
          }
        }

        // 2. Website (supporting — strong enough to elevate a fuzzy name match)
        const siteA = normSite(a.website), siteB = normSite(b.website)
        if (siteA && siteB && siteA === siteB) {
          reasons.push('Same website')
          score += 30
        }

        // 3. Phone (supporting)
        const phoneA = normPhone(a.phone), phoneB = normPhone(b.phone)
        if (phoneA.length >= 10 && phoneA === phoneB) {
          reasons.push('Same phone')
          score += 25
        }

        // 4. Email domain — only meaningful when a name signal is already present
        if (score >= 55) {
          const domainA = (a.email || '').split('@')[1]?.toLowerCase()
          const domainB = (b.email || '').split('@')[1]?.toLowerCase()
          if (domainA && domainB && domainA === domainB) {
            reasons.push('Same domain')
            score += 15
          }
        }

        const confidence = Math.min(95, score)
        if (reasons.length > 0 && confidence >= THRESHOLD) {
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
