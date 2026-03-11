import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { msalInstance } from './lib/msalConfig'

async function bootstrap() {
  await msalInstance.initialize()
  await msalInstance.handleRedirectPromise()

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

bootstrap()
