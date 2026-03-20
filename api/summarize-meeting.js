// Vercel Serverless Function — Meeting transcript summarization via OpenAI API
// Requires OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY in Vercel env vars

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

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Call OpenAI API for summarization (gpt-4o-mini for free/low-cost tier)
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a CRM assistant that summarizes meeting transcripts for a commercial real estate team. Return valid JSON with these fields:
- "summary": A concise 2-4 sentence overview of the meeting, highlighting key decisions and outcomes.
- "keyTopics": An array of 3-8 short topic strings discussed in the meeting.
- "actionItems": An array of objects with "description" (string) and "assignee" (string or null if unclear).
- "sentiment": One of "positive", "neutral", or "negative" based on the overall tone.`,
          },
          {
            role: 'user',
            content: `Summarize this meeting transcript:\n\n${transcriptRaw.slice(0, 80_000)}`,
          },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => `(status ${openaiRes.status})`)
      throw new Error(`OpenAI API error ${openaiRes.status}: ${errText.slice(0, 300)}`)
    }

    const openaiData = await openaiRes.json()
    const rawText = openaiData.choices?.[0]?.message?.content || ''

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
