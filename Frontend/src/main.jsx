import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './tailwind.css'
import './i18n/index.js'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { isCordova, onCordovaReady } from './utils/platformUtils.js'
import { installMobileFetchAuth } from './api/client.js'
import { requestAndroidCameraPermission } from './utils/nativePermissions.js'

// Google OAuth client id, baked in at build time. When unset the sign-in button
// hides itself rather than rendering a broken control (see Login/SignUp).
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// The packaged app is served from https://localhost with no server-side routing,
// so history-based deep paths (/dashboard) 404 on reload. HashRouter keeps all
// routing client-side. The web build keeps clean BrowserRouter URLs.
const Router = isCordova ? HashRouter : BrowserRouter

// Attach the Bearer token to API calls before any component can fire a request.
installMobileFetchAuth()

// Ask for CAMERA at startup so the scanner's getUserMedia call doesn't fail on
// the first tap. Resolves immediately (no-op) on the web.
onCordovaReady(() => {
  requestAndroidCameraPermission()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </Router>
    </GoogleOAuthProvider>
  </StrictMode>,
)
