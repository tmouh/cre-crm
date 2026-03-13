import { useState, useEffect } from 'react'
import { Linkedin, RefreshCw, Download, Loader2, AlertCircle } from 'lucide-react'
import { useCRM } from '../context/CRMContext'
import { getMicrosoftAccount, getLinkedInMap } from '../lib/graphClient'

// ─── Display-layer text helpers ───────────────────────────────────────────────
// Mirror the API-side titleCase so existing cached (lowercase) DB data renders
// correctly without requiring a re-enrichment.

const SMALL_WORDS = new Set(['a','an','and','at','but','by','for','in','nor','of','on','or','so','the','to','up','yet','vs'])
const ACRONYMS    = new Set([
  'llc','llp','lp','inc','co','nyc','ny','nj','ct','ma','pa','dc','sf','la',
  'usa','uk','cre','cpa','cfa','mba','bs','ba','ms','jd','md','phd',
  'vp','svp','evp','ceo','cfo','coo','cto','cio','cmo','hr','ir','pr',
  'ai','ml','it','ip','roi','etf','reit','cmbs','abs','mbs',
  'ii','iii','iv',
])

function titleCase(str) {
  if (!str || typeof str !== 'string') return str || null
  return str.replace(/\b\w[\w'']*\b/g, (word, offset) => {
    const lower = word.toLowerCase()
    if (ACRONYMS.has(lower)) return word.toUpperCase()
    if (offset > 0 && SMALL_WORDS.has(lower)) return lower
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  })
}

// Cleans a combined degree+field string that may have been stored in old format:
// "bachelor of science, bachelors, finance, real estate"
// → "Bachelor of Science, Finance, Real Estate"
const DEGREE_ALIASES = {
  'bachelors': 'bachelor of science', 'bachelor': 'bachelor of science',
  'masters': 'master of science',     'master': 'master of science',
  'associates': 'associate of science','associate': 'associate of science',
  'doctorate': 'doctor of philosophy', 'doctoral': 'doctor of philosophy',
  'mba': 'master of business administration',
  'bs': 'bachelor of science', 'ba': 'bachelor of arts',
  'ms': 'master of science',   'bba': 'bachelor of business administration',
  'jd': 'juris doctor', 'md': 'doctor of medicine', 'phd': 'doctor of philosophy',
}

function cleanDegreeDisplay(degreeStr, fieldStr) {
  // Gather all parts from both degree and field strings
  const raw = [degreeStr, fieldStr]
    .filter(s => s && typeof s === 'string')
    .flatMap(s => s.split(',').map(p => p.trim().toLowerCase()).filter(Boolean))

  if (raw.length === 0) return null

  // Expand aliases to full form
  const expanded = raw.map(d => DEGREE_ALIASES[d] || d)

  // Deduplicate: remove entries dominated by a longer entry
  const unique = []
  for (const deg of expanded) {
    const dominated = unique.some(ex => ex.includes(deg) || ex === deg)
    if (!dominated) {
      const filtered = unique.filter(ex => !deg.includes(ex))
      unique.length = 0
      unique.push(...filtered, deg)
    }
  }

  return unique.map(d => titleCase(d)).join(', ') || null
}

// ─── Deduplication helpers ────────────────────────────────────────────────────

