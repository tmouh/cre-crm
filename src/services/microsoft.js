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
      `/me/messages?$search=${search}&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,isDraft,webLink,hasAttachments,isRead,importance,conversationId&$top=50`
    )
    return (data?.value || []).filter(m => !m.isDraft)
  } catch {
    return []
  }
}

/**
 * Search inbox + sent items for emails containing a keyword (property address, deal name, etc.)
 * Uses Microsoft Graph KQL search. Returns up to 50 results, deduped by id.
 */
export async function searchEmailsByKeyword(keyword, daysBack = 180) {
  if (!keyword?.trim()) return []
  const since = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10)
  const q = encodeURIComponent(`"${keyword.trim()}" received>=${since}`)
  try {
    const data = await graphGet(
      `/me/messages?$search=${q}&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,isDraft,webLink,hasAttachments,isRead,importance,conversationId&$top=50`
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
  let path = '/me/contacts?$top=100&$select=id,displayName,givenName,surname,middleName,generation,nickName,emailAddresses,businessPhones,mobilePhone,homePhones,jobTitle,companyName,personalNotes,categories,birthday,businessHomePage,businessAddress,homeAddress,otherAddress'
  while (path) {
    const data = await graphGet(path)
    all = [...all, ...(data?.value || [])]
    path = data?.['@odata.nextLink']
      ? data['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '')
      : null
  }
  return all
}

// ─── Contacts — Write ──────────────────────────────────────────────────────────

// Maps CRM contact fields → Outlook PATCH/POST body.
// Only includes fields that are explicitly defined (not undefined) so a partial
// CRM update never blanks out Outlook fields that weren't touched.
function crmToOutlookBody(contact, companyName) {
  const body = {}
  if (contact.firstName !== undefined || contact.lastName !== undefined) {
    body.givenName = contact.firstName || ''
    body.surname   = contact.lastName  || ''
  }
  if (contact.middleName !== undefined) body.middleName     = contact.middleName || ''
  if (contact.suffix     !== undefined) body.generation      = contact.suffix     || ''
  if (contact.nickname   !== undefined) body.nickName        = contact.nickname   || ''
  if (contact.title      !== undefined) body.jobTitle        = contact.title      || ''
  if (contact.notes      !== undefined) body.personalNotes   = contact.notes      || ''
  if (contact.email !== undefined || contact.email2 !== undefined || contact.email3 !== undefined) {
    const displayName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
    body.emailAddresses = [contact.email, contact.email2, contact.email3]
      .filter(Boolean)
      .map(addr => ({ address: addr, name: displayName }))
  }
  if (contact.phone !== undefined || contact.businessPhone2 !== undefined) {
    body.businessPhones = [contact.phone, contact.businessPhone2].filter(Boolean)
  }
  if (contact.mobile !== undefined) body.mobilePhone = contact.mobile || ''
  if (contact.homePhone !== undefined || contact.homePhone2 !== undefined) {
    body.homePhones = [contact.homePhone, contact.homePhone2].filter(Boolean)
  }
  if (companyName       !== undefined) body.companyName      = companyName    || ''
  if (contact.tags      !== undefined) body.categories       = contact.tags   || []
  if (contact.birthday  !== undefined) body.birthday         = contact.birthday || null
  if (contact.webPage   !== undefined) body.businessHomePage = contact.webPage  || ''
  if (contact.businessStreet !== undefined) {
    body.businessAddress = {
      street: contact.businessStreet || '', city: contact.businessCity || '',
      state: contact.businessState || '', postalCode: contact.businessPostalCode || '',
      countryOrRegion: contact.businessCountry || '',
    }
  }
  if (contact.homeStreet !== undefined) {
    body.homeAddress = {
      street: contact.homeStreet || '', city: contact.homeCity || '',
      state: contact.homeState || '', postalCode: contact.homePostalCode || '',
      countryOrRegion: contact.homeCountry || '',
    }
  }
  if (contact.otherStreet !== undefined) {
    body.otherAddress = {
      street: contact.otherStreet || '', city: contact.otherCity || '',
      state: contact.otherState || '', postalCode: contact.otherPostalCode || '',
      countryOrRegion: contact.otherCountry || '',
    }
  }
  return body
}

export async function updateOutlookContact(outlookId, contact, companyName) {
  const body = crmToOutlookBody(contact, companyName)
  if (!Object.keys(body).length) return
  return graphPatch(`/me/contacts/${outlookId}`, body)
}

export async function createOutlookContact(contact, companyName) {
  const body = crmToOutlookBody(contact, companyName)
  if (!body.givenName && !body.surname)
    body.givenName = contact.firstName || contact.email || 'Unknown'
  return graphPost('/me/contacts', body)
}

export async function deleteOutlookContact(outlookId) {
  return graphDelete(`/me/contacts/${outlookId}`)
}

export async function getOutlookContact(outlookId) {
  return graphGet(`/me/contacts/${outlookId}?$select=id,givenName,surname,middleName,generation,nickName,emailAddresses,businessPhones,mobilePhone,homePhones,jobTitle,personalNotes,categories,birthday,businessHomePage,businessAddress,homeAddress,otherAddress`)
}

/**
 * Fetch Outlook contacts modified after a given ISO timestamp.
 * Used to poll for Outlook-side changes and push them into the CRM.
 */
export async function getModifiedOutlookContacts(since) {
  // Graph requires the datetime in ISO format without quotes in the $filter value
  const data = await graphGet(
    `/me/contacts?$select=id,givenName,surname,middleName,generation,nickName,emailAddresses,businessPhones,mobilePhone,homePhones,jobTitle,personalNotes,categories,birthday,businessHomePage,businessAddress,homeAddress,otherAddress` +
    `&$filter=lastModifiedDateTime gt ${encodeURIComponent(since)}&$top=100`,
  )
  return data?.value || []
}

// ─── SharePoint file search ────────────────────────────────────────────────────

/**
 * Search the user's OneDrive/SharePoint for files whose name closely matches
 * the given filename. Returns the Graph DriveItem objects (with parentReference).
 * Strips extension and common version markers before searching so "123 Main OM v3.pdf"
 * finds "123 Main OM.pdf" stored in SharePoint.
 */
export async function searchDriveForFile(filename) {
  const baseName = filename
    .replace(/\.[^.]+$/, '')                              // strip extension
    .replace(/\s*(v\d+|final|draft|rev\s*\d*)\s*$/i, '') // strip version markers
    .trim()
  if (baseName.length < 3) return []
  const data = await graphGet(
    `/me/drive/search(q='${encodeURIComponent(baseName)}')` +
    `?$select=id,name,parentReference&$top=10`,
  )
  return data?.value || []
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
      hasScope(['Contacts.ReadWrite']),
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
 * Note: ccRecipients is fetched but the scoring engine only uses toRecipients.
 * @param {number} count    - max messages to return
 * @param {number} daysBack - how far back to look (default 2 days)
 */
export async function getSentMessages(count = 50, daysBack = 2) {
  try {
    const since = new Date(Date.now() - daysBack * 86_400_000).toISOString()
    const data = await graphGet(
      `/me/mailFolders/SentItems/messages?$top=${count}&$orderby=sentDateTime desc&$select=id,subject,conversationId,from,toRecipients,sentDateTime,bodyPreview,hasAttachments`
    )
    return (data?.value || []).filter(m => (m.sentDateTime || '') >= since)
  } catch {
    return []
  }
}

/**
 * Fetch recent messages from the Inbox folder.
 * Used by the deal activity scoring pipeline to detect inbound deal emails
 * from clients and prospects (where the client is the sender).
 * @param {number} count    - max messages to return
 * @param {number} daysBack - how far back to look (default 2 days)
 */
export async function getInboxMessages(count = 50, daysBack = 2) {
  try {
    const since = new Date(Date.now() - daysBack * 86_400_000).toISOString()
    const data = await graphGet(
      `/me/mailFolders/Inbox/messages?$top=${count}&$orderby=receivedDateTime desc&$select=id,subject,conversationId,from,toRecipients,receivedDateTime,bodyPreview,hasAttachments,isDraft`
    )
    return (data?.value || []).filter(m => !m.isDraft && (m.receivedDateTime || '') >= since)
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
      `/me/messages/${messageId}/attachments?$select=id,name,@odata.type,size,contentType`
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
