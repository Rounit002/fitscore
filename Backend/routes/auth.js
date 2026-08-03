const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const {
  authSlowDown,
  loginLimiter,
  passwordResetLimiter,
  signupLimiter,
} = require('../middleware/rateLimiter');
const { validateProfileUpdate, validateDetailsUpdate } = require('../middleware/profileValidator');
const { validateRequest } = require('../middleware/validateRequest');
const { auth: authSchemas, emptyBody } = require('../validation/schemas');
const { MINIMUM_AGE, isOldEnough } = require('../utils/ageCheck');
const { buildQuotaFields } = require('../utils/scanQuota');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { securityLog } = require('../utils/securityLogger');
const {
  issueSession,
  revokeRefreshToken,
  revokeUserSessions,
  rotateRefreshToken,
} = require('../utils/tokens');
const {
  createAuthCookieOptions,
  createClearAuthCookieOptions,
  createRefreshCookieOptions,
  createClearRefreshCookieOptions,
} = require('../config/cookies');
const { issueCsrfToken, isMobileClient } = require('../middleware/csrf');

const router = express.Router();
const SEVERITY_LEVELS = ['Low', 'Medium', 'High'];
const BCRYPT_COST = Number(process.env.BCRYPT_COST || 12);
const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.9zFfTqQYjWmLr7JmVZQYQ6jVQqYg5uK';

/**
 * Emails are stored and compared lowercased. Without this, `User@x.com` and
 * `user@x.com` were two separate accounts, which is how duplicate registrations
 * were getting through the UNIQUE constraint.
 */
const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const findUserByEmail = (pool, email) =>
  pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizeEmail(email)]);

/**
 * Resolves a trusted Google identity from a request body.
 *
 * Preferred path: `credential` (a Google ID token) is verified against Google's
 * published keys and the identity is read from the signed payload.
 *
 * Fallback path: when GOOGLE_CLIENT_ID is not configured the raw
 * `{ email, name, googleId }` body is accepted. That is only safe for local
 * development, so it refuses to run when NODE_ENV is production.
 */
async function verifyGoogleIdentity(body = {}) {
  const credential = body.credential || body.idToken || body.id_token;
  const accessToken = body.accessToken || body.access_token;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // Preferred for the web implicit flow: verify the access token by calling
  // Google's userinfo endpoint. Only Google can answer for a valid token, so the
  // resulting email is trustworthy and the client cannot forge it.
  if (accessToken) {
    let profile;
    try {
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!infoRes.ok) throw new Error(`userinfo returned ${infoRes.status}`);
      profile = await infoRes.json();
    } catch (cause) {
      const err = new Error(`Google access token verification failed: ${cause.message}`);
      err.publicMessage = 'Google sign-in could not be verified. Please try again.';
      throw err;
    }

    if (!profile.email) {
      const err = new Error('Google profile carried no email');
      err.publicMessage = 'Google did not share an email address for this account.';
      throw err;
    }
    if (profile.email_verified === false || profile.email_verified === 'false') {
      const err = new Error('Google email is not verified');
      err.publicMessage = 'Your Google email address is not verified.';
      throw err;
    }

    return {
      email: normalizeEmail(profile.email),
      name: profile.name || profile.given_name || normalizeEmail(profile.email).split('@')[0],
      googleId: profile.sub,
    };
  }

  if (credential) {
    if (!clientId) {
      const err = new Error('GOOGLE_CLIENT_ID is not configured on the server');
      err.publicMessage = 'Google sign-in is not configured. Contact support.';
      throw err;
    }

    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    } catch (cause) {
      const err = new Error(`Invalid Google ID token: ${cause.message}`);
      err.publicMessage = 'Google sign-in could not be verified. Please try again.';
      throw err;
    }

    const payload = ticket.getPayload() || {};
    if (!payload.email) {
      const err = new Error('Google token carried no email claim');
      err.publicMessage = 'Google did not share an email address for this account.';
      throw err;
    }
    if (payload.email_verified === false) {
      const err = new Error('Google email is not verified');
      err.publicMessage = 'Your Google email address is not verified.';
      throw err;
    }

    return {
      email: normalizeEmail(payload.email),
      name: payload.name || payload.given_name || normalizeEmail(payload.email).split('@')[0],
      googleId: payload.sub,
    };
  }

  if (clientId || process.env.NODE_ENV === 'production') {
    const err = new Error('No Google credential supplied');
    err.publicMessage = 'Google sign-in failed. Please try again.';
    throw err;
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    const err = new Error('No Google credential or email supplied');
    err.publicMessage = 'Google sign-in failed. Please try again.';
    throw err;
  }

  console.warn('[Google Auth] Accepting unverified identity — development mode only.');
  return { email, name: body.name || email.split('@')[0], googleId: body.googleId };
}

