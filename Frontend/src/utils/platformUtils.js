/**
 * Platform detection for bitezsnap.
 *
 * RevenueCat / Google Play Billing only runs inside the Cordova Android shell.
 * We deliberately do NOT rely on `window.cordova` because cordova.js defines it
 * asynchronously â€” by the time our React code runs it may or may not exist.
 *
 * Instead we detect the *origin*: the bundled app shell is served from
 * `https://localhost` (modern cordova-android) or `file://` (older builds),
 * which the public web build / Vite dev server never use.
 */

const hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Set to "true" only by the Cordova build (`vite build --mode cordova`), so the
 * packaged bundle is unambiguously identified regardless of origin or UA. The
 * origin/UA sniffing below is kept as a fallback for older bundles.
 */
const buildTargetIsCordova = import.meta.env.VITE_BUILD_TARGET === 'cordova';

function isLocalAppShellOrigin() {
  if (!hasDOM) return false;
  const { protocol, hostname } = window.location;
  // Cordova WebView shells:
  //   newer cordova-android â†’ https://localhost
  //   older cordova-android â†’ file://
  if (protocol === 'file:') return true;
  if (protocol === 'https:' && hostname === 'localhost') return true;
  return false;
}

// A desktop browser pointed at https://localhost (e.g. a local web dev server on
// :443) should still count as "web". Cordova WebViews report a mobile UA.
const notDesktopUA = (() => {
  if (!hasDOM) return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod/i.test(ua);
})();

// True only inside the packaged mobile app shell.
export const isCordova = buildTargetIsCordova || Boolean(isLocalAppShellOrigin() && notDesktopUA);

// True for the public web build and the Vite dev server.
export const isWeb = !isCordova;

/**
 * Run `callback` once the native bridge is ready.
 * - In the app: fires on the Cordova `deviceready` event (when window.Purchases exists).
 * - On the web: runs immediately on a microtask.
 *
 * @param {() => void} callback
 */
export function onCordovaReady(callback) {
  if (typeof callback !== 'function') return;

  if (isCordova && hasDOM) {
    // If deviceready already fired, the listener still runs because Cordova
    // re-dispatches it to late subscribers via the bootstrap queue.
    document.addEventListener('deviceready', callback, false);
  } else if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
  } else {
    Promise.resolve().then(callback);
  }
}

/**
 * Build an href for an in-app route that works under both routers.
 *
 * main.jsx swaps BrowserRouter for HashRouter in the Cordova build, so a plain
 * `/privacy-policy` href resolves to https://localhost/privacy-policy inside the
 * WebView and hits a blank page. Prefixing with `#` keeps it client-side there
 * while staying a clean path on the web.
 *
 * Use this only for plain <a> elements — inside components that are always
 * mounted under a Router, prefer react-router's <Link>.
 *
 * @param {string} path route path beginning with "/"
 * @returns {string}
 */
export function routeHref(path) {
  return isCordova ? `#${path}` : path;
}
