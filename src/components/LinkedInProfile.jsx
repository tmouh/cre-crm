import { useState } from 'react'
import { Linkedin, RefreshCw, Download, Loader2, AlertCircle } from 'lucide-react'
import { useCRM } from '../context/CRMContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
        className="rounded object-contain bg-white dark:bg-gray-200 border border-gray-100 dark:border-gray-300 flex-shrink-0 p-0.5"
        style={style} />
    )
  }
  return (
    <div className="rounded flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold flex-shrink-0 text-sm"
      style={style}>
      {fallback?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function Divider() {
  return <div className="border-t border-gray-200 dark:border-gray-700 mx-5" />
}

function Section({ title, children }) {
  return (
    <div className="px-5 py-4">
      <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-3">{title}</h3>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LinkedInProfile({ contact }) {
  const { updateContact } = useCRM()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const data = contact.linkedinData

  // Don't render if no LinkedIn URL on the contact
  if (!contact.linkedIn) return null

  async function handleEnrich() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/linkedin?url=${encodeURIComponent(contact.linkedIn)}`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || `Failed (${res.status})`)
      }
      await updateContact(contact.id, { linkedinData: json })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Has URL, no imported data yet ─────────────────────────────────────────
  if (!data) {
    return (
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Linkedin size={15} className="text-[#0A66C2]" />
            <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">LinkedIn Profile</span>
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
  const {
    profile_pic_url,
    full_name,
    headline,
    summary,
    industry,
    location_name,
    experiences          = [],
    education            = [],
    certifications       = [],
    languages            = [],
    skills               = [],
    interests            = [],
    follower_count,
    enriched_at,
  } = data

  return (
    <div className="card overflow-hidden">
      {/* ── Banner ── */}
      <div className="h-[60px] bg-gradient-to-r from-[#0A66C2]/20 to-[#0A66C2]/10 dark:from-[#0A66C2]/30 dark:to-[#0A66C2]/15" />

      {/* ── Profile header ── */}
      <div className="px-5 pb-4">
        <div className="flex items-end justify-between -mt-7 mb-2">
          {profile_pic_url ? (
            <img src={profile_pic_url} alt={full_name}
              className="w-14 h-14 rounded-full border-[3px] border-white dark:border-gray-800 object-cover shadow-sm" />
          ) : (
            <div className="w-14 h-14 rounded-full border-[3px] border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-lg font-bold text-white shadow-sm">
              {full_name?.[0] ?? '?'}
            </div>
          )}

          <button
            onClick={handleEnrich}
            disabled={loading}
            title="Re-enrich from LinkedIn"
            className="mb-1 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>

        {full_name && <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{full_name}</p>}
        {headline && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">{headline}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {location_name && <span className="text-[11px] text-gray-500 dark:text-gray-400">{location_name}</span>}
          {industry && <span className="text-[11px] text-gray-400 dark:text-gray-500">· {industry}</span>}
          {follower_count != null && (
            <span className="text-[11px] text-[#0A66C2] font-medium">
              · {follower_count.toLocaleString()} followers
            </span>
          )}
        </div>
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
            <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">{summary}</p>
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
                  <OrgLogo url={exp.logo_url} fallback={exp.company} size={32} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-snug">{exp.title}</p>
                    {exp.company && <p className="text-xs text-gray-600 dark:text-gray-400">{exp.company}</p>}
                    {dateRange(exp.starts_at, exp.ends_at) && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">{dateRange(exp.starts_at, exp.ends_at)}</p>
                    )}
                    {exp.location && <p className="text-[11px] text-gray-500 dark:text-gray-500">{exp.location}</p>}
                    {exp.description && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed line-clamp-3">{exp.description}</p>
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
              {education.map((edu, i) => (
                <div key={i} className="flex gap-2.5">
                  <OrgLogo url={edu.logo_url} fallback={edu.school} size={32} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-snug">{edu.school}</p>
                    {(edu.degree_name || edu.field_of_study) && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {[edu.degree_name, edu.field_of_study].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {dateRange(edu.starts_at, edu.ends_at) && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">{dateRange(edu.starts_at, edu.ends_at)}</p>
                    )}
                    {edu.description && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed line-clamp-3">{edu.description}</p>
                    )}
                  </div>
                </div>
              ))}
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
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{cert.name}</p>
                  {cert.authority && <p className="text-xs text-gray-600 dark:text-gray-400">{cert.authority}</p>}
                  {cert.starts_at && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">
                      Issued {fmtDate(cert.starts_at)}{cert.ends_at ? ` · Expires ${fmtDate(cert.ends_at)}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Skills ── */}
      {skills.length > 0 && (
        <>
          <Divider />
          <Section title="Skills">
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, i) => (
                <span key={i} className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-2.5 py-0.5">
                  {skill}
                </span>
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
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{l.name}</p>
                  {l.proficiency && <p className="text-[11px] text-gray-500 dark:text-gray-500">{l.proficiency}</p>}
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
                <span key={i} className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-2.5 py-0.5">
                  {item}
                </span>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Footer ── */}
      <Divider />
      <div className="px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
          <Linkedin size={11} className="text-[#0A66C2]" />
          via People Data Labs
        </div>
        {enriched_at && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Enriched {new Date(enriched_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}