const normalizeCondition = (condition) => {
  if (typeof condition === 'string') {
    return { name: condition, severity: 'Medium' };
  }

  const name = typeof condition?.name === 'string' ? condition.name.trim() : '';
  const severity = SEVERITY_LEVELS.includes(condition?.severity) ? condition.severity : 'Medium';
  return name ? { name, severity } : null;
};

const normalizeConditions = (conditions) => {
  if (!Array.isArray(conditions)) return [];
  const byName = new Map();
  conditions.forEach((condition) => {
    const normalized = normalizeCondition(condition);
    if (normalized) byName.set(normalized.name, normalized);
  });
  return Array.from(byName.values());
};

const normalizeGoals = (goals) => {
  if (!Array.isArray(goals)) return [];
  return Array.from(new Set(
    goals
      .filter((goal) => typeof goal === 'string')
      .map((goal) => goal.trim())
      .filter(Boolean)
  ));
};

const syncMedicalConditions = async (pool, userId, conditions) => {
  const normalizedConditions = normalizeConditions(conditions);

  await pool.query('DELETE FROM user_medical_conditions WHERE user_id = $1', [userId]);

  for (const condition of normalizedConditions) {
    await pool.query(
      `INSERT INTO user_medical_conditions (user_id, condition_name, severity, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, condition_name)
       DO UPDATE SET severity = EXCLUDED.severity, updated_at = CURRENT_TIMESTAMP`,
      [userId, condition.name, condition.severity]
    );
  }

  return normalizedConditions;
};

const getMedicalConditions = async (pool, userId) => {
  const conditionsRes = await pool.query(
    `SELECT condition_name AS name, severity
     FROM user_medical_conditions
     WHERE user_id = $1
     ORDER BY condition_name ASC`,
    [userId]
  );
  return conditionsRes.rows;
};

