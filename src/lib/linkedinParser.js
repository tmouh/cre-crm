// Best-effort parser for text copied from a LinkedIn profile page.
// LinkedIn has no consistent machine-readable copy format, so this is
// heuristic-based and will handle the most common layout.

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_HEADERS = new Set([
  'About', 'Experience', 'Education',
  'Licenses & Certifications', 'Licenses and Certifications',
  'Languages', 'Organizations', 'Interests',
  'Volunteer Experience', 'Volunteer Work', 'Skills',
  'Recommendations', 'Courses', 'Projects', 'Publications',
  'Honors & Awards', 'Awards', 'Patents', 'Test Scores',
  'Causes', 'Accomplishments', 'Featured',
])

// Sub-headers inside the Interests section
const INTEREST_SUBSECTIONS = new Set([
  'Companies', 'Influencers', 'Groups', 'Schools', 'Newsletters',
])

const EMPLOYMENT_TYPES = new Set([
  'Full-time', 'Part-time', 'Self-employed', 'Freelance',
  'Contract', 'Internship', 'Apprenticeship', 'Seasonal',
])

// Lines that are LinkedIn UI noise, not profile content
const NOISE_RE = /^(?:Follow|Connect|Message|More|Show \d|View \d|\d+ follower|\d+ connection|Open to|Contact info|People also viewed|Pronouns:|Report this profile|Save to PDF|Add profile section|Enhance profile)/i

const MONTH_MAP = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

// Matches "Jan 2020", "January 2020", "2020"
const DATE_TOKEN = '(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+)?\\d{4}'
const DATE_RANGE_RE = new RegExp(
  `^(${DATE_TOKEN})\\s*[–—-]\\s*(${DATE_TOKEN}|Present)(?:\\s*·.*)?$`, 'i'
)

const PROFICIENCY_KEYWORDS = [
  'native or bilingual', 'elementary', 'limited working',
  'professional working', 'full professional', 'native', 'bilingual',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNoise(line) {
  return NOISE_RE.test(line) || line.length === 0
}

function isEmploymentType(line) {
  // "Full-time", "Full-time · 3 yrs", "Contract"
  return EMPLOYMENT_TYPES.has(line.split('·')[0].trim())
}

function isDateRange(line) {
  return DATE_RANGE_RE.test(line.trim())
}

function isProficiency(line) {
  const lower = line.toLowerCase()
  return PROFICIENCY_KEYWORDS.some(k => lower.startsWith(k))
}

function parseDate(str) {
  if (!str) return null
  const s = str.trim()
  if (/^present$/i.test(s)) return null

  // "Jan 2020" or "January 2020"
  const full = s.match(/^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})$/i)
  if (full) {
    const month = MONTH_MAP[full[1].toLowerCase().slice(0, 3)]
    return { month, year: parseInt(full[2]) }
  }

  // "2020"
  const year = s.match(/^(\d{4})$/)
  if (year) return { month: null, year: parseInt(year[1]) }

  return null
}

function parseDateRange(line) {
  const m = line.trim().match(DATE_RANGE_RE)
  if (!m) return { starts_at: null, ends_at: null }
  return {
    starts_at: parseDate(m[1]),
    ends_at: parseDate(m[2]),
  }
}

// Given a block of consecutive lines, group them into entries by using date
// range lines as anchors.  Returns array of { preLines, starts_at, ends_at, postLines }.
function groupByDateRanges(lines) {
  const clean = lines.filter(l => !isNoise(l) && !isEmploymentType(l))
  const dateIdxs = clean.reduce((acc, l, i) => { if (isDateRange(l)) acc.push(i); return acc }, [])

  if (dateIdxs.length === 0) return []

  return dateIdxs.map((di, d) => {
    const nextDi = dateIdxs[d + 1] ?? clean.length

    // Pre: walk backwards from the date line, collect up to 2 non-date lines
    const preLines = []
    for (let j = di - 1; j >= 0 && preLines.length < 2; j--) {
      if (isDateRange(clean[j])) break
      preLines.unshift(clean[j])
    }

    // Post: lines between this date and where the next entry's pre-lines begin
    // Estimate: the next entry uses ~2 lines of pre, so stop at nextDi - 2
    const postEnd = d + 1 < dateIdxs.length ? Math.max(di + 1, nextDi - 2) : clean.length
    const postLines = clean.slice(di + 1, postEnd)

    return { preLines, postLines, ...parseDateRange(clean[di]) }
  })
}

// ─── Section parsers ─────────────────────────────────────────────────────────

function parseHeader(lines) {
  // Lines before the first section header: name, headline, location+connections
  const clean = lines.filter(l => !isNoise(l))
  const full_name = clean[0] ?? null
  const headline  = clean[1] ?? null

  // Location is often "City, State · X connections · Contact info"
  const locLine = clean.find(l => l.includes('·') || /,\s+[A-Z]/.test(l))
  const location = locLine ? locLine.split('·')[0].trim() : null

  return { full_name, headline, location }
}

function parseExperience(lines) {
  return groupByDateRanges(lines).map(({ preLines, postLines, starts_at, ends_at }) => {
    const title   = preLines[preLines.length - 1] ?? null
    const company = preLines.length > 1 ? preLines[preLines.length - 2] : null

    // First post line is likely location if it's short and has no sentence punctuation
    let location = null
    let rest = postLines
    if (postLines.length > 0 && postLines[0].length < 65 && !/[.!?]/.test(postLines[0])) {
      location = postLines[0]
      rest = postLines.slice(1)
    }

    return { title, company, starts_at, ends_at, location, description: rest.join('\n') || null, logo_url: null }
  })
}

