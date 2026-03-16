/**
 * Microsoft Graph API service layer.
 * Provides typed access to all Microsoft 365 data areas:
 * Mail, Calendar, Contacts, Files, People, Teams, Presence, Meetings.
 *
 * All functions return normalized data suitable for CRM consumption.
 */

import { msalInstance, graphScopes, graphScopesFull } from '../lib/msalConfig'

let initialized = false

async function ensureInit() {
  if (!initialized) {
    await msalInstance.initialize()
    initialized = true
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function getToken(scopes) {
  await ensureInit()
  const accounts = msalInstance.getAllAccounts()
  if (accounts.length === 0) {
    throw new Error('No Microsoft account. Please sign in.')
  }
  try {
    const resp = await msalInstance.acquireTokenSilent({
      scopes: scopes || graphScopes.scopes,
      account: accounts[0],
    })
    return resp.accessToken
  } catch {
    // Silent failed — try popup first, then redirect
    try {
      const resp = await msalInstance.acquireTokenPopup({
        scopes: scopes || graphScopes.scopes,
        account: accounts[0],
      })
      return resp.accessToken
    } catch {
      await msalInstance.acquireTokenRedirect({
        scopes: scopes || graphScopes.scopes,
        account: accounts[0],
      })
      return null // page will redirect
    }
  }
}

async function graphGet(path, scopes) {
  const token = await getToken(scopes)
  if (!token) return null
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph API ${res.status}: ${text}`)
  }
  return res.json()
}

async function graphPost(path, body, scopes) {
  const token = await getToken(scopes)
  if (!token) return null
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph API POST ${res.status}: ${text}`)
  }
  return res.json()
}

async function graphPatch(path, body, scopes) {
  const token = await getToken(scopes)
  if (!token) return null
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph API PATCH ${res.status}: ${text}`)
  }
  return res.json()
}

async function graphDelete(path, scopes) {
  const token = await getToken(scopes)
  if (!token) return null
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`Graph API DELETE ${res.status}: ${text}`)
  }
}

async function graphGetBeta(path, scopes) {
  const token = await getToken(scopes)
  if (!token) return null
  const res = await fetch(`https://graph.microsoft.com/beta${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

// ─── Auth helpers ──────────────────────────────────────────────────────────────

export async function signInMicrosoft(fullScopes = false) {
  await ensureInit()
  const scopes = fullScopes ? graphScopesFull : graphScopes

  // If already signed in and requesting more scopes, ONLY use popup for incremental
  // consent — never loginRedirect, which navigates away and returns to a blank page.
  const existingAccounts = msalInstance.getAllAccounts()
  if (fullScopes && existingAccounts.length > 0) {
    await msalInstance.acquireTokenPopup({
      scopes: scopes.scopes,
      account: existingAccounts[0],
      prompt: 'consent',
    })
    // Throws on popup blocked, user_cancelled, or other errors — caller handles it.
    return
  }

  await msalInstance.loginRedirect(scopes)
}

export async function signOutMicrosoft() {
  await ensureInit()
  await msalInstance.logoutRedirect()
}

export async function getMicrosoftAccount() {
  await ensureInit()
  const accounts = msalInstance.getAllAccounts()
  return accounts[0] || null
}

export async function getMicrosoftProfile() {
  try {
    const data = await graphGet('/me?$select=displayName,mail,jobTitle,department,officeLocation,userPrincipalName')
    return data
  } catch {
    return null
  }
}

// ─── Mail ──────────────────────────────────────────────────────────────────────

export async function getRecentEmails(count = 50) {
  try {
    const data = await graphGet(
      `/me/messages?$top=${count}&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,isDraft,webLink,hasAttachments,isRead,importance`
    )
    return (data?.value || []).filter(m => !m.isDraft)
  } catch {
    return []
  }
}

export async function getEmailsForContact(email, daysBack = 90) {
  if (!email) return []
  const since = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10)
  const search = encodeURIComponent(`"participants:${email} received>=${since}"`)
  try {
    const data = await graphGet(
      `/me/messages?$search=${search}&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,isDraft,webLink,hasAttachments,isRead,importance&$top=50`
    )
    return (data?.value || []).filter(m => !m.isDraft)
  } catch {
    return []
  }
}

