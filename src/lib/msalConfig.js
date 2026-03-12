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

// Scopes needed: read Outlook contacts + read mail for email history
export const graphScopes = {
  scopes: ['Contacts.Read', 'Mail.Read', 'People.Read', 'User.Read'],
}

export const msalInstance = new PublicClientApplication(msalConfig)