// Normalize a string to a bare alphanumeric key for fuzzy comparison
function normKey(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Remove experience entries that share the same company + title.
// When duplicates exist, keep the one with more data (description > no description,
// has start date > no start date). Falls back to first occurrence.
function dedupeExperiences(exps) {
  const seen = new Map() // key → index in result
  const result = []
  for (const exp of exps) {
    const key = normKey(exp.company) + '|' + normKey(exp.title)
    if (!key || key === '|') { result.push(exp); continue }
    if (!seen.has(key)) {
      seen.set(key, result.length)
      result.push(exp)
    } else {
      // Replace existing if this one has richer data
      const idx = seen.get(key)
      const existing = result[idx]
      const existingScore = (existing.description ? 2 : 0) + (existing.starts_at ? 1 : 0)
      const newScore      = (exp.description      ? 2 : 0) + (exp.starts_at      ? 1 : 0)
      if (newScore > existingScore) result[idx] = exp
    }
  }
  return result
}

// Remove education entries that share the same school + start year.
// When duplicates exist, keep the one with more degree/field info.
function dedupeEducation(edus) {
  const seen = new Map()
  const result = []
  for (const edu of edus) {
    const key = normKey(edu.school) + '|' + (edu.starts_at?.year ?? '')
    if (!key || key === '|') { result.push(edu); continue }
    if (!seen.has(key)) {
      seen.set(key, result.length)
      result.push(edu)
    } else {
      const idx = seen.get(key)
      const existing = result[idx]
      const existingScore = (existing.degree_name ? 2 : 0) + (existing.field_of_study ? 1 : 0)
      const newScore      = (edu.degree_name      ? 2 : 0) + (edu.field_of_study      ? 1 : 0)
      if (newScore > existingScore) result[idx] = edu
    }
  }
  return result
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtDate(d) {
  if (!d) return null
  return d.month ? `${MONTHS[d.month - 1]} ${d.year}` : `${d.year}`
}

function dateRange(start, end) {
  const s = fmtDate(start)
  const e = fmtDate(end) ?? 'Present'
  if (!s) return e === 'Present' ? null : e
  return `${s} – ${e}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OrgLogo({ url, fallback, size = 40 }) {
  const [err, setErr] = useState(false)
  const style = { width: size, height: size }
  if (url && !err) {
    return (
      <img src={url} alt="" onError={() => setErr(true)}
        className="rounded object-contain bg-white dark:bg-slate-200 border border-slate-100 dark:border-slate-300 flex-shrink-0 p-0.5"
        style={style} />
    )
  }
  return (
    <div className="rounded flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold flex-shrink-0 text-sm"
      style={style}>
      {fallback?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function Divider() {
  return <div className="border-t border-slate-200 dark:border-slate-700 mx-5" />
}

function Section({ title, children }) {
  return (
    <div className="px-5 py-4">
      <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mb-3">{title}</h3>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LinkedInProfile({ contact }) {
  const { updateContact } = useCRM()
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [autoDetecting, setAutoDetecting] = useState(false)

  const data = contact.linkedinData

  // ── Auto-detect LinkedIn URL from Outlook People API on mount ──────────────
  useEffect(() => {
    // Only run when: no LinkedIn URL yet, contact has an email, no cached data
    if (contact.linkedIn || !contact.email || data) return

    let cancelled = false

    async function tryAutoDetect() {
      setAutoDetecting(true)
      try {
        const account = await getMicrosoftAccount()
        if (!account || cancelled) return

        const map = await getLinkedInMap()
        if (cancelled) return

        const found = map.get(contact.email.toLowerCase())
        if (!found) return

        // Save the discovered URL to the contact
        await updateContact(contact.id, { linkedIn: found })
        // Then immediately enrich from PDL
        if (!cancelled) await enrich(found)
      } catch {
        // Auto-detect is best-effort — fail silently
      } finally {
        if (!cancelled) setAutoDetecting(false)
      }
    }

    tryAutoDetect()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id])

  // Don't render if no LinkedIn URL and not auto-detecting
  if (!contact.linkedIn && !autoDetecting) return null

  // ── Shared enrich function ─────────────────────────────────────────────────
  async function enrich(urlOverride) {
    const url = urlOverride || contact.linkedIn
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/linkedin?url=${encodeURIComponent(url)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`)
      await updateContact(contact.id, { linkedinData: json })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleEnrich() { enrich() }

  // ── Auto-detecting spinner (no URL yet) ───────────────────────────────────
  if (autoDetecting && !contact.linkedIn) {
    return (
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 size={12} className="animate-spin flex-shrink-0" />
          Checking Outlook for LinkedIn profile…
        </div>
      </div>
    )
  }

  // ── Has URL, no imported data yet ─────────────────────────────────────────
  if (!data) {
    return (
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Linkedin size={15} className="text-[#0A66C2]" />
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">LinkedIn Profile</span>
          </div>
          <button
            onClick={handleEnrich}
            disabled={loading}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {loading ? 'Enriching…' : 'Enrich from LinkedIn'}
          </button>
        </div>
        {error && (
          <div className="px-5 pb-4">
            <div className="flex items-start gap-2 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                <button onClick={handleEnrich} className="text-red-600 dark:text-red-300 underline mt-1">Try again</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Full profile ───────────────────────────────────────────────────────────
  // Apply display-layer titleCase so cached DB data (stored lowercase) renders
  // correctly without needing re-enrichment.
  const {
    profile_pic_url,
    summary,
    enriched_at,
  } = data

  const full_name     = titleCase(data.full_name)
  const industry      = titleCase(data.industry)
  const location_name = titleCase(data.location_name)

  // Headline: use stored value, or fall back to "Title at Company" from first experience
  // Strip sub-titles after comma before "at" (e.g. "Analyst, Capital Markets at X" → "Analyst at X")
  const primaryExp   = (data.experiences || []).find(e => e.is_primary) || (data.experiences || [])[0]
  const rawHeadline  = titleCase(data.headline)
    || (primaryExp
        ? [titleCase(primaryExp.title), titleCase(primaryExp.company)].filter(Boolean).join(' at ')
        : null)
  const headline = rawHeadline
    ? rawHeadline.replace(/^([^,]+?)(?:,|\s+-\s+)\s*.*?\s+at\s+/i, '$1 at ')
    : null

  const experiences    = dedupeExperiences(data.experiences || [])
  const education      = dedupeEducation(data.education || [])
  const certifications = (data.certifications || [])
  const languages      = (data.languages      || [])
  const interests      = (data.interests      || [])

  return (
    <div className="card overflow-hidden">
      {/* ── Banner ── */}
      <div className="h-[60px] bg-gradient-to-r from-[#0A66C2]/20 to-[#0A66C2]/10 dark:from-[#0A66C2]/30 dark:to-[#0A66C2]/15" />

      {/* ── Profile header ── */}
      <div className="px-5 pb-4">
        <div className="flex items-end justify-between -mt-7 mb-2">
          {profile_pic_url ? (
            <img src={profile_pic_url} alt={full_name}
              className="w-14 h-14 rounded-full border-[3px] border-white dark:border-slate-800 object-cover shadow-sm" />
          ) : (
            <div className="w-14 h-14 rounded-full border-[3px] border-white dark:border-slate-800 bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-lg font-bold text-white shadow-sm">
              {full_name?.[0] ?? '?'}
            </div>
          )}

          <button
            onClick={handleEnrich}
            disabled={loading}
            title="Re-enrich from LinkedIn"
            className="mb-1 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>

        {full_name && <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{full_name}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {headline      && <span className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{headline}</span>}
          {industry       && <span className="text-xs text-slate-400 dark:text-slate-500">{headline ? '·' : ''} {industry}</span>}
        </div>
        {location_name && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{location_name}</p>}
      </div>

      {/* ── Error on re-enrich ── */}
      {error && (
        <div className="px-5 pb-3">
          <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ── About ── */}
      {summary && (
        <>
          <Divider />
          <Section title="About">
            <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">{summary}</p>
          </Section>
        </>
      )}

      {/* ── Experience ── */}
      {experiences.length > 0 && (
        <>
          <Divider />
          <Section title="Experience">
            <div className="space-y-4">
              {experiences.map((exp, i) => (
                <div key={i} className="flex gap-2.5">
                  <OrgLogo url={exp.logo_url} fallback={titleCase(exp.company)} size={32} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">{titleCase(exp.title)}</p>
                    {exp.company  && <p className="text-xs text-slate-600 dark:text-slate-400">{titleCase(exp.company)}</p>}
                    {dateRange(exp.starts_at, exp.ends_at) && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">{dateRange(exp.starts_at, exp.ends_at)}</p>
                    )}
                    {exp.location && <p className="text-[11px] text-slate-500 dark:text-slate-500">{titleCase(exp.location)}</p>}
                    {exp.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-3">{exp.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Education ── */}
      {education.length > 0 && (
        <>
          <Divider />
          <Section title="Education">
            <div className="space-y-4">
              {education.map((edu, i) => {
                const degreeDisplay = cleanDegreeDisplay(edu.degree_name, edu.field_of_study)
                return (
                  <div key={i} className="flex gap-2.5">
                    <OrgLogo url={edu.logo_url} fallback={titleCase(edu.school)} size={32} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">{titleCase(edu.school)}</p>
                      {degreeDisplay && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">{degreeDisplay}</p>
                      )}
                      {dateRange(edu.starts_at, edu.ends_at) && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">{dateRange(edu.starts_at, edu.ends_at)}</p>
                      )}
                      {edu.description && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-3">{edu.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        </>
      )}

      {/* ── Certifications ── */}
      {certifications.length > 0 && (
        <>
          <Divider />
          <Section title="Certifications">
            <div className="space-y-3">
              {certifications.map((cert, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{titleCase(cert.name)}</p>
                  {cert.authority && <p className="text-xs text-slate-600 dark:text-slate-400">{titleCase(cert.authority)}</p>}
                  {cert.starts_at && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">
                      Issued {fmtDate(cert.starts_at)}{cert.ends_at ? ` · Expires ${fmtDate(cert.ends_at)}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Languages ── */}
      {languages.length > 0 && (
        <>
          <Divider />
          <Section title="Languages">
            <div className="space-y-1.5">
              {languages.map((l, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{titleCase(l.name)}</p>
                  {l.proficiency && <p className="text-[11px] text-slate-500 dark:text-slate-500">{l.proficiency}</p>}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Interests ── */}
      {interests.length > 0 && (
        <>
          <Divider />
          <Section title="Interests">
            <div className="flex flex-wrap gap-1.5">
              {interests.map((item, i) => (
                <span key={i} className="text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full px-2.5 py-0.5">
                  {titleCase(item)}
                </span>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Footer ── */}
      {enriched_at && (
        <>
          <Divider />
          <div className="px-5 py-2 flex items-center justify-end">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Enriched {new Date(enriched_at).toLocaleDateString()}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
