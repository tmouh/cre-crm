import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { msalInstance } from './lib/msalConfig'

async function bootstrap() {
  await msalInstance.initialize()

  // Detect if this page load is an OAuth popup redirect from Microsoft.
  // MSAL opens a popup → user signs in → Microsoft redirects the popup back
  // here with ?code=... or #code=... in the URL.
  // We must process the auth code and close the popup window before React renders.
  const url = window.location.href
  const isAuthRedirect = url.includes('code=') || url.includes('error=')
  const isPopup = window.opener !== null && window.opener !== window

  if (isPopup && isAuthRedirect) {
    try {
      await msalInstance.handleRedirectPromise()
    } catch {
      // MSAL already handles errors internally — swallow here
    }
    window.close()
    return // Do not render the React app in the popup
  }

  // Normal page load — render the app
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

bootstrap()
