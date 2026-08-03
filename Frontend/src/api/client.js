import { isCordova } from '../utils/platformUtils';

function resolveApiBase() {
  const mobileUrl = import.meta.env.VITE_MOBILE_API_URL;
  if (isCordova && mobileUrl) return mobileUrl.replace(/\/+$/, '');

  const webUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return webUrl.replace(/\/+$/, '');
}

export const API = resolveApiBase();

const ACCESS_TOKEN_KEY = 'fitscore_access_token';
const REFRESH_TOKEN_KEY = 'fitscore_refresh_token';
const LEGACY_TOKEN_KEY = 'nutriscan_token';
let accessToken = null;
let refreshToken = null;
let secureStorage = null;
let csrfToken = null;
let refreshInFlight = null;

const secureGet = (key) => new Promise((resolve) => {
  if (!secureStorage) return resolve(null);
  secureStorage.get(resolve, () => resolve(null), key);
});

const secureSet = (key, value) => new Promise((resolve) => {
  if (!secureStorage) return resolve();
  if (!value) {
    secureStorage.remove(resolve, resolve, key);
    return;
  }
  secureStorage.set(resolve, resolve, key, value);
});

const initializeSecureStorage = () => {
  if (!isCordova || typeof document === 'undefined') return Promise.resolve();

  return new Promise((resolve) => {
    const initialize = () => {
      const SecureStorage = window.cordova?.plugins?.SecureStorage;
      if (!SecureStorage) {
        // Fail closed: tokens remain memory-only and the user signs in again
        // after an app restart instead of falling back to extractable storage.
        console.warn('Secure storage is unavailable; session persistence is disabled.');
        resolve();
        return;
      }

      secureStorage = new SecureStorage(
        async () => {
          [accessToken, refreshToken] = await Promise.all([
            secureGet(ACCESS_TOKEN_KEY),
            secureGet(REFRESH_TOKEN_KEY),
          ]);
          try {
            localStorage.removeItem(LEGACY_TOKEN_KEY);
          } catch (_error) {
            // Storage may be disabled by the WebView policy.
          }
          resolve();
        },
        () => resolve(),
        'fitscore_auth',
      );
    };

    if (window.cordova?.plugins) initialize();
    else document.addEventListener('deviceready', initialize, { once: true });
  });
};

const storageReady = initializeSecureStorage();

export function setAuthToken(token, nextRefreshToken = null) {
  if (!isCordova) return;
  accessToken = token || null;
  if (nextRefreshToken !== null) refreshToken = nextRefreshToken || null;
  void storageReady.then(() => Promise.all([
    secureSet(ACCESS_TOKEN_KEY, accessToken),
    nextRefreshToken !== null ? secureSet(REFRESH_TOKEN_KEY, refreshToken) : Promise.resolve(),
  ]));
}

export function getAuthToken() {
  return isCordova ? accessToken : null;
}

export function getRefreshToken() {
  return isCordova ? refreshToken : null;
}

export function clearAuthToken() {
  accessToken = null;
  refreshToken = null;
  void storageReady.then(() => Promise.all([
    secureSet(ACCESS_TOKEN_KEY, null),
    secureSet(REFRESH_TOKEN_KEY, null),
  ]));
}

export function authHeaders() {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

const isUnsafeMethod = (method) => !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

const fetchCsrfToken = async (originalFetch) => {
  if (csrfToken || isCordova) return csrfToken;
  const response = await originalFetch(`${API}/auth/csrf`, { credentials: 'include' });
  if (!response.ok) throw new Error('Could not initialize request protection');
  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken;
};

const refreshSession = async (originalFetch) => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (isCordova) {
      headers.set('X-Client', 'mobile');
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    } else {
      headers.set('X-CSRF-Token', await fetchCsrfToken(originalFetch));
    }

    const response = await originalFetch(`${API}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(isCordova ? { refreshToken } : {}),
    });
    if (!response.ok) throw new Error('Session expired');
    const data = await response.json();
    if (isCordova) setAuthToken(data.token, data.refreshToken);
    return true;
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
};

export async function apiFetch(path, options = {}) {
  const { headers, ...rest } = options;
  return fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    ...rest,
  });
}

/**
 * Central security wrapper for calls to the bitezsnap API. It loads Android
 * Keystore-backed credentials before the first mobile request, adds CSRF
 * protection to cookie-authenticated browser writes, and rotates an expired
 * access token once before replaying the original request.
 */
export function installMobileFetchAuth() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  if (window.__nutriscanFetchPatched) return;

  const originalFetch = window.fetch.bind(window);
  const noRefreshPaths = [
    '/auth/login', '/auth/register', '/auth/google', '/auth/refresh',
    '/auth/forgot-password', '/auth/reset-password', '/auth/logout',
  ];

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.startsWith(API)) return originalFetch(input, init);
    if (isCordova) await storageReady;

    const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    if (isCordova) {
      if (accessToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${accessToken}`);
      headers.set('X-Client', 'mobile');
    } else if (isUnsafeMethod(method) && !url.endsWith('/auth/csrf')) {
      headers.set('X-CSRF-Token', await fetchCsrfToken(originalFetch));
    }

    const request = new Request(input, { ...init, method, headers, credentials: 'include' });
    let response = await originalFetch(request.clone());
    const pathname = new URL(url, API).pathname;

    if (response.status === 401 && !noRefreshPaths.some((path) => pathname.startsWith(path))) {
      try {
        await refreshSession(originalFetch);
        const retryHeaders = new Headers(request.headers);
        if (isCordova && accessToken) retryHeaders.set('Authorization', `Bearer ${accessToken}`);
        response = await originalFetch(new Request(request, { headers: retryHeaders }));
      } catch (_error) {
        clearAuthToken();
      }
    }

    return response;
  };

  window.__nutriscanFetchPatched = true;
}
