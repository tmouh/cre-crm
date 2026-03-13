// Vercel Serverless Function — Microsoft Graph webhook receiver
// Receives change notifications for mail, calendar, etc.
// Writes to Supabase for the client app to pick up.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Subscription validation handshake — Microsoft sends GET/POST with validationToken
  if (req.query.validationToken) {
    res.setHeader('Content-Type', 'text/plain')
    return res.status(200).send(req.query.validationToken)
  }

  if (req.method !== 'POST') return res.status(405).end()

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY')
    return res.status(500).end()
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const secret = process.env.GRAPH_WEBHOOK_SECRET || ''
  const notifications = req.body?.value || []

  for (const n of notifications) {
    // Verify clientState matches our secret
    if (secret && n.clientState !== secret) continue

    await supabase.from('webhook_notifications').insert({
      subscription_id: n.subscriptionId,
      change_type: n.changeType,
      resource: n.resource,
      resource_data: n.resourceData || null,
      tenant_id: n.tenantId || null,
      received_at: new Date().toISOString(),
      processed: false,
    }).catch(err => console.error('Failed to store notification:', err.message))
  }

  // Must respond 202 within 3 seconds or Microsoft will retry
  return res.status(202).end()
}