const syncHealthGoals = async (pool, userId, goals) => {
  const normalizedGoals = normalizeGoals(goals);

  await pool.query('DELETE FROM user_health_goals WHERE user_id = $1', [userId]);

  for (const goal of normalizedGoals) {
    await pool.query(
      `INSERT INTO user_health_goals (user_id, goal_name, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, goal_name)
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
      [userId, goal]
    );
  }

  return normalizedGoals;
};

const getHealthGoals = async (pool, userId) => {
  const goalsRes = await pool.query(
    `SELECT goal_name
     FROM user_health_goals
     WHERE user_id = $1
     ORDER BY goal_name ASC`,
    [userId]
  );
  return goalsRes.rows.map((row) => row.goal_name);
};

const hydrateUserMedicalProfile = async (pool, user) => {
  const conditions = await getMedicalConditions(pool, user.id);
  const goals = await getHealthGoals(pool, user.id);
  if (!conditions.length && !goals.length) return user;

  return {
    ...user,
    profile: {
      ...(user.profile || {}),
      ...(conditions.length ? { conditions } : {}),
      ...(goals.length ? { goals } : {}),
    },
  };
};

// Cookie config — centralised so it's consistent across all auth routes
// Access and refresh cookie options are generated when a session is issued.

// Shared middleware: reads the JWT from the HttpOnly cookie, or from an
// Authorization: Bearer header for the Cordova build (WebView blocks the
// third-party cookie).
const authenticate = require('../middleware/auth');

/**
 * Native (Cordova) clients cannot rely on the auth cookie, so they opt in to
 * receiving the raw token in the response body by sending `X-Client: mobile`.
 * Browsers never get the token in the body, so the web flow stays cookie-only.
 * `isMobileClient` lives in middleware/csrf.js, which uses the same signal to
 * skip the double-submit check the WebView cannot satisfy.
 */
const withMobileTokens = (req, payload, session) => isMobileClient(req)
  ? { ...payload, token: session.accessToken, refreshToken: session.refreshToken }
  : payload;

const setSessionCookies = (res, session) => {
  res.cookie('token', session.accessToken, createAuthCookieOptions());
  res.cookie('refresh_token', session.refreshToken, createRefreshCookieOptions());
};

const respondWithSession = async (req, res, user, payload = {}) => {
  const session = await issueSession(req.pool, user, req);
  const publicUser = { ...user };
  delete publicUser.token_version;
  setSessionCookies(res, session);
  issueCsrfToken(req, res);
  res.json(withMobileTokens(req, { user: publicUser, ...payload }, session));
};

const getRefreshToken = (req) => req.cookies?.refresh_token || req.body?.refreshToken || null;

const recordLoginFailure = async (pool, userId, attempts) => {
  if (!userId) return;
  const nextAttempts = Number(attempts || 0) + 1;
  const lockSeconds = nextAttempts >= 5 ? Math.min(30 * (2 ** (nextAttempts - 5)), 900) : 0;
  await pool.query(
    `UPDATE users
     SET failed_login_attempts = $1,
         last_failed_login_at = NOW(),
         locked_until = CASE WHEN $2 > 0 THEN NOW() + ($2 * INTERVAL '1 second') ELSE NULL END
     WHERE id = $3`,
    [nextAttempts, lockSeconds, userId],
  );
  return lockSeconds;
};

const clearLoginFailures = (pool, userId) => pool.query(
  'UPDATE users SET failed_login_attempts = 0, last_failed_login_at = NULL, locked_until = NULL WHERE id = $1',
  [userId],
);

// Helper to update streak and points
async function updateStreak(pool, userId) {
  const userRes = await pool.query('SELECT points, streak, last_login_at FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
  if (lastLogin) {
    lastLogin = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newPoints = user.points || 0;
  let newStreak = user.streak || 0;

  if (!lastLogin) {
    newStreak = 1;
    newPoints += 5;
  } else if (lastLogin.getTime() === today.getTime()) {
    return { points: newPoints, streak: newStreak };
  } else if (lastLogin.getTime() === yesterday.getTime()) {
    newStreak += 1;
    newPoints += 5;
  } else {
    newPoints = Math.max(0, newPoints - 5);
    newStreak = 1;
    newPoints += 5;
  }

  await pool.query(
    'UPDATE users SET points = $1, streak = $2, last_login_at = $3 WHERE id = $4',
    [newPoints, newStreak, now, userId]
  );

  return { points: newPoints, streak: newStreak };
}

// Register
router.post('/register', signupLimiter, authSlowDown, validateRequest({ body: authSchemas.register }), async (req, res) => {
  const { password, name, dateOfBirth } = req.body;
  const email = normalizeEmail(req.body.email);

  // Age gate. Only enforced when a date of birth is supplied, because onboarding
  // collects it after this call for the existing signup flow; PUT /details
  // applies the same rule so it cannot be bypassed by skipping it here.
  if (dateOfBirth && !isOldEnough(dateOfBirth)) {
    return res.status(400).json({
      error: `You must be at least ${MINIMUM_AGE} years old to use bitezsnap`,
      field: 'dateOfBirth',
    });
  }

  try {
    const userRes = await findUserByEmail(req.pool, email);
    if (userRes.rows.length > 0) {
      return res.status(409).json({
        error: 'An account with this email already exists. Try logging in instead.',
        field: 'email',
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    let insertRes;
    try {
      insertRes = await req.pool.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, profile, is_premium, subscription_expires_at, image_scans_used, subscription_plan, token_version',
        [email, passwordHash, name]
      );
    } catch (insertErr) {
      // 23505 = unique_violation. Two concurrent signups for the same address
      // both pass the SELECT above, so the constraint is the real guard.
      if (insertErr.code === '23505') {
        return res.status(409).json({
          error: 'An account with this email already exists. Try logging in instead.',
          field: 'email',
        });
      }
      throw insertErr;
    }
    const user = insertRes.rows[0];
    const { points, streak } = await updateStreak(req.pool, user.id);
    const hydratedUser = await hydrateUserMedicalProfile(req.pool, {
      ...user,
      isPremium: user.is_premium,
      subscriptionExpiresAt: user.subscription_expires_at,
      imageScansUsed: user.image_scans_used,
      subscriptionPlan: user.subscription_plan,
      points,
      streak,
      ...buildQuotaFields(user),
    });

    const sessionUser = { ...hydratedUser, token_version: user.token_version || 0 };
    // Set JWT as an HttpOnly cookie — never exposed to frontend JavaScript
    await respondWithSession(req, res, sessionUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', loginLimiter, authSlowDown, validateRequest({ body: authSchemas.login }), async (req, res) => {
  const { password } = req.body;
  const email = normalizeEmail(req.body.email);
  try {
    const userRes = await findUserByEmail(req.pool, email);
    if (userRes.rows.length === 0) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      securityLog('login_failed', req, { reason: 'invalid_credentials' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userRes.rows[0];
    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      const retryAfter = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 1000);
      res.set('Retry-After', String(retryAfter));
      securityLog('login_locked', req, { retryAfter });
      return res.status(423).json({ error: 'Account temporarily locked. Try again later.', retryAfter });
    }
    if (!user.password_hash) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      securityLog('login_failed', req, { reason: 'invalid_credentials' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const lockSeconds = await recordLoginFailure(req.pool, user.id, user.failed_login_attempts);
      securityLog('login_failed', req, { reason: 'invalid_credentials', lockSeconds });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Cancel any scheduled deletion — logging in means the user wants to keep the account
    let deletionCancelled = false;
    if (user.scheduled_deletion_at) {
      await req.pool.query('UPDATE users SET scheduled_deletion_at = NULL WHERE id = $1', [user.id]);
      securityLog('account_deletion_cancelled_on_login', req, {}, 'info');
      deletionCancelled = true;
    }

    const { points, streak } = await updateStreak(req.pool, user.id);
    const hydratedUser = await hydrateUserMedicalProfile(req.pool, {
      id: user.id, email: user.email, name: user.name, points, streak,
      profile: user.profile, isPremium: user.is_premium,
      subscriptionExpiresAt: user.subscription_expires_at, imageScansUsed: user.image_scans_used,
      subscriptionPlan: user.subscription_plan,
      ...buildQuotaFields(user),
    });

    await clearLoginFailures(req.pool, user.id);

    const sessionUser = { ...hydratedUser, token_version: user.token_version || 0 };
    // Set JWT as an HttpOnly cookie — never exposed to frontend JavaScript
    securityLog('login_succeeded', req, {}, 'info');
    await respondWithSession(req, res, sessionUser, { deletionCancelled });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google OAuth
//
// The client sends the Google ID token (`credential`) and the server verifies it
// against Google's public keys. The identity therefore comes from Google's signed
// claims, never from the request body — posting an arbitrary `email` cannot log
// anyone in.
router.post('/google', loginLimiter, authSlowDown, validateRequest({ body: authSchemas.google }), async (req, res) => {
  let email;
  let name;
  let googleId;

  try {
    const identity = await verifyGoogleIdentity(req.body);
    email = identity.email;
    name = identity.name;
    googleId = identity.googleId;
  } catch (verifyErr) {
    console.warn('[Google Auth] Identity verification failed:', verifyErr.message);
    return res.status(401).json({ error: verifyErr.publicMessage || 'Google sign-in failed' });
  }

  try {
    let userRes = await findUserByEmail(req.pool, email);
    let user;
    if (userRes.rows.length === 0) {
      const insertRes = await req.pool.query(
        'INSERT INTO users (email, name, google_id) VALUES ($1, $2, $3) RETURNING id, email, name, profile, is_premium, subscription_expires_at, image_scans_used, subscription_plan, token_version',
        [email, name, googleId]
      );
      user = insertRes.rows[0];
    } else {
      user = userRes.rows[0];
      // Link the Google identity to the pre-existing email/password account
      // rather than creating a second row for the same person.
      if (googleId && !user.google_id) {
        await req.pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
      }
      // Cancel any scheduled deletion — logging in means the user wants to keep the account
      var deletionCancelled = false;
      if (user.scheduled_deletion_at) {
        await req.pool.query('UPDATE users SET scheduled_deletion_at = NULL WHERE id = $1', [user.id]);
        securityLog('account_deletion_cancelled_on_google_login', req, {}, 'info');
        deletionCancelled = true;
      }
    }

    const { points, streak } = await updateStreak(req.pool, user.id);
    const hydratedUser = await hydrateUserMedicalProfile(req.pool, {
      id: user.id, email: user.email, name: user.name, points, streak,
      profile: user.profile, isPremium: user.is_premium,
      subscriptionExpiresAt: user.subscription_expires_at, imageScansUsed: user.image_scans_used,
      subscriptionPlan: user.subscription_plan,
      ...buildQuotaFields(user),
    });

    const sessionUser = { ...hydratedUser, token_version: user.token_version || 0 };
    // Set JWT as an HttpOnly cookie — never exposed to frontend JavaScript
    await respondWithSession(
      req,
      res,
      sessionUser,
      { deletionCancelled: typeof deletionCancelled !== 'undefined' ? deletionCancelled : false },
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Google login failed' });
  }
});

// ── Password reset ──

const RESET_TOKEN_TTL_MINUTES = 30;

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const resolveResetBaseUrl = () => {
  const configured = process.env.FRONTEND_URL || process.env.APP_URL;
  return (configured || 'http://localhost:5173').replace(/\/+$/, '');
};

// Request a reset link.
//
// Always answers 200 with the same message whether or not the address exists —
// otherwise this endpoint becomes a way to enumerate registered users.
router.post('/forgot-password', passwordResetLimiter, authSlowDown, validateRequest({ body: authSchemas.forgotPassword }), async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const genericResponse = {
    success: true,
    message: 'If an account exists for that email, a reset link is on its way.',
  };

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  try {
    const userRes = await findUserByEmail(req.pool, email);

    if (userRes.rows.length === 0) {
      securityLog('password_reset_requested', req, { accountFound: false }, 'info');
      return res.json(genericResponse);
    }

    const user = userRes.rows[0];

    // Google-only accounts have no password to reset.
    if (!user.password_hash && user.google_id) {
      securityLog('password_reset_requested', req, { accountType: 'google_only' }, 'info');
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await req.pool.query(
      'UPDATE users SET reset_token_hash = $1, reset_token_expires_at = $2 WHERE id = $3',
      [hashResetToken(rawToken), expiresAt, user.id]
    );

    const resetUrl = `${resolveResetBaseUrl()}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    try {
      await sendPasswordResetEmail({
        to: email,
        name: user.name,
        resetUrl,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      });
    } catch (mailErr) {
      // The token is already stored; surface the delivery failure so the user is
      // not left waiting for an email that will never arrive.
      console.error('[Password Reset] Failed to send email:', mailErr.message);
      return res.status(502).json({ error: 'Could not send the reset email. Please try again shortly.' });
    }

    res.json(genericResponse);
  } catch (error) {
    console.error('[Password Reset] Request failed:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete the reset using the emailed token.
router.post('/reset-password', passwordResetLimiter, authSlowDown, validateRequest({ body: authSchemas.resetPassword }), async (req, res) => {
  const { token, password } = req.body || {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'A reset token is required' });
  }
  try {
    const userRes = await req.pool.query(
      `SELECT id, email, reset_token_expires_at
       FROM users
       WHERE reset_token_hash = $1`,
      [hashResetToken(token)]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'This reset link is invalid or has already been used.' });
    }

    const user = userRes.rows[0];
    if (!user.reset_token_expires_at || new Date(user.reset_token_expires_at) < new Date()) {
      // Clear the stale token so a expired link cannot be retried.
      await req.pool.query(
        'UPDATE users SET reset_token_hash = NULL, reset_token_expires_at = NULL WHERE id = $1',
        [user.id]
      );
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await req.pool.query(
      `UPDATE users
       SET password_hash = $1,
           reset_token_hash = NULL,
           reset_token_expires_at = NULL,
           failed_login_attempts = 0,
           locked_until = NULL,
           token_version = token_version + 1
       WHERE id = $2`,
      [passwordHash, user.id]
    );
    await revokeUserSessions(req.pool, user.id);

    securityLog('password_reset_completed', req, {}, 'info');
    res.json({ success: true, message: 'Your password has been updated. You can now log in.' });
  } catch (error) {
    console.error('[Password Reset] Completion failed:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout — clears the HttpOnly auth cookie
router.get('/csrf', (req, res) => {
  const csrfToken = issueCsrfToken(req, res);
  res.json({ csrfToken });
});

router.post('/refresh', loginLimiter, validateRequest({ body: authSchemas.refresh }), async (req, res) => {
  const rawRefreshToken = getRefreshToken(req);
  if (!rawRefreshToken) return res.status(401).json({ error: 'Refresh token required' });

  try {
    const session = await rotateRefreshToken(req.pool, rawRefreshToken, req);
    setSessionCookies(res, session);
    issueCsrfToken(req, res);
    return res.json(withMobileTokens(req, { success: true }, session));
  } catch (error) {
    securityLog('refresh_failed', req, { reason: error.code || 'invalid' });
    res.clearCookie('token', createClearAuthCookieOptions());
    res.clearCookie('refresh_token', createClearRefreshCookieOptions());
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
});

router.post('/logout', validateRequest({ body: authSchemas.refresh }), async (req, res) => {
  try {
    await revokeRefreshToken(req.pool, getRefreshToken(req));
  } catch (_error) {
    securityLog('logout_revoke_failed', req, { reason: 'database_error' }, 'error');
  }
  res.clearCookie('token', createClearAuthCookieOptions());
  res.clearCookie('refresh_token', createClearRefreshCookieOptions());
  res.json({ success: true });
});

// Get current user (session restoration)
router.get('/me', authenticate, async (req, res) => {
  try {
    const userRes = await req.pool.query(
      'SELECT id, email, name, points, streak, profile, scheduled_deletion_at, is_premium, subscription_expires_at, image_scans_used, subscription_plan, scans_used, scan_limit, plan FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const row = userRes.rows[0];
    const user = await hydrateUserMedicalProfile(req.pool, row);
    // Include scheduled_deletion_at so frontend can show the countdown banner
    if (row.scheduled_deletion_at) {
      user.scheduledDeletionAt = row.scheduled_deletion_at;
    }
    user.isPremium = row.is_premium;
    user.subscriptionExpiresAt = row.subscription_expires_at;
    user.imageScansUsed = row.image_scans_used;
    user.subscriptionPlan = row.subscription_plan;
    // Scan quota. The shell header and sidebar read these to render "used/limit";
    // they were previously absent from this payload, which is why the counter was
    // permanently stuck on its 0/20 fallback.
    Object.assign(user, buildQuotaFields(row));
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update Profile
router.put('/profile', authenticate, validateProfileUpdate, async (req, res) => {
  const { profile } = req.validatedBody;
  try {
    const userRes = await req.pool.query(
      'SELECT profile FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentProfile = userRes.rows[0].profile || {};
    const nextProfile = { ...currentProfile, ...(profile || {}) };
    if (Object.prototype.hasOwnProperty.call(nextProfile, 'conditions')) {
      nextProfile.conditions = normalizeConditions(nextProfile.conditions);
    }
    if (Object.prototype.hasOwnProperty.call(nextProfile, 'goals')) {
      nextProfile.goals = normalizeGoals(nextProfile.goals);
    }

    await req.pool.query(
      'UPDATE users SET profile = $1 WHERE id = $2',
      [JSON.stringify(nextProfile), req.userId]
    );

    if (Object.prototype.hasOwnProperty.call(nextProfile, 'conditions')) {
      await syncMedicalConditions(req.pool, req.userId, nextProfile.conditions);
    }
    if (Object.prototype.hasOwnProperty.call(nextProfile, 'goals')) {
      await syncHealthGoals(req.pool, req.userId, nextProfile.goals);
    }

    const updatedRes = await req.pool.query(
      'SELECT id, email, name, points, streak, profile FROM users WHERE id = $1',
      [req.userId]
    );
    const updatedUser = await hydrateUserMedicalProfile(req.pool, updatedRes.rows[0]);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update personal details from profile page
router.put('/details', authenticate, validateDetailsUpdate, async (req, res) => {
  const { name, profile } = req.validatedBody;
  try {
    const userRes = await req.pool.query(
      'SELECT profile FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentProfile = userRes.rows[0].profile || {};
    const nextProfile = { ...currentProfile, ...(profile || {}) };
    if (Object.prototype.hasOwnProperty.call(profile || {}, 'conditions')) {
      nextProfile.conditions = normalizeConditions(profile.conditions);
    }
    if (Object.prototype.hasOwnProperty.call(profile || {}, 'goals')) {
      nextProfile.goals = normalizeGoals(profile.goals);
    }

    await req.pool.query(
      'UPDATE users SET name = COALESCE($1, name), profile = $2 WHERE id = $3',
      [name || null, JSON.stringify(nextProfile), req.userId]
    );

    if (Object.prototype.hasOwnProperty.call(profile || {}, 'conditions')) {
      await syncMedicalConditions(req.pool, req.userId, nextProfile.conditions);
    }
    if (Object.prototype.hasOwnProperty.call(profile || {}, 'goals')) {
      await syncHealthGoals(req.pool, req.userId, nextProfile.goals);
    }

    const updatedRes = await req.pool.query(
      'SELECT id, email, name, points, streak, profile FROM users WHERE id = $1',
      [req.userId]
    );

    const updatedUser = await hydrateUserMedicalProfile(req.pool, updatedRes.rows[0]);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update personal details' });
  }
});

// Save compressed profile picture directly in profile JSON
router.put('/profile-picture', authenticate, validateRequest({ body: authSchemas.profilePicture }), async (req, res) => {
  const { imageBase64 } = req.body;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    console.error('  ✗ Profile picture upload failed: imageBase64 is missing or invalid');
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  try {
    const userRes = await req.pool.query(
      'SELECT profile FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      console.error('  ✗ Profile picture upload failed: user not found');
      return res.status(404).json({ error: 'User not found' });
    }

    if (!imageBase64.startsWith('data:image/')) {
      console.error('  ✗ Profile picture save failed: payload is not an image data URL');
      return res.status(400).json({ error: 'Profile picture must be an image data URL' });
    }

    const currentProfile = userRes.rows[0].profile || {};
    const nextProfile = {
      ...currentProfile,
      profileImageUrl: imageBase64,
      avatarUrl: imageBase64,
      profileImageStorage: 'database-base64',
      profileImageUpdatedAt: new Date().toISOString(),
    };

    await req.pool.query(
      'UPDATE users SET profile = $1 WHERE id = $2',
      [JSON.stringify(nextProfile), req.userId]
    );
    const updatedRes = await req.pool.query(
      'SELECT id, email, name, points, streak, profile FROM users WHERE id = $1',
      [req.userId]
    );
    const updatedUser = await hydrateUserMedicalProfile(req.pool, updatedRes.rows[0]);
    res.json({ user: updatedUser, imageUrl: imageBase64 });
  } catch (error) {
    console.error('  ✗ Profile picture upload failed:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Get/Update Streak
router.get('/streak', authenticate, async (req, res) => {
  try {
    const { points, streak } = await updateStreak(req.pool, req.userId);
    res.json({ points, streak });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
});

// Get Leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const leaderboardRes = await req.pool.query(
      'SELECT name, points, streak FROM users ORDER BY points DESC, streak DESC LIMIT 50'
    );
    res.json(leaderboardRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Schedule Account Deletion — marks account for permanent removal after 7 days
router.delete('/account', authenticate, validateRequest({ body: emptyBody }), async (req, res) => {
  try {
    const userId = req.userId;

    const userRes = await req.pool.query('SELECT id, scheduled_deletion_at FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Schedule deletion 7 days from now
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 7);

    await req.pool.query(
      `UPDATE users
       SET scheduled_deletion_at = $1,
           token_version = token_version + 1
       WHERE id = $2`,
      [deletionDate, userId]
    );
    await revokeUserSessions(req.pool, userId);
    res.clearCookie('token', createClearAuthCookieOptions());
    res.clearCookie('refresh_token', createClearRefreshCookieOptions());

    securityLog('account_deletion_scheduled', req, {}, 'info');
    res.json({
      success: true,
      message: 'Account scheduled for deletion',
      scheduledDeletionAt: deletionDate.toISOString(),
    });
  } catch (error) {
    console.error('[Account Deletion Scheduling Error]', error);
    res.status(500).json({ error: 'Failed to schedule account deletion. Please try again.' });
  }
});

// Cancel Scheduled Deletion
router.post('/cancel-deletion', authenticate, validateRequest({ body: emptyBody }), async (req, res) => {
  try {
    const userId = req.userId;

    const userRes = await req.pool.query('SELECT scheduled_deletion_at FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userRes.rows[0].scheduled_deletion_at) {
      return res.json({ success: true, message: 'No deletion was scheduled' });
    }

    await req.pool.query('UPDATE users SET scheduled_deletion_at = NULL WHERE id = $1', [userId]);

    securityLog('account_deletion_cancelled', req, {}, 'info');
    res.json({ success: true, message: 'Account deletion cancelled' });
  } catch (error) {
    console.error('[Cancel Deletion Error]', error);
    res.status(500).json({ error: 'Failed to cancel deletion. Please try again.' });
  }
});

module.exports = router;
