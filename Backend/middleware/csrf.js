const crypto = require('crypto');
const { securityLog } = require('../utils/securityLogger');

const CSRF_COOKIE = 'fitscore_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const csrfCookieOptions = (nodeEnv = process.env.NODE_ENV) => ({
  httpOnly: false,
  secure: nodeEnv === 'production',
  sameSite: nodeEnv === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 12 * 60 * 60 * 1000,
});

const issueCsrfToken = (req, res) => {
  const existing = req.cookies?.[CSRF_COOKIE];
  const token = existing && /^[A-Za-z0-9_-]{40,100}$/.test(existing)
    ? existing
    : crypto.randomBytes(32).toString('base64url');
  res.cookie(CSRF_COOKIE, token, csrfCookieOptions());
  return token;
};

const timingSafeMatch = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * Native (Cordova) clients send this on every request. See routes/auth.js.
 */
const isMobileClient = (req) =>
  String(req.headers['x-client'] || '').toLowerCase() === 'mobile';

/**
 * A request that carries no session cookie cannot be a cookie-riding forgery,
 * so the double-submit check has nothing to protect.
 */
const hasSessionCookie = (req) =>
  Boolean(req.cookies?.token || req.cookies?.refresh_token);

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers.authorization?.toLowerCase().startsWith('bearer ')) return next();
  /*
   * Pre-auth native writes (register/login/refresh/forgot-password) have no
   * Bearer token yet, and the Android WebView drops the API's cross-site
   * `SameSite=None` CSRF cookie, so the double-submit pair can never match and
   * every mobile sign-in was rejected with 403.
   *
   * `X-Client` is a non-simple header: a browser can only send it after a
   * successful CORS preflight, which an attacker's origin fails. Requiring it
   * is therefore itself a CSRF defence. Still gated on the absence of a session
   * cookie, because a forged cross-site request always carries the victim's
   * cookies — so cookie-authenticated writes keep needing the token.
   */
  if (isMobileClient(req) && !hasSessionCookie(req)) return next();
  if (
    req.originalUrl.startsWith('/billing/notifications')
    || req.originalUrl.startsWith('/api/subscriptions/revenuecat/webhook')
  ) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];
  if (!timingSafeMatch(cookieToken, headerToken)) {
    securityLog('csrf_rejected', req);
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  return next();
};

module.exports = {
  CSRF_COOKIE, csrfCookieOptions, csrfProtection, issueCsrfToken, isMobileClient,
};
