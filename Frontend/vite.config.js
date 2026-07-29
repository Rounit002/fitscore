import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Cordova injects `cordova.js` into the platform's www/ at build time, but the
 * HTML must reference it or the native bridge (window.cordova, `deviceready`,
 * plugins) never loads. Only inject it for the cordova build so the web build
 * doesn't 404 on a file that isn't there.
 *
 * `viewport-fit=cover` is also added so the existing env(safe-area-inset-*) CSS
 * resolves to real values behind the Android status/navigation bars.
 */
function cordovaHtml() {
  return {
    name: 'nutriscan-cordova-html',
    transformIndexHtml(html) {
      return html
        .replace(
          '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
        )
        .replace('</head>', '  <script src="cordova.js"></script>\n</head>')
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isCordova = mode === 'cordova'

  return {
    plugins: [react(), tailwindcss(), ...(isCordova ? [cordovaHtml()] : [])],
    // Cordova serves the bundle from the app shell root; relative asset URLs
    // keep working regardless of the shell's scheme/host.
    base: isCordova ? './' : '/',
    server: {
      historyApiFallback: true,
    },
    preview: {
      historyApiFallback: true,
    },
  }
})
