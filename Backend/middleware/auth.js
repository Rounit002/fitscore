const { verifyAccessToken } = require('../utils/tokens');
const { securityLog } = require('../utils/securityLogger');

/**
 * Extract the JWT from the request.
 *
 * Web clients send it in the HttpOnly `token` cookie. The Cordova/Android build
 * is served from https://localhost, so the API is a third-party origin and the
 * cookie is blocked by the WebView; those clients replay the token as
 * `Authorization: Bearer <jwt>` instead. The cookie is preferred when both are
 * present.
 */
const extractToken = (req) => {
  if (req.cookies?.token) return { token: req.cookies.token, method: 'cookie' };

  const header = req.headers?.authorization;
  if (typeof header === 'string') {
    const [scheme, value] = header.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && value) {
      return { token: value.trim(), method: 'bearer' };
    }
  }

  return null;
};

const authenticate = (req, res, next) => {
  const extracted = extractToken(req);
  if (!extracted) {
    securityLog('authentication_missing', req);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = verifyAccessToken(extracted.token);
    if (decoded.type && decoded.type !== 'access') throw new Error('Unexpected token type');
    req.userId = decoded.userId;
    req.authMethod = extracted.method;

    // Legacy tokens did not carry a version. Accept them until their original
    // expiry, while all newly-issued tokens are checked against the database so
    // password resets can revoke every active session immediately.
    if (decoded.tokenVersion === undefined || !req.pool) return next();

    return req.pool.query('SELECT token_version FROM users WHERE id = $1', [req.userId])
      .then((result) => {
        const user = result.rows[0];
        if (!user || Number(user.token_version || 0) !== Number(decoded.tokenVersion)) {
          securityLog('authentication_revoked', req);
          return res.status(401).json({ error: 'Session has been revoked' });
        }
        return next();
      })
      .catch((error) => next(error));
  } catch (error) {
    securityLog('authentication_invalid', req, { reason: error.name || 'verification_failed' });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticate;
module.exports.extractToken = extractToken;
