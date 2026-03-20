// Vercel Serverless Function — Meeting transcript summarization via Google Gemini API (free tier)
// Requires GEMINI_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY in Vercel env vars
// Get a free API key at https://aistudio.google.com/apikey

// Uses direct Supabase REST API (no SDK import) to avoid serverless bundling issues.

async function supabaseUpdate(url, serviceKey, table, id, patch) {
  const res = await fetch(
    `${url}/rest/v1/${table}?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Supabase update failed (${res.status}): ${text.slice(0, 200)}`)
  }
}

export default async function handler(req, res) {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id, transcriptRaw } = req.body || {}
  if (!id || !transcriptRaw) {
    return res.status(400).json({ error: 'Missing "id" or "transcriptRaw" in request body' })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not configured' })
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2048,
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are a CRM assistant that summarizes meeting transcripts for a commercial real estate team. Summarize the following meeting transcript and return JSON with these fields:
- "summary": A concise 2-4 sentence overview of the meeting, highlighting key decisions and outcomes.
- "keyTopics": An array of 3-8 short topic strings discussed in the meeting.
- "actionItems": An array of objects with "description" (string) and "assignee" (string or null if unclear).
- "sentiment": One of "positive", "neutral", or "negative" based on the overall tone.

Meeting transcript:

${transcriptRaw.slice(0, 80_000)}`,
                },
              ],
            },
          ],
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => `(status ${geminiRes.status})`)
      throw new Error(`Gemini API error ${geminiRes.status}: ${errText.slice(0, 300)}`)
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse the JSON response (strip markdown fences if present)
    const jsonStr = rawText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(jsonStr)

    const { summary, keyTopics, actionItems, sentiment } = parsed

    // Update the record in Supabase
    await supabaseUpdate(supabaseUrl, supabaseKey, 'meeting_transcripts', id, {
      summary: summary || null,
      key_topics: keyTopics || [],
      action_items: actionItems || [],
      sentiment: sentiment || 'neutral',
      summary_status: 'completed',
      summary_error: null,
    })

    return res.status(200).json({ summary, keyTopics, actionItems, sentiment })
  } catch (err) {
    console.error('Meeting summarization error:', err)

    // Mark as failed in DB
    await supabaseUpdate(supabaseUrl, supabaseKey, 'meeting_transcripts', id, {
      summary_status: 'failed',
      summary_error: (err?.message || String(err)).slice(0, 500),
    }).catch(() => {})

    return res.status(500).json({ error: `Summarization failed: ${err?.message || String(err)}` })
  }
}
