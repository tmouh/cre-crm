// Vercel Serverless Function — LinkedIn profile enrichment via PDL
// Keeps the PDL API key server-side (set PDL_API_KEY in Vercel env vars)

export default async function handler(req, res) {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { url } = req.query
  if (!url) {
    return res.status(400).json({ error: 'Missing "url" query parameter' })
  }

  const apiKey = process.env.PDL_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'PDL_API_KEY not configured on server' })
  }

  // Normalize the LinkedIn URL
  let profileUrl = url.trim()
  if (!profileUrl.startsWith('http')) {
    profileUrl = `https://${profileUrl}`
  }
  // Strip trailing slash
  profileUrl = profileUrl.replace(/\/+$/, '')

  try {
    const pdlRes = await fetch(
      `https://api.peopledatalabs.com/v5/person/enrich?profile=${encodeURIComponent(profileUrl)}&min_likelihood=3`,
      {
        headers: {
          'X-Api-Key': apiKey,
          'Accept': 'application/json',
        },
      }
    )

    if (pdlRes.status === 404 || pdlRes.status === 422) {
      return res.status(404).json({ error: 'Profile not found. Check the LinkedIn URL and try again.' })
    }

    if (pdlRes.status === 402) {
      return res.status(402).json({ error: 'PDL credit limit reached. Free tier allows 100 enrichments/month.' })
    }

    if (pdlRes.status === 429) {
      return res.status(429).json({ error: 'Rate limited. Please wait a moment and try again.' })
    }

    if (!pdlRes.ok) {
      const text = await pdlRes.text()
      return res.status(pdlRes.status).json({ error: `PDL API error: ${text}` })
    }

    const pdl = await pdlRes.json()
    const person = pdl.data || pdl

    // Build headline from primary experience if PDL doesn't return one
    const primaryExp = (person.experience || []).find(e => e.is_primary) || (person.experience || [])[0]
    const builtHeadline = person.headline
      || (primaryExp ? `${titleCase(primaryExp.title?.name || primaryExp.title || '')} at ${titleCase(primaryExp.company?.name || primaryExp.company || '')}` : null)

    // Extract the fields we care about — keep payload lean
    // All text is title-cased here so the frontend doesn't have to
    const profile = {
      full_name: titleCase(person.full_name) || null,
      headline: titleCase(builtHeadline) || null,
      summary: person.summary || null,
      industry: titleCase(person.industry) || null,
      location_name: titleCase(person.location_name) || null,
      profile_pic_url: person.profile_pic_url || null,
      linkedin_url: person.linkedin_url || null,
      follower_count: person.follower_count || null,
      experiences: (person.experience || []).map(exp => ({
        title: titleCase(exp.title?.name || exp.title) || null,
        company: titleCase(exp.company?.name || exp.company) || null,
        company_linkedin_url: exp.company?.linkedin_url || null,
        logo_url: exp.company?.logo_url || null,
        location: titleCase(exp.location_name) || null,
        description: exp.description || null,
        starts_at: exp.start_date ? parsePdlDate(exp.start_date) : null,
        ends_at: exp.end_date ? parsePdlDate(exp.end_date) : null,
        is_primary: exp.is_primary || false,
      })),
      education: (person.education || []).map(edu => ({
        school: titleCase(edu.school?.name || edu.school) || null,
        logo_url: edu.school?.logo_url || null,
        degree_name: cleanDegree(edu.degrees) || null,
        field_of_study: (edu.majors || []).map(m => titleCase(m)).join(', ') || null,
        starts_at: edu.start_date ? parsePdlDate(edu.start_date) : null,
        ends_at: edu.end_date ? parsePdlDate(edu.end_date) : null,
        description: edu.summary || null,
        gpa: edu.gpa || null,
      })),
      certifications: (person.certifications || []).map(cert => ({
        name: titleCase(cert.name) || null,
        authority: titleCase(cert.organization) || null,
        starts_at: cert.start_date ? parsePdlDate(cert.start_date) : null,
        ends_at: cert.end_date ? parsePdlDate(cert.end_date) : null,
      })),
      languages: (person.languages || []).map(lang => ({
        name: titleCase(typeof lang === 'string' ? lang : lang.name) || null,
        proficiency: null,
      })),
      skills: (person.skills || []).map(s => titleCase(typeof s === 'string' ? s : s.name) || null).filter(Boolean),
      interests: (person.interests || []).map(i => titleCase(typeof i === 'string' ? i : i.name) || null).filter(Boolean),
      enriched_at: new Date().toISOString(),
    }

    return res.status(200).json(profile)
  } catch (err) {
    console.error('LinkedIn enrichment error:', err)
    return res.status(500).json({ error: 'Failed to fetch LinkedIn profile. Please try again.' })
  }
}