export async function getEmailThread(conversationId) {
  try {
    const data = await graphGet(
      `/me/messages?$filter=conversationId eq '${conversationId}'&$orderby=receivedDateTime asc&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,webLink`
    )
    return data?.value || []
  } catch {
    return []
  }
}

export async function getAttachmentsForContact(email, daysBack = 90) {
  if (!email) return []
  try {
    const since = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10)
    const search = encodeURIComponent(`"participants:${email} received>=${since} hasattachments:yes"`)
    const data = await graphGet(
      `/me/messages?$search=${search}&$select=id,subject,receivedDateTime,webLink&$top=50`
    )
    const messages = (data?.value || []).filter(m => !m.isDraft)
    const results = []
    for (const msg of messages.slice(0, 20)) {
      try {
        const attData = await graphGet(`/me/messages/${msg.id}/attachments?$select=id,name,contentType,size`)
        for (const att of attData?.value || []) {
          if (att['@odata.type'] === '#microsoft.graph.itemAttachment') continue
          results.push({
            id: att.id, messageId: msg.id, name: att.name, size: att.size,
            contentType: att.contentType, subject: msg.subject,
            date: msg.receivedDateTime, webLink: msg.webLink,
          })
        }
      } catch { /* skip */ }
    }
    return results
  } catch {
    return []
  }
}

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

// ─── Calendar ──────────────────────────────────────────────────────────────────

export async function getUpcomingEvents(days = 7) {
  const start = new Date().toISOString()
  const end = new Date(Date.now() + days * 86_400_000).toISOString()
  try {
    const data = await graphGet(
      `/me/calendarView?startDateTime=${start}&endDateTime=${end}&$top=50&$orderby=start/dateTime&$select=id,subject,start,end,location,organizer,attendees,webLink,isOnlineMeeting,onlineMeetingUrl,bodyPreview`
    )
    return data?.value || []
  } catch {
    return []
  }
}

export async function getRecentPastEvents(days = 30) {
  const end = new Date().toISOString()
  const start = new Date(Date.now() - days * 86_400_000).toISOString()
  try {
    const data = await graphGet(
      `/me/calendarView?startDateTime=${start}&endDateTime=${end}&$top=100&$orderby=start/dateTime desc&$select=id,subject,start,end,location,organizer,attendees,webLink,bodyPreview`
    )
    return data?.value || []
  } catch {
    return []
  }
}

export async function getEventsForContact(email, daysBack = 90) {
  if (!email) return []
  const start = new Date(Date.now() - daysBack * 86_400_000).toISOString()
  const end = new Date(Date.now() + 30 * 86_400_000).toISOString()
  try {
    const data = await graphGet(
      `/me/calendarView?startDateTime=${start}&endDateTime=${end}&$top=100&$select=id,subject,start,end,attendees,webLink,bodyPreview`
    )
    return (data?.value || []).filter(evt =>
      (evt.attendees || []).some(a =>
        a.emailAddress?.address?.toLowerCase() === email.toLowerCase()
      )
    )
  } catch {
    return []
  }
}

// ─── Contacts ──────────────────────────────────────────────────────────────────

