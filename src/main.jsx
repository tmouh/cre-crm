import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { msalInstance } from './lib/msalConfig'

async function bootstrap() {
  // Initialize MSAL before React renders.
  // Popup auth redirects go to /redirect.html (not here), so no
  // handleRedirectPromise needed — that page handles it and closes itself.
  await msalInstance.initialize()

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

bootstrap()