// Parse PDL date string ("2018-01" or "2018") into { year, month } object
function parsePdlDate(str) {
  if (!str) return null
  const parts = str.split('-')
  return {
    year: parseInt(parts[0]) || null,
    month: parts[1] ? parseInt(parts[1]) : null,
  }
}

// ─── Text cleanup helpers ────────────────────────────────────────────────────

// Words that stay lowercase unless they're the first word
const SMALL_WORDS = new Set(['a','an','and','at','but','by','for','in','nor','of','on','or','so','the','to','up','yet','vs'])

// Known acronyms / abbreviations that should stay uppercase
const ACRONYMS = new Set([
  'llc','llp','lp','inc','co','nyc','ny','nj','ct','ma','pa','dc','sf','la',
  'usa','uk','cre','cpa','cfa','mba','bs','ba','ms','ma','jd','md','phd',
  'vp','svp','evp','ceo','cfo','coo','cto','cio','cmo','hr','ir','pr',
  'ai','ml','it','ip','roi','etf','reit','cmbs','abs','mbs',
  'ii','iii','iv',
])

function titleCase(str) {
  if (!str) return str
  return str.replace(/\b\w[\w'']*\b/g, (word, offset) => {
    const lower = word.toLowerCase()
    // Known acronyms → all caps
    if (ACRONYMS.has(lower)) return word.toUpperCase()
    // Small words stay lowercase unless they're the first word
    if (offset > 0 && SMALL_WORDS.has(lower)) return lower
    // Normal word → capitalize first letter
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  })
}

// PDL often returns redundant degree entries like ["bachelor of science", "bachelors"]
// Keep the most specific one and title-case it
const DEGREE_ALIASES = {
  'bachelors':          'bachelor of science',
  'bachelor':           'bachelor of science',
  'masters':            'master of science',
  'master':             'master of science',
  'associates':         'associate of science',
  'associate':          'associate of science',
  'doctorate':          'doctor of philosophy',
  'doctoral':           'doctor of philosophy',
  'mba':               'master of business administration',
  'bs':                 'bachelor of science',
  'ba':                 'bachelor of arts',
  'ms':                 'master of science',
  'bba':                'bachelor of business administration',
  'jd':                 'juris doctor',
  'md':                 'doctor of medicine',
  'phd':                'doctor of philosophy',
}

function cleanDegree(degrees) {
  if (!degrees || degrees.length === 0) return null

  // Normalize all entries
  const normalized = degrees.map(d => d.toLowerCase().trim())

  // If only one, just title-case it
  if (normalized.length === 1) return titleCase(normalized[0])

  // Expand short aliases to their full form for comparison
  const expanded = normalized.map(d => DEGREE_ALIASES[d] || d)

  // Deduplicate: if one is a substring/alias of another, keep the longer/more specific one
  const unique = []
  for (const deg of expanded) {
    const dominated = unique.some(existing => existing.includes(deg) || existing === deg)
    if (!dominated) {
      // Remove any existing entries that this one dominates
      const filtered = unique.filter(existing => !deg.includes(existing))
      filtered.push(deg)
      unique.length = 0
      unique.push(...filtered)
    }
  }

  return unique.map(d => titleCase(d)).join(', ')
}