function parseEducation(lines) {
  return groupByDateRanges(lines).map(({ preLines, postLines, starts_at, ends_at }) => {
    const school = preLines[preLines.length - 1] ?? null
    const degreeRaw = preLines.length > 1 ? preLines[preLines.length - 2] : null

    // "Bachelor of Science, Real Estate Finance" or "B.S." etc
    let degree_name = null
    let field_of_study = null
    if (degreeRaw) {
      const parts = degreeRaw.split(/,\s*/)
      degree_name    = parts[0] ?? null
      field_of_study = parts[1] ?? null
    }

    // "Grade: X" or "Activities and societies: ..."
    const grade = postLines.find(l => /^grade:/i.test(l))?.replace(/^grade:\s*/i, '') ?? null
    const activities = postLines.find(l => /^activities/i.test(l))?.replace(/^activities.*?:\s*/i, '') ?? null
    const description = postLines.filter(l => !l.match(/^grade:/i) && !l.match(/^activities/i)).join('\n') || null

    return { school, degree_name, field_of_study, starts_at, ends_at, grade, activities_and_societies: activities, description, logo_url: null }
  })
}

function parseCertifications(lines) {
  const clean = lines.filter(l => !isNoise(l))
  const entries = []
  let i = 0

  while (i < clean.length) {
    const name = clean[i]
    if (!name) { i++; continue }

    let authority = null
    let starts_at = null
    let ends_at = null
    let license_number = null

    i++
    // Next non-date, non-"Issued" line is the issuing org
    if (i < clean.length && !isDateRange(clean[i]) && !/^issued/i.test(clean[i])) {
      authority = clean[i++]
    }
    // "Issued Jan 2021 · Expires Jan 2024" or "Issued Jan 2021 · No Expiration Date"
    if (i < clean.length && /^issued/i.test(clean[i])) {
      const issuedLine = clean[i++]
      const dateMatch = issuedLine.match(/issued\s+([\w\s]+?)(?:\s*·\s*(?:expires?\s+([\w\s]+)|no expir\w+))?$/i)
      if (dateMatch) {
        starts_at = parseDate(dateMatch[1])
        ends_at   = dateMatch[2] ? parseDate(dateMatch[2]) : null
      }
    }
    // "Credential ID XXXXX"
    if (i < clean.length && /^credential id/i.test(clean[i])) {
      license_number = clean[i++].replace(/^credential id\s*/i, '')
    }

    entries.push({ name, authority, starts_at, ends_at, license_number })
  }

  return entries
}

function parseLanguages(lines) {
  const clean = lines.filter(l => !isNoise(l))
  const result = []
  let i = 0

  while (i < clean.length) {
    const name = clean[i++]
    if (!name) continue

    let proficiency = null
    if (i < clean.length && isProficiency(clean[i])) {
      // Normalize "Native or bilingual proficiency" → "Native or bilingual"
      proficiency = clean[i++].replace(/\s+proficiency$/i, '').trim()
    }

    result.push({ name, proficiency })
  }

  return result
}

function parseOrganizations(lines) {
  return groupByDateRanges(lines).map(({ preLines, postLines, starts_at, ends_at }) => {
    const org_name    = preLines[preLines.length - 1] ?? null
    const title       = preLines.length > 1 ? preLines[preLines.length - 2] : null
    const description = postLines.join('\n') || null
    return { org_name, title, starts_at, ends_at, description }
  })
}

function parseInterests(lines) {
  // LinkedIn interests section has sub-headers like "Companies", "Influencers", etc.
  // Just collect everything that isn't a sub-header as a plain interest string.
  return lines
    .filter(l => !isNoise(l) && !INTEREST_SUBSECTIONS.has(l))
    .map(l => l.trim())
    .filter(Boolean)
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function parseLinkedInText(rawText) {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  // Split into sections
  const sectionBuckets = {}
  let current = '__header__'
  sectionBuckets[current] = []

  for (const line of lines) {
    if (SECTION_HEADERS.has(line)) {
      // Normalise the two cert header variants
      current = line === 'Licenses and Certifications' ? 'Licenses & Certifications' : line
      sectionBuckets[current] = sectionBuckets[current] ?? []
    } else {
      sectionBuckets[current] = [...(sectionBuckets[current] ?? []), line]
    }
  }

  const g = (name) => sectionBuckets[name] ?? []

  const { full_name, headline, location } = parseHeader(g('__header__'))

  // Split location "City, State, Country" into parts (best-effort)
  const locParts = location ? location.split(',').map(s => s.trim()) : []
  const city            = locParts[0] ?? null
  const state           = locParts[1] ?? null
  const country_full_name = locParts[2] ?? null

  const langs = parseLanguages(g('Languages'))

  return {
    full_name,
    headline,
    city,
    state,
    country_full_name,
    profile_pic_url: null,
    follower_count: null,
    summary:                    g('About').filter(l => !isNoise(l)).join('\n') || null,
    experiences:                parseExperience(g('Experience')),
    education:                  parseEducation(g('Education')),
    certifications:             parseCertifications(g('Licenses & Certifications')),
    languages:                  [],
    languages_and_proficiencies: langs,
    accomplishment_organisations: parseOrganizations(g('Organizations')),
    interests:                  parseInterests(g('Interests')),
  }
}
