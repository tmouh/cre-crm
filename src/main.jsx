import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { msalInstance } from './lib/msalConfig'

async function bootstrap() {
  // If we're inside an MSAL popup, do nothing — the parent window's
  // loginPopup() will read the auth code from our URL hash directly.
  // Running MSAL here would clear the hash before the parent can read it.
  if (window.opener && window.opener !== window) {
    return
  }

  await msalInstance.initialize()
  await msalInstance.handleRedirectPromise()

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

bootstrap()
