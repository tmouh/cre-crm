import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { msalInstance } from './lib/msalConfig'

async function bootstrap() {
  // Initialize MSAL before React renders.
  // This is critical for popup auth — when Microsoft redirects back to the app
  // inside the popup window, MSAL must handle the auth code and close the popup
  // before React takes over. Without this, the popup just loads the full app.
  await msalInstance.initialize()
  await msalInstance.handleRedirectPromise()

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

bootstrap()
