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

    // Extract the fields we care about — keep payload lean
    const profile = {
      full_name: person.full_name || null,
      headline: person.headline || null,
      summary: person.summary || null,
      industry: person.industry || null,
      location_name: person.location_name || null,
      profile_pic_url: person.profile_pic_url || null,
      linkedin_url: person.linkedin_url || null,
      follower_count: person.follower_count || null,
      experiences: (person.experience || []).map(exp => ({
        title: exp.title?.name || exp.title || null,
        company: exp.company?.name || exp.company || null,
        company_linkedin_url: exp.company?.linkedin_url || null,
        logo_url: exp.company?.logo_url || null,
        location: exp.location_name || null,
        description: exp.description || null,
        starts_at: exp.start_date ? parsePdlDate(exp.start_date) : null,
        ends_at: exp.end_date ? parsePdlDate(exp.end_date) : null,
        is_primary: exp.is_primary || false,
      })),
      education: (person.education || []).map(edu => ({
        school: edu.school?.name || edu.school || null,
        logo_url: edu.school?.logo_url || null,
        degree_name: edu.degrees?.join(', ') || null,
        field_of_study: edu.majors?.join(', ') || null,
        starts_at: edu.start_date ? parsePdlDate(edu.start_date) : null,
        ends_at: edu.end_date ? parsePdlDate(edu.end_date) : null,
        description: edu.summary || null,
        gpa: edu.gpa || null,
      })),
      certifications: (person.certifications || []).map(cert => ({
        name: cert.name || null,
        authority: cert.organization || null,
        starts_at: cert.start_date ? parsePdlDate(cert.start_date) : null,
        ends_at: cert.end_date ? parsePdlDate(cert.end_date) : null,
      })),
      languages: (person.languages || []).map(lang => ({
        name: typeof lang === 'string' ? lang : lang.name || null,
        proficiency: null,
      })),
      skills: (person.skills || []).map(s => typeof s === 'string' ? s : s.name || null).filter(Boolean),
      interests: (person.interests || []).map(i => typeof i === 'string' ? i : i.name || null).filter(Boolean),
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