export async function getOutlookContacts() {
  let all = []
  let path = '/me/contacts?$top=100&$select=id,displayName,givenName,surname,emailAddresses,businessPhones,mobilePhone,jobTitle,companyName,personalNotes,categories'
  while (path) {
    const data = await graphGet(path)
    all = [...all, ...(data?.value || [])]
    path = data?.['@odata.nextLink']
      ? data['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '')
      : null
  }
  return all
}

// ─── People / Org Graph ────────────────────────────────────────────────────────

export async function getRelevantPeople(query) {
  try {
    let path = '/me/people?$top=100'
    if (query) path += `&$search="${encodeURIComponent(query)}"`
    const data = await graphGet(path)
    return data?.value || []
  } catch {
    return []
  }
}

export async function getLinkedInMap() {
  const map = new Map()
  try {
    let path = '/me/people?$top=100'
    while (path) {
      const data = await graphGet(path)
      for (const person of data?.value || []) {
        const linkedInUrl = (person.websites || [])
          .map(w => w.address || '')
          .find(url => url.toLowerCase().includes('linkedin.com'))
        if (linkedInUrl) {
          for (const e of person.scoredEmailAddresses || []) {
            if (e.address) map.set(e.address.toLowerCase(), linkedInUrl)
          }
        }
      }
      path = data?.['@odata.nextLink']
        ? data['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '')
        : null
    }
  } catch { /* best-effort */ }
  return map
}

export async function getUserPresence(userId) {
  try {
    const data = await graphGet(`/users/${userId}/presence`)
    return data
  } catch {
    return null
  }
}

// ─── Files / OneDrive / SharePoint ─────────────────────────────────────────────

export async function getRecentFiles(count = 25) {
  try {
    const data = await graphGet(
      `/me/drive/recent?$top=${count}&$select=id,name,webUrl,lastModifiedDateTime,lastModifiedBy,size,file,folder,parentReference`
    )
    return data?.value || []
  } catch {
    return []
  }
}

export async function searchFiles(query, count = 25) {
  if (!query) return []
  try {
    const data = await graphGet(
      `/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=${count}&$select=id,name,webUrl,lastModifiedDateTime,size,file,parentReference`
    )
    return data?.value || []
  } catch {
    return []
  }
}

export async function getSharedFiles(count = 25) {
  try {
    const data = await graphGet(
      `/me/drive/sharedWithMe?$top=${count}&$select=id,name,webUrl,lastModifiedDateTime,size,file,remoteItem`
    )
    return data?.value || []
  } catch {
    return []
  }
}

export async function getSharePointSites() {
  try {
    const data = await graphGet('/sites?search=*&$top=25&$select=id,displayName,webUrl,description')
    return data?.value || []
  } catch {
    return []
  }
}

// ─── Teams / Chat ──────────────────────────────────────────────────────────────
// Note: Teams data is more sensitive and requires careful scoping.
// These functions are modular and fail gracefully.

export async function getJoinedTeams() {
  try {
    const data = await graphGet('/me/joinedTeams?$select=id,displayName,description')
    return data?.value || []
  } catch {
    return []
  }
}

export async function getRecentChats(count = 25) {
  try {
    const data = await graphGet(
      `/me/chats?$top=${count}&$orderby=lastUpdatedDateTime desc&$select=id,topic,chatType,lastUpdatedDateTime`
    )
    return data?.value || []
  } catch {
    return []
  }
}

export async function getChatMessages(chatId, count = 20) {
  try {
    const data = await graphGet(
      `/me/chats/${chatId}/messages?$top=${count}&$orderby=createdDateTime desc&$select=id,body,from,createdDateTime`
    )
    return data?.value || []
  } catch {
    return []
  }
}

// ─── Online Meetings ───────────────────────────────────────────────────────────

export async function getOnlineMeetings(count = 25) {
  try {
    const data = await graphGet(
      `/me/onlineMeetings?$top=${count}&$orderby=startDateTime desc&$select=id,subject,startDateTime,endDateTime,joinWebUrl,participants`
    )
    return data?.value || []
  } catch {
    return []
  }
}

// ─── Sync utility ──────────────────────────────────────────────────────────────

/**
 * Check which Graph capabilities are available by attempting a silent token
 * acquisition for each scope group independently.
 *
 * Azure AD's access token `scp` claim only includes the scopes that were
 * explicitly requested — not all previously-consented scopes. So we must
 * probe each group separately to get an accurate picture of what's granted.
 */
export async function checkCapabilities() {
  const none = { mail: false, calendar: false, contacts: false, files: false, people: false, teams: false, presence: false, meetings: false }
  try {
    await ensureInit()
    const accounts = msalInstance.getAllAccounts()
    if (!accounts.length) return none

    const account = accounts[0]

    // Try acquiring a token for a given scope set silently.
    // Returns true if granted, false if not yet consented or admin consent required.
    async function hasScope(scopes) {
      try {
        await msalInstance.acquireTokenSilent({ scopes, account })
        return true
      } catch {
        return false
      }
    }

    const [mail, calendar, contacts, files, people, teams, presence, meetings] = await Promise.all([
      hasScope(['Mail.Read']),
      hasScope(['Calendars.Read']),
      hasScope(['Contacts.Read']),
      hasScope(['Files.Read']),
      hasScope(['People.Read']),
      hasScope(['Team.ReadBasic.All']),  // delegated; may need admin consent on tenant
      hasScope(['Presence.Read']),
      hasScope(['OnlineMeetings.Read']),
    ])

    return { mail, calendar, contacts, files, people, teams, presence, meetings }
  } catch {
    return none
  }
}

/**
 * Fetch recent messages from the Sent Items folder.
 * Used by the deal activity scoring pipeline to detect outbound deal emails.
 * @param {number} count    - max messages to return
 * @param {number} daysBack - how far back to look (default 2 days)
 */
export async function getSentMessages(count = 50, daysBack = 2) {
  try {
    const since = new Date(Date.now() - daysBack * 86_400_000).toISOString()
    const data = await graphGet(
      `/me/mailFolders/SentItems/messages?$top=${count}&$orderby=sentDateTime desc&$select=id,subject,conversationId,from,toRecipients,ccRecipients,sentDateTime,bodyPreview,hasAttachments`
    )
    // Filter client-side to messages after `since` (Graph $filter + $orderby together can conflict with some tenants)
    return (data?.value || []).filter(m => (m.sentDateTime || '') >= since)
  } catch {
    return []
  }
}

/**
 * Fetch attachments for a message including sourceUrl for SharePoint reference attachments.
 * referenceAttachments have sourceUrl pointing to OneDrive/SharePoint paths like
 * "/sites/Deals/Shared Documents/105 N 13th/OM/Summary.pdf" which we use for deal scoring.
 * @param {string} messageId
 */
export async function getMessageAttachmentsWithSource(messageId) {
  try {
    const data = await graphGet(
      `/me/messages/${messageId}/attachments?$select=id,name,@odata.type,size,sourceUrl,contentType`
    )
    return (data?.value || [])
      .filter(att => att['@odata.type'] !== '#microsoft.graph.itemAttachment')
      .map(att => ({
        id: att.id,
        name: att.name,
        size: att.size,
        contentType: att.contentType,
        sourceUrl: att.sourceUrl || null, // only present on referenceAttachment
        isReference: att['@odata.type'] === '#microsoft.graph.referenceAttachment',
      }))
  } catch {
    return []
  }
}

// ─── Graph Subscriptions (Webhooks) ─────────────────────────────────────────

const SUBSCRIPTION_LIFETIME_MS = 2 * 24 * 60 * 60 * 1000 // 2 days (max for mail is ~3 days)

/**
 * Create a Graph change notification subscription.
 * @param {string} resource - e.g. '/me/messages', '/me/events'
 * @param {string} changeType - 'created', 'updated', 'deleted' (comma-separated for multiple)
 */
export async function createGraphSubscription(resource, changeType = 'created,updated') {
  const notificationUrl = `${window.location.origin}/api/graph-webhook`
  const clientState = import.meta.env.VITE_GRAPH_WEBHOOK_SECRET || 'vanadium-crm'
  return graphPost('/subscriptions', {
    changeType,
    notificationUrl,
    resource,
    expirationDateTime: new Date(Date.now() + SUBSCRIPTION_LIFETIME_MS).toISOString(),
    clientState,
  })
}

/**
 * Renew a subscription before it expires.
 */
export async function renewGraphSubscription(subscriptionId) {
  return graphPatch(`/subscriptions/${subscriptionId}`, {
    expirationDateTime: new Date(Date.now() + SUBSCRIPTION_LIFETIME_MS).toISOString(),
  })
}

/**
 * Delete a subscription.
 */
export async function deleteGraphSubscription(subscriptionId) {
  return graphDelete(`/subscriptions/${subscriptionId}`)
}

/**
 * List all active subscriptions.
 */
export async function listGraphSubscriptions() {
  try {
    const data = await graphGet('/subscriptions')
    return data?.value || []
  } catch {
    return []
  }
}
