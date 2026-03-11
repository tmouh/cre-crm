import { PublicClientApplication } from '@azure/msal-browser'

/**
 * Dedicated MSAL popup redirect handler — loaded only in the popup window.
 * Processes the auth code from Microsoft and posts the result back to the
 * parent window, then closes itself. Uses the bundled npm package (no CDN).
 */
;(async () => {
  try {
    const msal = new PublicClientApplication({
      auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin + '/redirect.html',
      },
      cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
    })
    await msal.initialize()
    await msal.handleRedirectPromise()
  } catch (err) {
    console.error('MSAL popup redirect error:', err)
  }
  window.close()
})()
