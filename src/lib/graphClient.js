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
      // Silent failed (expired/no cache) — fall through to popup
    }
  }
  const resp = await msalInstance.acquireTokenPopup(graphScopes)
  return resp.accessToken
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
  const resp = await msalInstance.loginPopup(graphScopes)
  return resp.account
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
    '/me/contacts?$top=100&$select=id,displayName,givenName,surname,emailAddresses,businessPhones,mobilePhone,jobTitle,companyName,personalNotes'

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

// Returns up to 50 recent emails involving a given email address (last daysBack days)
export async function getEmailsForContact(email, daysBack = 90) {
  if (!email) return []
  const since = new Date(Date.now() - daysBack * 86_400_000).toISOString()
  const filter = encodeURIComponent(
    `(from/emailAddress/address eq '${email}' or toRecipients/any(r:r/emailAddress/address eq '${email}')) and receivedDateTime ge ${since}`
  )
  try {
    const data = await graphGet(
      `/me/messages?$filter=${filter}&$select=subject,from,receivedDateTime,bodyPreview,isDraft&$top=50&$orderby=receivedDateTime desc`
    )
    return (data.value || []).filter(m => !m.isDraft)
  } catch {
    // Email fetching is best-effort — skip on error
    return []
  }
}
