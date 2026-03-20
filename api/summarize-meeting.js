// Vercel Serverless Function — Meeting transcript summarization via Claude API
// Requires ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY in Vercel env vars

import { createClient } from '@supabase/supabase-js'

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

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Call Claude API for summarization
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `You are a CRM assistant that summarizes meeting transcripts for a commercial real estate team. Return valid JSON with these fields:
- "summary": A concise 2-4 sentence overview of the meeting, highlighting key decisions and outcomes.
- "keyTopics": An array of 3-8 short topic strings discussed in the meeting.
- "actionItems": An array of objects with "description" (string) and "assignee" (string or null if unclear).
- "sentiment": One of "positive", "neutral", or "negative" based on the overall tone.

Return ONLY the JSON object, no markdown fences or explanation.`,
        messages: [
          {
            role: 'user',
            content: `Summarize this meeting transcript:\n\n${transcriptRaw.slice(0, 80_000)}`,
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text().catch(() => `(status ${claudeRes.status})`)
      throw new Error(`Claude API error ${claudeRes.status}: ${errText.slice(0, 300)}`)
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text || ''

    // Parse the JSON response (strip markdown fences if present)
    const jsonStr = rawText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(jsonStr)

    const { summary, keyTopics, actionItems, sentiment } = parsed

    // Update the record in Supabase
    const { error: updateError } = await supabase
      .from('meeting_transcripts')
      .update({
        summary: summary || null,
        key_topics: keyTopics || [],
        action_items: actionItems || [],
        sentiment: sentiment || 'neutral',
        summary_status: 'completed',
        summary_error: null,
      })
      .eq('id', id)

    if (updateError) throw updateError

    return res.status(200).json({ summary, keyTopics, actionItems, sentiment })
  } catch (err) {
    console.error('Meeting summarization error:', err)

    // Mark as failed in DB
    await supabase
      .from('meeting_transcripts')
      .update({
        summary_status: 'failed',
        summary_error: (err?.message || String(err)).slice(0, 500),
      })
      .eq('id', id)
      .catch(() => {})

    return res.status(500).json({ error: `Summarization failed: ${err?.message || String(err)}` })
  }
}
