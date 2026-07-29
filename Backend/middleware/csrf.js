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

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers.authorization?.toLowerCase().startsWith('bearer ')) return next();
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

module.exports = { CSRF_COOKIE, csrfCookieOptions, csrfProtection, issueCsrfToken };
