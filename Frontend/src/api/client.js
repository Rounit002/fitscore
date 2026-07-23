export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Thin fetch wrapper for all NutriScore backend requests.
 * Automatically sets credentials: 'include' (HttpOnly cookie) and
 * Content-Type: application/json unless overridden.
 *
 * @param {string} path   - Path starting with '/', e.g. '/auth/login'
 * @param {RequestInit} options - Standard fetch options (method, body, headers, signalâ€¦)
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const { headers, ...rest } = options;
  return fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    ...rest,
  });
}
