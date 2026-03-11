import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { msalInstance } from './lib/msalConfig'

async function bootstrap() {
  await msalInstance.initialize()
  await msalInstance.handleRedirectPromise()

  // If we're inside an MSAL popup, the auth response has been handled above.
  // Close the popup instead of rendering the full app.
  if (window.opener && window.opener !== window) {
    window.close()
    return
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

bootstrap()
