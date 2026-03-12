import { useState } from 'react'
import { Linkedin, RefreshCw, ClipboardPaste, X, ChevronDown, ChevronUp } from 'lucide-react'
import { parseLinkedInText } from '../lib/linkedinParser'
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

function proficiencyLabel(p) {
  if (!p) return null
  return p.replace(/\b\w/g, c => c.toUpperCase())
}

function interestLabel(i) {
  if (typeof i === 'string') return i
  return i?.title || i?.name || null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OrgLogo({ url, fallback, size = 40 }) {
  const [err, setErr] = useState(false)
  const style = { width: size, height: size }
  if (url && !err) {
    return (
      <img src={url} alt="" onError={() => setErr(true)}
        className="rounded object-contain bg-white border border-gray-100 flex-shrink-0 p-0.5"
        style={style} />
    )
  }
  return (
    <div className="rounded flex items-center justify-center bg-gray-100 text-gray-500 font-bold flex-shrink-0 text-sm"
      style={style}>
      {fallback?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function Divider() {
  return <div className="border-t border-gray-200 mx-6" />
}

function Section({ title, children }) {
  return (
    <div className="px-6 py-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  )
}

// ─── Paste panel ─────────────────────────────────────────────────────────────

function PastePanel({ onParse, onCancel }) {
  const [text, setText] = useState('')
  const [error, setError] = useState(null)

  function handleParse() {
    if (!text.trim()) { setError('Paste your LinkedIn profile text first.'); return }
    try {
      const data = parseLinkedInText(text)
      if (!data.full_name && !data.experiences.length && !data.education.length) {
        setError("Couldn't find recognisable LinkedIn sections. Make sure you selected and copied the whole page (Ctrl+A then Ctrl+C on the LinkedIn profile).")
        return
      }
      onParse(data)
    } catch (e) {
      setError('Parse failed: ' + e.message)
    }
  }

  return (
    <div className="px-5 pb-5 space-y-3">
      <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
        <li>Open the contact's LinkedIn profile in your browser</li>
        <li>Press <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">Ctrl+A</kbd> to select all, then <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">Ctrl+C</kbd> to copy</li>
        <li>Paste below and click <strong>Import</strong></li>
      </ol>

      <textarea
        className="input w-full resize-none text-xs font-mono"
        rows={7}
        placeholder="Paste LinkedIn profile text here…"
        value={text}
        onChange={e => { setText(e.target.value); setError(null) }}
        autoFocus
      />

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <div className="flex gap-2">
        <button onClick={handleParse} className="btn-primary text-xs flex items-center gap-1.5 flex-1 justify-center">
          <ClipboardPaste size={13} /> Import
        </button>
        <button onClick={onCancel} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LinkedInProfile({ contact }) {
  const { updateContact } = useCRM()
  const [showPaste, setShowPaste] = useState(false)

  const data = contact.linkedInData

  async function handleParse(parsed) {
    await updateContact(contact.id, { linkedInData: parsed })
    setShowPaste(false)
  }

  // ── No LinkedIn URL on the contact at all ─────────────────────────────────
  if (!contact.linkedIn) return null

  // ── Has URL, no imported data yet ─────────────────────────────────────────
  if (!data) {
    return (
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Linkedin size={15} className="text-[#0A66C2]" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">LinkedIn Profile</span>
          </div>
          <button onClick={() => setShowPaste(p => !p)}
            className="btn-secondary text-xs flex items-center gap-1.5">
            <ClipboardPaste size={12} />
            {showPaste ? 'Cancel' : 'Import from LinkedIn'}
          </button>
        </div>
        {showPaste && <PastePanel onParse={handleParse} onCancel={() => setShowPaste(false)} />}
      </div>
    )
  }

  // ── Full profile ───────────────────────────────────────────────────────────
  const {
    profile_pic_url,
    full_name,
    headline,
    city,
    state,
    country_full_name,
    summary,
    experiences               = [],
    education                 = [],
    certifications            = [],
    languages_and_proficiencies = [],
    accomplishment_organisations = [],
    interests                 = [],
    follower_count,
  } = data

  const location = [city, state, country_full_name].filter(Boolean).join(', ')

  return (
    /* Intentionally light-mode only — mimics an embedded LinkedIn card */
    <div className="rounded-xl border border-gray-200 shadow-sm bg-white text-gray-900 overflow-hidden">

      {/* ── Banner ── */}
      <div className="h-[72px] bg-gradient-to-r from-[#C5D3DF] to-[#A8BDD0]" />

      {/* ── Profile header ── */}
      <div className="px-6 pb-5">
        <div className="flex items-end justify-between -mt-9 mb-3">
          {profile_pic_url ? (
            <img src={profile_pic_url} alt={full_name}
              className="w-[72px] h-[72px] rounded-full border-[3px] border-white object-cover shadow-sm" />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full border-[3px] border-white bg-gray-300 flex items-center justify-center text-2xl font-bold text-white shadow-sm">
              {full_name?.[0] ?? '?'}
            </div>
          )}

          <button
            onClick={() => setShowPaste(p => !p)}
            title={showPaste ? 'Cancel re-import' : 'Re-import from LinkedIn'}
            className="mb-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {showPaste ? <X size={14} /> : <RefreshCw size={14} />}
          </button>
        </div>

        <p className="text-xl font-bold leading-tight">{full_name}</p>
        {headline && <p className="text-sm text-gray-600 mt-0.5 leading-snug">{headline}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {location && <span className="text-xs text-gray-500">{location}</span>}
          {follower_count != null && (
            <span className="text-xs text-[#0A66C2] font-medium">
              {follower_count.toLocaleString()} followers
            </span>
          )}
        </div>
      </div>

      {/* ── Re-import paste panel ── */}
      {showPaste && (
        <>
          <Divider />
          <PastePanel onParse={handleParse} onCancel={() => setShowPaste(false)} />
        </>
      )}

      {/* ── About ── */}
      {summary && (
        <>
          <Divider />
          <Section title="About">
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{summary}</p>
          </Section>
        </>
      )}

      {/* ── Experience ── */}
      {experiences.length > 0 && (
        <>
          <Divider />
          <Section title="Experience">
            <div className="space-y-5">
              {experiences.map((exp, i) => (
                <div key={i} className="flex gap-3">
                  <OrgLogo url={exp.logo_url} fallback={exp.company} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{exp.title}</p>
                    {exp.company && <p className="text-sm text-gray-600">{exp.company}</p>}
                    {dateRange(exp.starts_at, exp.ends_at) && (
                      <p className="text-xs text-gray-500 mt-0.5">{dateRange(exp.starts_at, exp.ends_at)}</p>
                    )}
                    {exp.location && <p className="text-xs text-gray-500">{exp.location}</p>}
                    {exp.description && (
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{exp.description}</p>
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
            <div className="space-y-5">
              {education.map((edu, i) => (
                <div key={i} className="flex gap-3">
                  <OrgLogo url={edu.logo_url} fallback={edu.school} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{edu.school}</p>
                    {(edu.degree_name || edu.field_of_study) && (
                      <p className="text-sm text-gray-600">
                        {[edu.degree_name, edu.field_of_study].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {dateRange(edu.starts_at, edu.ends_at) && (
                      <p className="text-xs text-gray-500 mt-0.5">{dateRange(edu.starts_at, edu.ends_at)}</p>
                    )}
                    {edu.grade && <p className="text-xs text-gray-500">Grade: {edu.grade}</p>}
                    {edu.activities_and_societies && (
                      <p className="text-xs text-gray-500">Activities: {edu.activities_and_societies}</p>
                    )}
                    {edu.description && (
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{edu.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Licenses & Certifications ── */}
      {certifications.length > 0 && (
        <>
          <Divider />
          <Section title="Licenses &amp; Certifications">
            <div className="space-y-4">
              {certifications.map((cert, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#0A66C2]" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{cert.name}</p>
                    {cert.authority && <p className="text-sm text-gray-600">{cert.authority}</p>}
                    <div className="text-xs text-gray-500 mt-0.5">
                      {cert.starts_at && (
                        <p>Issued {fmtDate(cert.starts_at)}{cert.ends_at ? ` · Expires ${fmtDate(cert.ends_at)}` : ''}</p>
                      )}
                      {cert.license_number && <p>Credential ID: {cert.license_number}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Languages ── */}
      {languages_and_proficiencies.length > 0 && (
        <>
          <Divider />
          <Section title="Languages">
            <div className="space-y-2.5">
              {languages_and_proficiencies.map((l, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold">{l.name}</p>
                  {l.proficiency && (
                    <p className="text-xs text-gray-500">{proficiencyLabel(l.proficiency)}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Organizations ── */}
      {accomplishment_organisations.length > 0 && (
        <>
          <Divider />
          <Section title="Organizations">
            <div className="space-y-4">
              {accomplishment_organisations.map((org, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold leading-snug">{org.org_name}</p>
                  {org.title && <p className="text-sm text-gray-600">{org.title}</p>}
                  {dateRange(org.starts_at, org.ends_at) && (
                    <p className="text-xs text-gray-500 mt-0.5">{dateRange(org.starts_at, org.ends_at)}</p>
                  )}
                  {org.description && (
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{org.description}</p>
                  )}
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
            <div className="flex flex-wrap gap-2">
              {interests.map((item, i) => {
                const label = interestLabel(item)
                return label ? (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                    {label}
                  </span>
                ) : null
              })}
            </div>
          </Section>
        </>
      )}

      {/* ── Footer ── */}
      <Divider />
      <div className="px-6 py-3 flex items-center gap-1.5 text-xs text-gray-400">
        <Linkedin size={11} className="text-[#0A66C2]" />
        LinkedIn profile data
      </div>
    </div>
  )
}
