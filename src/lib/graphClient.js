import { msalInstance, graphScopes } from './msalConfig'

let initialized = false

async function ensureInit() {
  if (!initialized) {
    await msalInstance.initialize()
    initialized = true
  }
}

// Get a valid access token — tries silent first, falls back to popup
async function getToken() {
  await ensureInit()
  const accounts = msalInstance.getAllAccounts()
  if (accounts.length > 0) {
    try {
      const resp = await msalInstance.acquireTokenSilent({ ...graphScopes, account: accounts[0] })
      return resp.accessToken
    } catch {
      // Silent failed — redirect to re-authenticate
      await msalInstance.acquireTokenRedirect({ ...graphScopes, account: accounts[0] })
      return // page will redirect; execution stops here
    }
  }
  throw new Error('Microsoft session expired. Please sign in again.')
}

async function graphGet(path) {
  const token = await getToken()
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Microsoft Graph API error ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Auth helpers ──────────────────────────────────────────────────────────────

export async function signInMicrosoft() {
  await ensureInit()
  await msalInstance.loginRedirect(graphScopes)
}

export async function getMicrosoftAccount() {
  await ensureInit()
  const accounts = msalInstance.getAllAccounts()
  return accounts[0] || null
}

// ─── Data fetchers ─────────────────────────────────────────────────────────────

// Returns all Outlook contacts (paginated automatically)
export async function getOutlookContacts() {
  let all = []
  let path =
    '/me/contacts?$top=100&$select=id,displayName,givenName,surname,emailAddresses,businessPhones,mobilePhone,jobTitle,companyName,personalNotes,categories,imAddresses'

  while (path) {
    const data = await graphGet(path)
    all = [...all, ...(data.value || [])]
    // nextLink is the full URL — strip the base so graphGet can prefix it again
    path = data['@odata.nextLink']
      ? data['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '')
      : null
  }
  return all
}

// Returns a Map of email → LinkedIn URL from the People API
export async function getLinkedInMap() {
  const map = new Map()
  try {
    let path = '/me/people?$top=100'
    while (path) {
      const data = await graphGet(path)
      for (const person of data.value || []) {
        const linkedInUrl = (person.websites || [])
          .map(w => w.address || '')
          .find(url => url.toLowerCase().includes('linkedin.com'))
        if (linkedInUrl) {
          for (const e of person.scoredEmailAddresses || []) {
            if (e.address) map.set(e.address.toLowerCase(), linkedInUrl)
          }
        }
      }
      path = data['@odata.nextLink']
        ? data['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '')
        : null
    }
  } catch {
    // People API is best-effort — return whatever we gathered
  }
  return map
}

// Returns up to 50 recent emails involving a given email address (last daysBack days)
// Uses KQL $search (matches the old working implementation)
export async function getEmailsForContact(email, daysBack = 90) {
  if (!email) return []
  const since = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10)
  const search = encodeURIComponent(`"participants:${email} received>=${since}"`)
  try {
    const data = await graphGet(
      `/me/messages?$search=${search}&$select=id,subject,conversationId,from,toRecipients,receivedDateTime,bodyPreview,isDraft,webLink,hasAttachments&$top=50`
    )
    return (data.value || []).filter(m => !m.isDraft)
  } catch {
    return []
  }
}

// Returns attachments from recent emails involving a given email address
// Uses its own KQL $search with hasattachments:yes (matches old working implementation)
export async function getAttachmentsForContact(email, daysBack = 90) {
  if (!email) return []
  try {
    const since = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10)
    const search = encodeURIComponent(`"participants:${email} received>=${since} hasattachments:yes"`)
    const data = await graphGet(
      `/me/messages?$search=${search}&$select=id,subject,receivedDateTime,webLink&$top=50`
    )
    const messages = (data.value || []).filter(m => !m.isDraft)
    const results = []
    for (const msg of messages.slice(0, 20)) {
      try {
        const attData = await graphGet(
          `/me/messages/${msg.id}/attachments?$select=id,name,contentType,size`
        )
        for (const att of attData.value || []) {
          if (att['@odata.type'] === '#microsoft.graph.itemAttachment') continue
          results.push({
            id: att.id,
            messageId: msg.id,
            name: att.name,
            size: att.size,
            contentType: att.contentType,
            subject: msg.subject,
            date: msg.receivedDateTime,
            webLink: msg.webLink,
          })
        }
      } catch { /* skip individual message on error */ }
    }
    return results
  } catch {
    return []
  }
}

// Downloads an attachment and returns a blob URL
export async function downloadAttachment(messageId, attachmentId) {
  const token = await getToken()
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/${attachmentId}/$value`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error('Failed to download attachment')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
