import { PublicClientApplication } from '@azure/msal-browser'

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}

// ─── Permission families ──────────────────────────────────────────────────────
// Base: identity + offline refresh
export const BASE_SCOPES = ['User.Read', 'offline_access', 'openid', 'profile', 'email']

// Mail + Calendar + Contacts
export const MAIL_SCOPES = ['Mail.Read']
export const CALENDAR_SCOPES = ['Calendars.Read']
export const CONTACTS_SCOPES = ['Contacts.Read']

// Files + SharePoint
export const FILES_SCOPES = ['Files.Read', 'Sites.Read.All']

// People / directory
export const PEOPLE_SCOPES = ['People.Read', 'User.ReadBasic.All']

// Teams / chat
export const TEAMS_SCOPES = ['Team.ReadBasic.All', 'Chat.Read', 'Channel.ReadBasic.All']

// Presence
export const PRESENCE_SCOPES = ['Presence.Read']

// Online meetings
export const MEETINGS_SCOPES = ['OnlineMeetings.Read.All']

// All scopes combined for full integration
export const ALL_GRAPH_SCOPES = [
  ...BASE_SCOPES,
  ...MAIL_SCOPES,
  ...CALENDAR_SCOPES,
  ...CONTACTS_SCOPES,
  ...FILES_SCOPES,
  ...PEOPLE_SCOPES,
  ...TEAMS_SCOPES,
  ...PRESENCE_SCOPES,
  ...MEETINGS_SCOPES,
]

// Default scopes for initial sign-in (core features)
export const DEFAULT_GRAPH_SCOPES = [
  ...BASE_SCOPES,
  ...MAIL_SCOPES,
  ...CALENDAR_SCOPES,
  ...CONTACTS_SCOPES,
  ...PEOPLE_SCOPES,
]

// Scope request object for MSAL
export const graphScopes = {
  scopes: DEFAULT_GRAPH_SCOPES,
}

// Extended scope request for full integration
export const graphScopesFull = {
  scopes: ALL_GRAPH_SCOPES,
}

export const msalInstance = new PublicClientApplication(msalConfig)
